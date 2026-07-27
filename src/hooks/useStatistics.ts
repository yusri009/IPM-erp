import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useTenantId } from '@/lib/auth';

export const statisticsKeys = {
  all: (tenantId: string) => ['statistics', tenantId] as const,
};

export interface RawStatsData {
  revenue: { date: string; amount: number }[];
  cheques: { date: string; amount: number; status: string }[];
  vendorTx: { date: string; amount: number; type: string; payment_method: string | null }[];
  expenses: { date: string; amount: number }[];
}

export function useStatisticsData() {
  const tenantId = useTenantId();

  return useQuery({
    queryKey: statisticsKeys.all(tenantId),
    queryFn: async (): Promise<RawStatsData> => {
      const [revenueRes, chequesRes, vendorTxRes, expensesRes] = await Promise.all([
        supabase.from('daily_revenue').select('amount, date').eq('tenant_id', tenantId),
        supabase.from('outbound_cheques').select('amount, status, date').eq('tenant_id', tenantId),
        supabase.from('vendor_transactions').select('amount, type, payment_method, date').eq('tenant_id', tenantId),
        supabase.from('expenses').select('amount, date').eq('tenant_id', tenantId),
      ]);

      if (revenueRes.error) throw revenueRes.error;
      if (chequesRes.error) throw chequesRes.error;
      if (vendorTxRes.error) throw vendorTxRes.error;
      if (expensesRes.error) throw expensesRes.error;

      return {
        revenue: revenueRes.data ?? [],
        cheques: chequesRes.data ?? [],
        vendorTx: vendorTxRes.data ?? [],
        expenses: expensesRes.data ?? [],
      };
    },
  });
}
