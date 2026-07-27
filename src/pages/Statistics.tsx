import { useState, useMemo } from 'react';
import { useStatisticsData } from '@/hooks/useStatistics';
import { MetricCard } from '@/components/MetricCard';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend } from 'recharts';

type ViewMode = 'Daily' | 'Monthly' | 'Yearly' | 'All-Time';

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'LKR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}

export default function Statistics() {
  const { data: rawData, isLoading } = useStatisticsData();
  const [viewMode, setViewMode] = useState<ViewMode>('Monthly');

  const aggregatedData = useMemo(() => {
    if (!rawData) return [];

    const grouped: Record<string, {
      dateLabel: string;
      revenue: number;
      expenses: number;
      vendorInvoices: number;
      chequesCleared: number;
      chequesPending: number;
      sortKey: string;
    }> = {};

    const getGroupKey = (dateStr: string) => {
      if (!dateStr) return 'Unknown';
      const d = new Date(dateStr);
      if (viewMode === 'Daily') return dateStr;
      if (viewMode === 'Monthly') return dateStr.slice(0, 7); // YYYY-MM
      if (viewMode === 'Yearly') return dateStr.slice(0, 4);  // YYYY
      return 'All-Time';
    };

    const getLabel = (key: string) => {
      if (viewMode === 'Daily') {
        return new Date(key).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      }
      if (viewMode === 'Monthly') {
        const [year, month] = key.split('-');
        const d = new Date(Number(year), Number(month) - 1);
        return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
      }
      if (viewMode === 'Yearly') return key;
      return 'All-Time';
    };

    const initGroup = (key: string) => {
      if (!grouped[key]) {
        grouped[key] = {
          dateLabel: getLabel(key),
          revenue: 0,
          expenses: 0,
          vendorInvoices: 0,
          chequesCleared: 0,
          chequesPending: 0,
          sortKey: key,
        };
      }
    };

    // Process Revenue
    rawData.revenue.forEach(r => {
      const key = getGroupKey(r.date);
      initGroup(key);
      grouped[key].revenue += Number(r.amount);
    });

    // Process Expenses
    rawData.expenses.forEach(e => {
      const key = getGroupKey(e.date);
      initGroup(key);
      grouped[key].expenses += Number(e.amount);
    });

    // Process Vendor Transactions
    rawData.vendorTx.forEach(tx => {
      const key = getGroupKey(tx.date);
      initGroup(key);
      if (tx.type === 'Invoice') {
        grouped[key].vendorInvoices += Number(tx.amount);
      }
    });

    // Process Cheques
    rawData.cheques.forEach(c => {
      const key = getGroupKey(c.date);
      initGroup(key);
      if (c.status === 'Cleared') {
        grouped[key].chequesCleared += Number(c.amount);
      } else if (c.status === 'Pending') {
        grouped[key].chequesPending += Number(c.amount);
      }
    });

    // Compute Profit and format array
    return Object.values(grouped)
      .map(g => ({
        ...g,
        profit: g.revenue - (g.vendorInvoices + g.expenses),
      }))
      .sort((a, b) => a.sortKey.localeCompare(b.sortKey));

  }, [rawData, viewMode]);

  // Totals for the currently visible list
  const totals = useMemo(() => {
    return aggregatedData.reduce((acc, curr) => {
      acc.revenue += curr.revenue;
      acc.expenses += curr.expenses;
      acc.profit += curr.profit;
      acc.cheques += (curr.chequesCleared + curr.chequesPending);
      return acc;
    }, { revenue: 0, expenses: 0, profit: 0, cheques: 0 });
  }, [aggregatedData]);

  return (
    <div className="space-y-8">
      {/* ── Page Header ── */}
      <div className="animate-fade-in-up">
        <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-100">Statistics</h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          In-depth breakdown of profit, revenue, expenses, and cheques.
        </p>
      </div>

      {/* ── Tabs ── */}
      <div className="flex gap-2 p-1 bg-zinc-100/50 dark:bg-zinc-800/50 rounded-xl w-fit">
        {(['Daily', 'Monthly', 'Yearly', 'All-Time'] as ViewMode[]).map(mode => (
          <button
            key={mode}
            onClick={() => setViewMode(mode)}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${
              viewMode === mode 
                ? 'bg-white dark:bg-zinc-700 shadow-sm text-zinc-900 dark:text-zinc-100' 
                : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'
            }`}
          >
            {mode}
          </button>
        ))}
      </div>

      {/* ── Aggregate Totals ── */}
      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label={`${viewMode} Total Revenue`}
          value={isLoading ? '—' : formatCurrency(totals.revenue)}
          accent="teal"
          icon={
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />
        <MetricCard
          label={`${viewMode} Total Profit`}
          value={isLoading ? '—' : formatCurrency(totals.profit)}
          accent="violet"
          icon={
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
            </svg>
          }
        />
        <MetricCard
          label={`${viewMode} Total Expenses`}
          value={isLoading ? '—' : formatCurrency(totals.expenses)}
          accent="rose"
          icon={
             <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" />
            </svg>
          }
        />
        <MetricCard
          label={`${viewMode} Cheques Logged`}
          value={isLoading ? '—' : formatCurrency(totals.cheques)}
          accent="amber"
          icon={
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m-7.5 0h7.5m-7.5 3h7.5m3-9h3.375c.621 0 1.125.504 1.125 1.125V18a2.25 2.25 0 01-2.25 2.25M16.5 7.5h1.875a.375.375 0 00.375-.375V6a.375.375 0 00-.375-.375h-1.5a.375.375 0 00-.375.375v.75c0 .207.168.375.375.375z" />
            </svg>
          }
        />
      </div>

      {/* ── Chart ── */}
      <div className="glass-card p-6">
        <h2 className="mb-6 text-base font-semibold text-zinc-900 dark:text-zinc-200">
          Profit vs Revenue Trend
        </h2>
        <div className="h-[350px] w-full">
          {isLoading ? (
            <div className="flex h-full items-center justify-center">
              <span className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-zinc-600 border-t-zinc-300" />
            </div>
          ) : aggregatedData.length === 0 ? (
            <div className="flex h-full items-center justify-center text-sm text-zinc-500">
              No data available for this period.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={aggregatedData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.1)" />
                <XAxis dataKey="dateLabel" tick={{ fill: '#71717a', fontSize: 12 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fill: '#71717a', fontSize: 12 }} tickLine={false} axisLine={false} tickFormatter={(val) => `Rs.${val}`} />
                <Tooltip
                  contentStyle={{ backgroundColor: 'rgba(24, 24, 27, 0.9)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#fff' }}
                  cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                <Bar dataKey="revenue" name="Revenue" fill="#0d9488" radius={[4, 4, 0, 0]} />
                <Bar dataKey="profit" name="Profit" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* ── Data Table ── */}
      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-zinc-600 dark:text-zinc-400">
            <thead className="border-b border-zinc-200/50 bg-zinc-50/50 text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:border-zinc-800/50 dark:bg-zinc-900/50 dark:text-zinc-400">
              <tr>
                <th className="px-6 py-4">Period</th>
                <th className="px-6 py-4 text-right">Revenue</th>
                <th className="px-6 py-4 text-right">Expenses</th>
                <th className="px-6 py-4 text-right">Cheques Total</th>
                <th className="px-6 py-4 text-right font-bold">Net Profit</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200/50 dark:divide-zinc-800/50">
              {aggregatedData.map((row) => (
                <tr key={row.sortKey} className="transition-colors hover:bg-zinc-50/50 dark:hover:bg-zinc-900/50">
                  <td className="px-6 py-4 font-medium text-zinc-900 dark:text-zinc-100">
                    {row.dateLabel}
                  </td>
                  <td className="px-6 py-4 text-right text-teal-600 dark:text-teal-400 font-medium">
                    {formatCurrency(row.revenue)}
                  </td>
                  <td className="px-6 py-4 text-right text-rose-600 dark:text-rose-400">
                    {formatCurrency(row.expenses)}
                  </td>
                  <td className="px-6 py-4 text-right text-amber-600 dark:text-amber-400">
                    {formatCurrency(row.chequesCleared + row.chequesPending)}
                  </td>
                  <td className={`px-6 py-4 text-right font-bold ${row.profit >= 0 ? 'text-violet-600 dark:text-violet-400' : 'text-rose-600 dark:text-rose-400'}`}>
                    {formatCurrency(row.profit)}
                  </td>
                </tr>
              ))}
              {aggregatedData.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-sm text-zinc-500">
                    No records found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
