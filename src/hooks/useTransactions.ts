import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useTenantId } from '@/lib/auth';
import type { VendorTransaction } from '@/lib/types';

export const transactionKeys = {
  all: ['transactions'] as const,
  filtered: (vendorId?: string, date?: string) =>
    [...transactionKeys.all, { vendorId, date }] as const,
};

export type VendorTransactionWithVendor = VendorTransaction & {
  wholesale_vendors: {
    name: string;
  } | null;
};

/**
 * Fetch all transactions for the tenant, optionally filtered by vendorId or date.
 */
export function useTransactions(vendorId?: string, date?: string) {
  const tenantId = useTenantId();

  return useQuery({
    queryKey: transactionKeys.filtered(vendorId, date),
    queryFn: async () => {
      if (!tenantId) return [];

      let query = supabase
        .from('vendor_transactions')
        .select('*, wholesale_vendors(name)')
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false });

      if (vendorId) {
        query = query.eq('vendor_id', vendorId);
      }
      if (date) {
        query = query.eq('date', date);
      }

      const { data, error } = await query;
      if (error) throw error;

      return (data as unknown) as VendorTransactionWithVendor[];
    },
    enabled: !!tenantId,
  });
}
