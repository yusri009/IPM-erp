import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useTenantId } from '@/lib/auth';
import type { OutboundCheque, OutboundChequeInsert, OutboundChequeUpdate, ChequeStatus } from '@/lib/types';

export const chequeKeys = {
  all: ['cheques'] as const,
  byStatus: (status: ChequeStatus) => ['cheques', status] as const,
};

/** Fetch cheques, optionally filtered by status. */
export function useCheques(status?: ChequeStatus) {
  const tenantId = useTenantId();

  return useQuery({
    queryKey: status ? chequeKeys.byStatus(status) : chequeKeys.all,
    queryFn: async (): Promise<OutboundCheque[]> => {
      let query = supabase
        .from('outbound_cheques')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('date', { ascending: false });

      if (status) {
        query = query.eq('status', status);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data ?? [];
    },
  });
}

/** Mutation: issue a new outbound cheque (stamps tenant_id, defaults to 'Pending'). */
export function useIssueCheque() {
  const queryClient = useQueryClient();
  const tenantId = useTenantId();

  return useMutation({
    mutationFn: async (cheque: Omit<OutboundChequeInsert, 'tenant_id'>) => {
      const { data, error } = await supabase
        .from('outbound_cheques')
        .insert({ ...cheque, tenant_id: tenantId, status: cheque.status ?? 'Pending' })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: chequeKeys.all });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

/** Mutation: clear a cheque — update status to 'Cleared'.
 *  If the cheque is vendor-linked, also decrement the vendor's balance_owed. */
export function useClearCheque() {
  const queryClient = useQueryClient();
  const tenantId = useTenantId();

  return useMutation({
    mutationFn: async (chequeId: string) => {
      // 1. Fetch the cheque to check for vendor linkage
      const { data: cheque, error: fetchErr } = await supabase
        .from('outbound_cheques')
        .select('*')
        .eq('id', chequeId)
        .eq('tenant_id', tenantId)
        .single();

      if (fetchErr || !cheque) throw fetchErr ?? new Error('Cheque not found');

      // 2. Update cheque status to Cleared
      const { error: updateErr } = await supabase
        .from('outbound_cheques')
        .update({ status: 'Cleared' as ChequeStatus })
        .eq('id', chequeId);

      if (updateErr) throw updateErr;

      // 3. If vendor-linked, decrement balance_owed
      if (cheque.vendor_id) {
        const { data: vendor, error: vendorFetchErr } = await supabase
          .from('wholesale_vendors')
          .select('balance_owed')
          .eq('id', cheque.vendor_id)
          .eq('tenant_id', tenantId)
          .single();

        if (vendorFetchErr || !vendor) throw vendorFetchErr ?? new Error('Vendor not found');

        const newBalance = Math.max(0, Number(vendor.balance_owed) - Number(cheque.amount));

        const { error: vendorUpdateErr } = await supabase
          .from('wholesale_vendors')
          .update({ balance_owed: newBalance })
          .eq('id', cheque.vendor_id);

        if (vendorUpdateErr) throw vendorUpdateErr;
      }

      return cheque;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: chequeKeys.all });
      queryClient.invalidateQueries({ queryKey: ['vendors'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

/** Mutation: reverse a cleared cheque back to 'Pending'.
 *  If vendor-linked, increments the vendor's balance_owed to undo the clearance. */
export function useReverseCheque() {
  const queryClient = useQueryClient();
  const tenantId = useTenantId();

  return useMutation({
    mutationFn: async (chequeId: string) => {
      // 1. Fetch the cheque
      const { data: cheque, error: fetchErr } = await supabase
        .from('outbound_cheques')
        .select('*')
        .eq('id', chequeId)
        .eq('tenant_id', tenantId)
        .single();

      if (fetchErr || !cheque) throw fetchErr ?? new Error('Cheque not found');
      if (cheque.status !== 'Cleared') throw new Error('Only cleared cheques can be reversed');

      // 2. Revert status to Pending
      const { error: updateErr } = await supabase
        .from('outbound_cheques')
        .update({ status: 'Pending' as ChequeStatus })
        .eq('id', chequeId);

      if (updateErr) throw updateErr;

      // 3. If vendor-linked, increment balance_owed (undoing the payment)
      if (cheque.vendor_id) {
        const { data: vendor, error: vendorFetchErr } = await supabase
          .from('wholesale_vendors')
          .select('balance_owed')
          .eq('id', cheque.vendor_id)
          .eq('tenant_id', tenantId)
          .single();

        if (vendorFetchErr || !vendor) throw vendorFetchErr ?? new Error('Vendor not found');

        const newBalance = Number(vendor.balance_owed) + Number(cheque.amount);

        const { error: vendorUpdateErr } = await supabase
          .from('wholesale_vendors')
          .update({ balance_owed: newBalance })
          .eq('id', cheque.vendor_id);

        if (vendorUpdateErr) throw vendorUpdateErr;
      }

      return chequeId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: chequeKeys.all });
      queryClient.invalidateQueries({ queryKey: ['vendors'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

/** Mutation: update an Pending cheque's details. */
export function useUpdateCheque() {
  const queryClient = useQueryClient();
  const tenantId = useTenantId();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: OutboundChequeUpdate }) => {
      // First verify it's not cleared
      const { data: cheque, error: checkErr } = await supabase
        .from('outbound_cheques')
        .select('status')
        .eq('id', id)
        .eq('tenant_id', tenantId)
        .single();

      if (checkErr || !cheque) throw checkErr ?? new Error('Cheque not found');
      if (cheque.status !== 'Pending') {
        throw new Error('Only pending cheques can be edited.');
      }

      const { data, error } = await supabase
        .from('outbound_cheques')
        .update(updates)
        .eq('id', id)
        .eq('tenant_id', tenantId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: chequeKeys.all });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

/** Mutation: delete a pending cheque. */
export function useDeleteCheque() {
  const queryClient = useQueryClient();
  const tenantId = useTenantId();

  return useMutation({
    mutationFn: async (id: string) => {
      // First verify it's not cleared
      const { data: cheque, error: checkErr } = await supabase
        .from('outbound_cheques')
        .select('status')
        .eq('id', id)
        .eq('tenant_id', tenantId)
        .single();

      if (checkErr || !cheque) throw checkErr ?? new Error('Cheque not found');
      if (cheque.status !== 'Pending') {
        throw new Error('Only pending cheques can be deleted.');
      }

      const { error } = await supabase
        .from('outbound_cheques')
        .delete()
        .eq('id', id)
        .eq('tenant_id', tenantId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: chequeKeys.all });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}
