// ============================================================
// TypeScript Interfaces — Database Models & DTOs (Multi-Tenant)
// ============================================================

/** Cheque lifecycle status */
export type ChequeStatus = 'Pending' | 'Cleared' | 'Bounced';

/** Vendor transaction type */
export type TransactionType = 'Invoice' | 'Payment';

/** Payment method for vendor transactions */
export type PaymentMethod = 'Cash' | 'Cheque';

// ─── Multi-Tenant Types ─────────────────────────────────────

export interface Tenant {
  id: string;
  name: string;
  created_at: string;
}

export interface UserProfile {
  id: string;
  tenant_id: string;
  full_name: string | null;
  role: string;
  created_at: string;
}

// ─── Database Row Types ──────────────────────────────────────

export interface DailyRevenue {
  id: string;
  tenant_id: string;
  date: string;
  amount: number;
  notes: string | null;
  created_at: string;
}

export interface Expense {
  id: string;
  tenant_id: string;
  date: string;
  amount: number;
  category: string | null;
  notes: string | null;
  created_at: string;
}

export interface WholesaleVendor {
  id: string;
  tenant_id: string;
  name: string;
  balance_owed: number;
  created_at: string;
}

export interface OutboundCheque {
  id: string;
  tenant_id: string;
  date: string;
  payee_name: string;
  vendor_id: string | null;
  amount: number;
  cheque_number: string;
  status: ChequeStatus;
  created_at: string;
}

export interface VendorTransaction {
  id: string;
  tenant_id: string;
  vendor_id: string;
  date: string;
  type: TransactionType;
  payment_method: PaymentMethod | null;
  amount: number;
  cheque_id: string | null;
  notes: string | null;
  document_path: string | null;
  created_at: string;
}

// ─── Insert Types (omit server-generated fields) ────────────

export interface DailyRevenueInsert {
  tenant_id: string;
  date: string;
  amount: number;
  notes?: string;
}

export interface DailyRevenueUpdate {
  amount?: number;
  notes?: string;
}

export interface ExpenseInsert {
  tenant_id: string;
  date: string;
  amount: number;
  category?: string;
  notes?: string;
}

export interface ExpenseUpdate {
  date?: string;
  amount?: number;
  category?: string;
  notes?: string;
}

export interface WholesaleVendorInsert {
  tenant_id: string;
  name: string;
}

export interface OutboundChequeInsert {
  tenant_id: string;
  date: string;
  payee_name: string;
  vendor_id?: string | null;
  amount: number;
  cheque_number: string;
  status?: ChequeStatus;
}

export interface OutboundChequeUpdate {
  amount?: number;
  date?: string;
  payee_name?: string;
  cheque_number?: string;
}

export interface VendorTransactionInsert {
  tenant_id: string;
  vendor_id: string;
  date: string;
  type: TransactionType;
  payment_method?: PaymentMethod | null;
  amount: number;
  cheque_id?: string | null;
  notes?: string;
  document_path?: string | null;
}

// ─── Dashboard Summary ──────────────────────────────────────

export interface DashboardSummary {
  totalRevenue: number;
  totalCleared: number;
  totalCashPayments: number;
  totalExpenses: number;
  availableCash: number;
  totalPending: number;
}

// ─── Vendor Payment Request ──────────────────────────────────

export interface VendorPaymentRequest {
  vendorId: string;
  vendorName: string;
  amount: number;
  date: string;
  method: PaymentMethod;
  chequeNumber?: string;
  file?: File;
}

// ─── Vendor Invoice Request ──────────────────────────────────

export interface VendorInvoiceRequest {
  vendorId: string;
  amount: number;
  date: string;
  notes?: string;
  file?: File;
}
