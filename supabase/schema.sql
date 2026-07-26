-- ============================================================
-- IPM-ERP: Cash Flow & Vendor Management System
-- Supabase PostgreSQL Schema — Multi-Tenant
-- ============================================================

-- ============================================================
-- PART 0: DROP OLD TABLES (reverse dependency order)
-- This ensures a clean slate if migrating from the old schema.
-- ============================================================
DROP TABLE IF EXISTS vendor_transactions CASCADE;
DROP TABLE IF EXISTS outbound_cheques CASCADE;
DROP TABLE IF EXISTS wholesale_vendors CASCADE;
DROP TABLE IF EXISTS daily_revenue CASCADE;
DROP TABLE IF EXISTS user_profiles CASCADE;
DROP TABLE IF EXISTS tenants CASCADE;
DROP FUNCTION IF EXISTS get_my_tenant_id();
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- ============================================================
-- PART 1: CREATE ALL TABLES
-- ============================================================

-- --------------------------------------------------------
-- 0a. Tenants
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS tenants (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE tenants IS 'Each tenant represents a distinct shop/business.';

-- --------------------------------------------------------
-- 0b. User Profiles (maps auth.users → tenant)
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS user_profiles (
  id         UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id  UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  full_name  TEXT,
  role       TEXT NOT NULL DEFAULT 'member',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE user_profiles IS 'Maps each Supabase auth user to a tenant. Created manually via dashboard.';

-- --------------------------------------------------------
-- Helper: reusable function to get current user's tenant_id
-- --------------------------------------------------------
CREATE OR REPLACE FUNCTION get_my_tenant_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT tenant_id FROM user_profiles WHERE id = auth.uid();
$$;

-- --------------------------------------------------------
-- 1. Daily Revenue
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS daily_revenue (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id  UUID NOT NULL DEFAULT get_my_tenant_id() REFERENCES tenants(id) ON DELETE CASCADE,
  date       DATE NOT NULL DEFAULT CURRENT_DATE,
  amount     NUMERIC(12, 2) NOT NULL CHECK (amount >= 0),
  notes      TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE daily_revenue IS 'Stores daily revenue entries for a tenant shop.';
CREATE INDEX IF NOT EXISTS idx_revenue_tenant ON daily_revenue(tenant_id);

-- --------------------------------------------------------
-- 2. Wholesale Vendors
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS wholesale_vendors (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    UUID NOT NULL DEFAULT get_my_tenant_id() REFERENCES tenants(id) ON DELETE CASCADE,
  name         TEXT NOT NULL,
  balance_owed NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (balance_owed >= 0),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, name)
);

COMMENT ON TABLE wholesale_vendors IS 'Wholesale vendors scoped to a tenant.';
CREATE INDEX IF NOT EXISTS idx_vendors_tenant ON wholesale_vendors(tenant_id);

-- --------------------------------------------------------
-- 3. Outbound Cheques
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS outbound_cheques (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID NOT NULL DEFAULT get_my_tenant_id() REFERENCES tenants(id) ON DELETE CASCADE,
  date          DATE NOT NULL DEFAULT CURRENT_DATE,
  payee_name    TEXT NOT NULL,
  vendor_id     UUID REFERENCES wholesale_vendors(id) ON DELETE SET NULL,
  amount        NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
  cheque_number TEXT NOT NULL,
  status        TEXT NOT NULL DEFAULT 'Pending'
                  CHECK (status IN ('Pending', 'Cleared', 'Bounced')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE outbound_cheques IS 'Outbound cheques scoped to a tenant.';
CREATE INDEX IF NOT EXISTS idx_cheques_tenant ON outbound_cheques(tenant_id);
CREATE INDEX IF NOT EXISTS idx_cheques_status ON outbound_cheques(status);
CREATE INDEX IF NOT EXISTS idx_cheques_vendor ON outbound_cheques(vendor_id);

-- --------------------------------------------------------
-- 4. Vendor Transactions
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS vendor_transactions (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id      UUID NOT NULL DEFAULT get_my_tenant_id() REFERENCES tenants(id) ON DELETE CASCADE,
  vendor_id      UUID NOT NULL REFERENCES wholesale_vendors(id) ON DELETE CASCADE,
  date           DATE NOT NULL DEFAULT CURRENT_DATE,
  type           TEXT NOT NULL CHECK (type IN ('Invoice', 'Payment')),
  payment_method TEXT CHECK (payment_method IN ('Cash', 'Cheque')),
  amount         NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
  cheque_id      UUID REFERENCES outbound_cheques(id) ON DELETE SET NULL,
  notes          TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE vendor_transactions IS 'Vendor transaction audit trail scoped to a tenant.';
CREATE INDEX IF NOT EXISTS idx_vtx_tenant ON vendor_transactions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_vtx_vendor ON vendor_transactions(vendor_id);
CREATE INDEX IF NOT EXISTS idx_vtx_type   ON vendor_transactions(type);

-- ============================================================
-- PART 2: ROW LEVEL SECURITY
-- (all tables exist now, so cross-table references are safe)
-- ============================================================

-- tenants
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can read their tenant"
  ON tenants FOR SELECT
  USING (
    id = (SELECT tenant_id FROM user_profiles WHERE id = auth.uid())
  );

-- user_profiles
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read their own profile"
  ON user_profiles FOR SELECT
  USING (id = auth.uid());

-- daily_revenue
ALTER TABLE daily_revenue ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tenant-scoped revenue access"
  ON daily_revenue FOR ALL
  USING (tenant_id = get_my_tenant_id())
  WITH CHECK (tenant_id = get_my_tenant_id());

-- wholesale_vendors
ALTER TABLE wholesale_vendors ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tenant-scoped vendor access"
  ON wholesale_vendors FOR ALL
  USING (tenant_id = get_my_tenant_id())
  WITH CHECK (tenant_id = get_my_tenant_id());

-- outbound_cheques
ALTER TABLE outbound_cheques ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tenant-scoped cheque access"
  ON outbound_cheques FOR ALL
  USING (tenant_id = get_my_tenant_id())
  WITH CHECK (tenant_id = get_my_tenant_id());

-- vendor_transactions
ALTER TABLE vendor_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tenant-scoped transaction access"
  ON vendor_transactions FOR ALL
  USING (tenant_id = get_my_tenant_id())
  WITH CHECK (tenant_id = get_my_tenant_id());

-- ============================================================
-- PART 3: TRIGGERS (Auto-provisioning)
-- ============================================================

-- Function to handle newly created users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  new_tenant_id UUID;
  user_full_name TEXT;
BEGIN
  -- Fallback for name
  user_full_name := COALESCE(
    NEW.raw_user_meta_data->>'full_name',
    split_part(NEW.email, '@', 1)
  );

  -- 1. Create a new tenant for the user
  INSERT INTO public.tenants (name)
  VALUES (user_full_name || '''s Shop')
  RETURNING id INTO new_tenant_id;

  -- 2. Create the user profile linked to the new tenant
  INSERT INTO public.user_profiles (id, tenant_id, full_name, role)
  VALUES (NEW.id, new_tenant_id, user_full_name, 'admin');

  RETURN NEW;
END;
$$;

-- Trigger to fire on user creation
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
