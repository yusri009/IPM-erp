import { useState, useMemo, type FormEvent } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { MetricCard } from '@/components/MetricCard';
import { StatusBadge } from '@/components/StatusBadge';
import { Modal } from '@/components/Modal';
import { useDashboardSummary } from '@/hooks/useDashboard';
import { useRevenue, useAddRevenue } from '@/hooks/useRevenue';
import { useCheques, useIssueCheque } from '@/hooks/useCheques';
import { useAddExpense } from '@/hooks/useExpenses';

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'LKR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

export default function Dashboard() {
  const { data: summary, isLoading: summaryLoading } = useDashboardSummary();
  const { data: pendingCheques, isLoading: chequesLoading } = useCheques('Pending');
  const { data: revenueHistory, isLoading: revenueHistoryLoading } = useRevenue();
  const addRevenue = useAddRevenue();
  const addExpense = useAddExpense();
  const issueCheque = useIssueCheque();

  const todaysChequesTotal = pendingCheques
    ?.filter((c) => c.date === todayISO())
    .reduce((sum, c) => sum + c.amount, 0) ?? 0;

  // ── Modal State ──
  const [isRevModalOpen, setIsRevModalOpen] = useState(false);
  const [isChqModalOpen, setIsChqModalOpen] = useState(false);

  // ── Revenue & Expense form state ──
  const [revDate, setRevDate] = useState(todayISO());
  const [revAmount, setRevAmount] = useState('');
  const [revNotes, setRevNotes] = useState('');
  
  const [expAmount, setExpAmount] = useState('');
  const [expCategory, setExpCategory] = useState('');

  // ── Issue cheque form state ──
  const [chqDate, setChqDate] = useState(todayISO());
  const [chqPayee, setChqPayee] = useState('');
  const [chqNumber, setChqNumber] = useState('');
  const [chqAmount, setChqAmount] = useState('');

  // ── Chart Data ──
  const chartData = useMemo(() => {
    if (!revenueHistory) return [];

    // Group by date
    const grouped = revenueHistory.reduce((acc, curr) => {
      acc[curr.date] = (acc[curr.date] || 0) + curr.amount;
      return acc;
    }, {} as Record<string, number>);

    // Convert to array and sort by date ascending
    return Object.entries(grouped)
      .map(([date, amount]) => ({
        date: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        fullDate: date,
        amount
      }))
      .sort((a, b) => a.fullDate.localeCompare(b.fullDate));
  }, [revenueHistory]);

  const handleAddRevenue = async (e: FormEvent) => {
    e.preventDefault();
    if (!revAmount && !expAmount) return;

    try {
      if (revAmount) {
        await addRevenue.mutateAsync({ 
          date: revDate, 
          amount: parseFloat(revAmount), 
          notes: revNotes || undefined 
        });
      }
      if (expAmount) {
        await addExpense.mutateAsync({
          date: revDate,
          amount: parseFloat(expAmount),
          category: expCategory || undefined,
          notes: 'Logged with Daily Revenue'
        });
      }
      
      setRevAmount('');
      setRevNotes('');
      setExpAmount('');
      setExpCategory('');
      setRevDate(todayISO());
      setIsRevModalOpen(false);
    } catch (err) {
      console.error('Failed to log daily records:', err);
    }
  };

  const handleIssueCheque = (e: FormEvent) => {
    e.preventDefault();
    if (!chqPayee || !chqNumber || !chqAmount) return;

    issueCheque.mutate(
      {
        date: chqDate,
        payee_name: chqPayee,
        cheque_number: chqNumber,
        amount: parseFloat(chqAmount),
      },
      {
        onSuccess: () => {
          setChqPayee('');
          setChqNumber('');
          setChqAmount('');
          setChqDate(todayISO());
          setIsChqModalOpen(false);
        },
      }
    );
  };

  return (
    <div className="space-y-8">
      {/* ── Page Header ── */}
      <div className="animate-fade-in-up">
        <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-100">Dashboard</h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          Overview of your shop's cash flow and pending cheques
        </p>
      </div>

      {/* ── Metric Cards ── */}
      <div className="stagger grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Total Revenue"
          value={summaryLoading ? '—' : formatCurrency(summary?.totalRevenue ?? 0)}
          accent="emerald"
          icon={
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" />
            </svg>
          }
        />
        <MetricCard
          label="Available Cash Balance"
          value={summaryLoading ? '—' : formatCurrency(summary?.availableCash ?? 0)}
          accent="blue"
          icon={
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 21v-8.25M15.75 21v-8.25M8.25 21v-8.25M3 9l9-6 9 6m-1.5 12V10.332A48.36 48.36 0 0012 9.75c-2.551 0-5.056.2-7.5.582V21M3 21h18M12 6.75h.008v.008H12V6.75z" />
            </svg>
          }
        />
        <MetricCard
          label="Total Pending Cheques"
          value={summaryLoading ? '—' : formatCurrency(summary?.totalPending ?? 0)}
          accent="amber"
          icon={
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />
        <MetricCard
          label="Today's Cheques Due"
          value={chequesLoading ? '—' : formatCurrency(todaysChequesTotal)}
          accent="rose"
          icon={
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          }
        />
      </div>

      {/* ── Quick Actions ── */}
      <div className="grid gap-6 lg:grid-cols-2">
        <button
          onClick={() => setIsRevModalOpen(true)}
          className="glass-card animate-fade-in-up flex flex-col items-center justify-center gap-3 p-5 transition-all duration-300 hover:scale-[1.02] hover:-translate-y-1 hover:bg-zinc-100/50 hover:shadow-lg hover:shadow-emerald-500/10 dark:hover:bg-zinc-800/50 active:scale-[0.98]"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-500">
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-200">Log Daily Revenue</h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">Record cash & digital sales for today</p>
        </button>

        <button
          onClick={() => setIsChqModalOpen(true)}
          className="glass-card animate-fade-in-up flex flex-col items-center justify-center gap-3 p-5 transition-all duration-300 hover:scale-[1.02] hover:-translate-y-1 hover:bg-zinc-100/50 hover:shadow-lg hover:shadow-amber-500/10 dark:hover:bg-zinc-800/50 active:scale-[0.98]"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-500/10 text-amber-500">
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" />
            </svg>
          </div>
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-200">Issue General Cheque</h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">Record an outgoing cheque payment</p>
        </button>
      </div>

      {/* ── Revenue Chart ── */}
      <div className="glass-card animate-fade-in-up p-6">
        <h2 className="mb-4 text-base font-semibold text-zinc-900 dark:text-zinc-200">
          <span className="mr-2 inline-block h-2 w-2 rounded-full bg-blue-500" />
          Revenue Trend
        </h2>
        <div className="h-[300px] w-full">
          {revenueHistoryLoading ? (
            <div className="flex h-full items-center justify-center">
              <span className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-zinc-600 border-t-zinc-300" />
            </div>
          ) : chartData.length === 0 ? (
            <div className="flex h-full items-center justify-center text-sm text-zinc-500">
              No revenue data available.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorAmount" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.1)" />
                <XAxis dataKey="date" tick={{ fill: '#71717a', fontSize: 12 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fill: '#71717a', fontSize: 12 }} tickLine={false} axisLine={false} tickFormatter={(val) => `Rs.${val}`} />
                <Tooltip
                  contentStyle={{ backgroundColor: 'rgba(24, 24, 27, 0.9)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
                  itemStyle={{ color: '#10b981' }}
                />
                <Area type="monotone" dataKey="amount" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorAmount)" />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <Modal open={isRevModalOpen} onClose={() => setIsRevModalOpen(false)} title="Log Daily Revenue">
        <form onSubmit={handleAddRevenue} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-zinc-500 dark:text-zinc-400">Date</label>
              <input
                type="date"
                className="input"
                value={revDate}
                onChange={(e) => setRevDate(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-zinc-500 dark:text-zinc-400">Amount (Rs.)</label>
              <input
                type="number"
                className="input"
                placeholder="0.00"
                min="0"
                step="0.01"
                value={revAmount}
                onChange={(e) => setRevAmount(e.target.value)}
                required
              />
            </div>
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-zinc-500 dark:text-zinc-400">Revenue Notes (optional)</label>
            <input
              type="text"
              className="input"
              placeholder="e.g. Festival day, extra footfall"
              value={revNotes}
              onChange={(e) => setRevNotes(e.target.value)}
            />
          </div>
          <div className="pt-4 border-t border-zinc-200 dark:border-zinc-800">
            <h3 className="mb-4 text-sm font-semibold text-zinc-900 dark:text-zinc-200">Optional: Log Today's Expenses</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-zinc-500 dark:text-zinc-400">Expense Amount (Rs.)</label>
                <input
                  type="number"
                  className="input"
                  placeholder="0.00"
                  min="0"
                  step="0.01"
                  value={expAmount}
                  onChange={(e) => setExpAmount(e.target.value)}
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-zinc-500 dark:text-zinc-400">Expense Category</label>
                <input
                  type="text"
                  className="input"
                  placeholder="e.g. Labour, Transport"
                  value={expCategory}
                  onChange={(e) => setExpCategory(e.target.value)}
                />
              </div>
            </div>
          </div>
          <button
            type="submit"
            className="btn btn-primary w-full"
            disabled={addRevenue.isPending || addExpense.isPending}
          >
            {(addRevenue.isPending || addExpense.isPending) ? (
              <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
            ) : null}
            {(addRevenue.isPending || addExpense.isPending) ? 'Saving…' : 'Save Records'}
          </button>
        </form>
      </Modal>

      <Modal open={isChqModalOpen} onClose={() => setIsChqModalOpen(false)} title="Issue General Cheque">
        <form onSubmit={handleIssueCheque} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-zinc-500 dark:text-zinc-400">Date</label>
              <input
                type="date"
                className="input"
                value={chqDate}
                onChange={(e) => setChqDate(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-zinc-500 dark:text-zinc-400">Cheque #</label>
              <input
                type="text"
                className="input"
                placeholder="e.g. 004521"
                value={chqNumber}
                onChange={(e) => setChqNumber(e.target.value)}
                required
              />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-zinc-500 dark:text-zinc-400">Payee Name</label>
              <input
                type="text"
                className="input"
                placeholder="e.g. KSEB, Rent"
                value={chqPayee}
                onChange={(e) => setChqPayee(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-zinc-500 dark:text-zinc-400">Amount (Rs.)</label>
              <input
                type="number"
                className="input"
                placeholder="0.00"
                min="0.01"
                step="0.01"
                value={chqAmount}
                onChange={(e) => setChqAmount(e.target.value)}
                required
              />
            </div>
          </div>
          <button
            type="submit"
            className="btn btn-secondary w-full"
            disabled={issueCheque.isPending}
          >
            {issueCheque.isPending ? (
              <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-zinc-400/30 border-t-zinc-400" />
            ) : null}
            {issueCheque.isPending ? 'Issuing…' : 'Issue Cheque'}
          </button>
        </form>
      </Modal>

      {/* ── Pending Cheques Table ── */}
      <div className="glass-card animate-fade-in-up overflow-hidden p-6">
        <h2 className="mb-4 text-base font-semibold text-zinc-900 dark:text-zinc-200">
          <span className="mr-2 inline-block h-2 w-2 rounded-full bg-amber-400" />
          Pending Cheques
        </h2>

        {chequesLoading ? (
          <div className="flex items-center justify-center py-12">
            <span className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-zinc-600 border-t-zinc-300" />
          </div>
        ) : !pendingCheques?.length ? (
          <div className="py-12 text-center text-sm text-zinc-500">
            No pending cheques. All clear! ✓
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Payee</th>
                  <th>Cheque #</th>
                  <th>Amount</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {pendingCheques.map((cheque) => (
                  <tr key={cheque.id}>
                    <td className="text-zinc-600 dark:text-zinc-400">{cheque.date}</td>
                    <td className="font-medium text-zinc-900 dark:text-zinc-200">{cheque.payee_name}</td>
                    <td className="font-mono text-xs text-zinc-500 dark:text-zinc-400">{cheque.cheque_number}</td>
                    <td className="font-medium text-zinc-900 dark:text-zinc-200">{formatCurrency(cheque.amount)}</td>
                    <td>
                      <StatusBadge status={cheque.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
