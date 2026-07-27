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
      // Fetch all required data sources in parallel
      const [revenueRes, chequesRes, vendorTxRes, expensesRes, vendorsRes] = await Promise.all([
        supabase.from('daily_revenue').select('amount, date').eq('tenant_id', tenantId),
        supabase.from('outbound_cheques').select('amount, status').eq('tenant_id', tenantId),
        supabase.from('vendor_transactions').select('amount, type, payment_method, date').eq('tenant_id', tenantId),
        supabase.from('expenses').select('amount, date').eq('tenant_id', tenantId),
        supabase.from('wholesale_vendors').select('balance_owed').eq('tenant_id', tenantId),
      ]);

      if (revenueRes.error) throw revenueRes.error;
      if (chequesRes.error) throw chequesRes.error;
      if (vendorTxRes.error) throw vendorTxRes.error;
      if (expensesRes.error) throw expensesRes.error;
      if (vendorsRes.error) throw vendorsRes.error;

      const currentMonthPrefix = new Date().toISOString().slice(0, 7); // e.g. "2026-07"

      // ── Revenue ──
      let totalRevenue = 0;
      let currentMonthRevenue = 0;
      (revenueRes.data ?? []).forEach((r) => {
        const amt = Number(r.amount);
        totalRevenue += amt;
        if (r.date?.startsWith(currentMonthPrefix)) {
          currentMonthRevenue += amt;
        }
      });

      // ── Cheques ──
      let totalCleared = 0;
      let totalPending = 0;
      (chequesRes.data ?? []).forEach((c) => {
        if (c.status === 'Cleared') totalCleared += Number(c.amount);
        else if (c.status === 'Pending') totalPending += Number(c.amount);
      });

      // ── Vendor Transactions (Invoices and Cash Payments) ──
      let totalCashPayments = 0;
      let totalVendorInvoices = 0;
      let currentMonthVendorInvoices = 0;
      
      (vendorTxRes.data ?? []).forEach((tx) => {
        const amt = Number(tx.amount);
        if (tx.type === 'Payment' && tx.payment_method === 'Cash') {
          totalCashPayments += amt;
        } else if (tx.type === 'Invoice') {
          totalVendorInvoices += amt;
          if (tx.date?.startsWith(currentMonthPrefix)) {
            currentMonthVendorInvoices += amt;
          }
        }
      });

      // ── Expenses ──
      let totalExpenses = 0;
      let currentMonthExpenses = 0;
      (expensesRes.data ?? []).forEach((e) => {
        const amt = Number(e.amount);
        totalExpenses += amt;
        if (e.date?.startsWith(currentMonthPrefix)) {
          currentMonthExpenses += amt;
        }
      });

      // ── Payables ──
      const totalPayables = (vendorsRes.data ?? []).reduce(
        (sum, v) => sum + Number(v.balance_owed),
        0
      );

      // ── Balances & Profit ──
      const availableCash = totalRevenue - totalCleared - totalCashPayments - totalExpenses;
      
      // Profit = Incoming (Revenue) - Outgoing (Vendor Invoices + Expenses)
      const totalProfit = totalRevenue - (totalVendorInvoices + totalExpenses);
      const currentMonthProfit = currentMonthRevenue - (currentMonthVendorInvoices + currentMonthExpenses);

      return {
        totalRevenue,
        totalCleared,
        totalCashPayments,
        totalExpenses,
        availableCash,
        totalPending,
        currentMonthRevenue,
        totalPayables,
        totalProfit,
        currentMonthProfit,
      };
    },
  });
}
