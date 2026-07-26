import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useTenantId } from '@/lib/auth';
import type { DashboardSummary } from '@/lib/types';

export const dashboardKeys = {
  summary: (tenantId: string) => ['dashboard', tenantId] as const,
};

/** Computes the aggregated dashboard metrics client-side. */
export function useDashboardSummary() {
  const tenantId = useTenantId();

  return useQuery({
    queryKey: dashboardKeys.summary(tenantId),
    queryFn: async (): Promise<DashboardSummary> => {
      // Fetch all three data sources in parallel
      const [revenueRes, chequesRes, cashPaymentsRes] = await Promise.all([
        supabase.from('daily_revenue').select('amount').eq('tenant_id', tenantId),
        supabase.from('outbound_cheques').select('amount, status').eq('tenant_id', tenantId),
        supabase
          .from('vendor_transactions')
          .select('amount')
          .eq('type', 'Payment')
          .eq('payment_method', 'Cash')
          .eq('tenant_id', tenantId),
      ]);

      if (revenueRes.error) throw revenueRes.error;
      if (chequesRes.error) throw chequesRes.error;
      if (cashPaymentsRes.error) throw cashPaymentsRes.error;

      const totalRevenue = (revenueRes.data ?? []).reduce(
        (sum, r) => sum + Number(r.amount),
        0
      );

      const totalCleared = (chequesRes.data ?? [])
        .filter((c) => c.status === 'Cleared')
        .reduce((sum, c) => sum + Number(c.amount), 0);

      const totalPending = (chequesRes.data ?? [])
        .filter((c) => c.status === 'Pending')
        .reduce((sum, c) => sum + Number(c.amount), 0);

      const totalCashPayments = (cashPaymentsRes.data ?? []).reduce(
        (sum, t) => sum + Number(t.amount),
        0
      );

      const availableCash = totalRevenue - totalCleared - totalCashPayments;

      return {
        totalRevenue,
        totalCleared,
        totalCashPayments,
        availableCash,
        totalPending,
      };
    },
  });
}
