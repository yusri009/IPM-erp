import { useState, type FormEvent } from 'react';
import { useExpenses, useAddExpense } from '@/hooks/useExpenses';
import { Modal } from '@/components/Modal';

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

export default function Expenses() {
  const { data: expenses, isLoading } = useExpenses();
  const addExpense = useAddExpense();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [date, setDate] = useState(todayISO());
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [notes, setNotes] = useState('');

  const handleAddExpense = (e: FormEvent) => {
    e.preventDefault();
    if (!amount) return;

    addExpense.mutate(
      {
        date,
        amount: parseFloat(amount),
        category: category || undefined,
        notes: notes || undefined,
      },
      {
        onSuccess: () => {
          setAmount('');
          setCategory('');
          setNotes('');
          setDate(todayISO());
          setIsModalOpen(false);
        },
      }
    );
  };

  return (
    <div className="space-y-8">
      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 animate-fade-in-up">
        <div>
          <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-100">Expenses</h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Track your daily expenses and outgoings.
          </p>
        </div>
        <button onClick={() => setIsModalOpen(true)} className="btn btn-primary">
          <svg className="mr-2 -ml-1 h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Add Expense
        </button>
      </div>

      {/* ── Expenses Table ── */}
      <div className="glass-card animate-fade-in-up overflow-hidden p-6">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <span className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-zinc-600 border-t-zinc-300" />
          </div>
        ) : !expenses?.length ? (
          <div className="py-12 text-center text-sm text-zinc-500">
            No expenses logged yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Category</th>
                  <th>Notes</th>
                  <th>Amount</th>
                </tr>
              </thead>
              <tbody>
                {expenses.map((expense) => (
                  <tr key={expense.id}>
                    <td className="text-zinc-600 dark:text-zinc-400">{expense.date}</td>
                    <td className="font-medium text-zinc-900 dark:text-zinc-200">{expense.category || '—'}</td>
                    <td className="text-sm text-zinc-500 dark:text-zinc-400 max-w-[200px] truncate">{expense.notes || '—'}</td>
                    <td className="font-medium text-red-600 dark:text-red-400">-{formatCurrency(expense.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Add Expense Modal ── */}
      <Modal open={isModalOpen} onClose={() => setIsModalOpen(false)} title="Log Expense">
        <form onSubmit={handleAddExpense} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-zinc-500 dark:text-zinc-400">Date</label>
              <input
                type="date"
                className="input"
                value={date}
                onChange={(e) => setDate(e.target.value)}
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
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
              />
            </div>
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-zinc-500 dark:text-zinc-400">Category</label>
            <input
              type="text"
              className="input"
              placeholder="e.g. Utilities, Shop Supplies, Labour"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-zinc-500 dark:text-zinc-400">Notes (optional)</label>
            <input
              type="text"
              className="input"
              placeholder="Additional details..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
          <button
            type="submit"
            className="btn btn-primary w-full"
            disabled={addExpense.isPending}
          >
            {addExpense.isPending ? 'Saving…' : 'Add Expense'}
          </button>
        </form>
      </Modal>
    </div>
  );
}
