import { useState, type FormEvent } from 'react';
import { useRevenue, useUpdateRevenue } from '@/hooks/useRevenue';
import { Modal } from '@/components/Modal';
import type { DailyRevenue } from '@/lib/types';

export default function RevenueHistory() {
  const { data: revenues, isLoading } = useRevenue();
  const updateRevenue = useUpdateRevenue();

  const [editingEntry, setEditingEntry] = useState<DailyRevenue | null>(null);
  const [editAmount, setEditAmount] = useState('');
  const [editNotes, setEditNotes] = useState('');

  const handleEditClick = (entry: DailyRevenue) => {
    setEditingEntry(entry);
    setEditAmount(entry.amount.toString());
    setEditNotes(entry.notes ?? '');
  };

  const handleUpdate = (e: FormEvent) => {
    e.preventDefault();
    if (!editingEntry) return;

    updateRevenue.mutate(
      {
        id: editingEntry.id,
        updates: {
          amount: parseFloat(editAmount),
          notes: editNotes || undefined,
        },
      },
      {
        onSuccess: () => {
          setEditingEntry(null);
        },
      }
    );
  };

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <span className="inline-block h-8 w-8 animate-spin rounded-full border-2 border-zinc-300 border-t-emerald-500" />
      </div>
    );
  }

  return (
    <div className="animate-fade-in-up space-y-6">
      <header className="mb-8">
        <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">Revenue History</h2>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          View and correct daily logged revenue entries
        </p>
      </header>

      <div className="glass-card overflow-hidden rounded-2xl shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-zinc-200/60 bg-zinc-50/50 dark:border-zinc-800/60 dark:bg-zinc-900/50">
                <th className="px-6 py-4 font-medium text-zinc-600 dark:text-zinc-300">Date</th>
                <th className="px-6 py-4 font-medium text-zinc-600 dark:text-zinc-300">Amount</th>
                <th className="px-6 py-4 font-medium text-zinc-600 dark:text-zinc-300">Notes</th>
                <th className="px-6 py-4 font-medium text-zinc-600 dark:text-zinc-300 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200/60 dark:divide-zinc-800/60">
              {revenues?.map((rev) => (
                <tr key={rev.id} className="transition-colors hover:bg-zinc-50/50 dark:hover:bg-zinc-800/30">
                  <td className="px-6 py-4 text-zinc-700 dark:text-zinc-300">
                    {new Date(rev.date).toLocaleDateString(undefined, {
                      weekday: 'short',
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                    })}
                  </td>
                  <td className="px-6 py-4 font-medium text-emerald-600 dark:text-emerald-400">
                    Rs. {rev.amount.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 text-zinc-500 dark:text-zinc-400">
                    {rev.notes || <span className="text-zinc-400 italic">No notes</span>}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => handleEditClick(rev)}
                      className="text-xs font-medium text-sky-600 hover:text-sky-700 dark:text-sky-400 dark:hover:text-sky-300 transition-colors"
                    >
                      Edit
                    </button>
                  </td>
                </tr>
              ))}
              {(!revenues || revenues.length === 0) && (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-zinc-500">
                    No revenue history found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal open={!!editingEntry} onClose={() => setEditingEntry(null)} title="Edit Revenue Entry">
        <form onSubmit={handleUpdate} className="space-y-4">
          {editingEntry && (
            <div className="mb-4 text-sm text-zinc-500 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800/50 p-3 rounded-xl">
              Editing entry for <strong className="text-zinc-900 dark:text-zinc-200">{editingEntry.date}</strong>
            </div>
          )}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-zinc-500 dark:text-zinc-400">
              Amount (Rs.)
            </label>
            <input
              type="number"
              step="0.01"
              required
              className="input"
              value={editAmount}
              onChange={(e) => setEditAmount(e.target.value)}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-zinc-500 dark:text-zinc-400">
              Notes (Optional)
            </label>
            <input
              type="text"
              className="input"
              value={editNotes}
              onChange={(e) => setEditNotes(e.target.value)}
            />
          </div>
          <div className="flex justify-end gap-3 mt-6">
            <button
              type="button"
              onClick={() => setEditingEntry(null)}
              className="btn bg-zinc-100 text-zinc-700 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={updateRevenue.isPending}
              className="btn btn-primary"
            >
              {updateRevenue.isPending ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
