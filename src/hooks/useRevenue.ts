import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useTenantId } from '@/lib/auth';
import type { DailyRevenue, DailyRevenueInsert, DailyRevenueUpdate } from '@/lib/types';

export const revenueKeys = {
  all: ['revenue'] as const,
};

/** Fetch all daily revenue entries, ordered by date descending. */
export function useRevenue() {
  const tenantId = useTenantId();

  return useQuery({
    queryKey: revenueKeys.all,
    queryFn: async (): Promise<DailyRevenue[]> => {
      const { data, error } = await supabase
        .from('daily_revenue')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('date', { ascending: false });

      if (error) throw error;
      return data ?? [];
    },
  });
}

/** Mutation: add a new daily revenue record (stamps tenant_id). */
export function useAddRevenue() {
  const queryClient = useQueryClient();
  const tenantId = useTenantId();

  return useMutation({
    mutationFn: async (revenue: Omit<DailyRevenueInsert, 'tenant_id'>) => {
      const { data, error } = await supabase
        .from('daily_revenue')
        .insert({ ...revenue, tenant_id: tenantId })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: revenueKeys.all });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

/** Mutation: update an existing daily revenue record. */
export function useUpdateRevenue() {
  const queryClient = useQueryClient();
  const tenantId = useTenantId();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: DailyRevenueUpdate }) => {
      const { data, error } = await supabase
        .from('daily_revenue')
        .update(updates)
        .eq('id', id)
        .eq('tenant_id', tenantId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: revenueKeys.all });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}
