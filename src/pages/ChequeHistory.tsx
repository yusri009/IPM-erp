import { useState, type FormEvent } from 'react';
import { useCheques, useUpdateCheque, useReverseCheque, useClearCheque, useDeleteCheque } from '@/hooks/useCheques';
import { Modal } from '@/components/Modal';
import type { OutboundCheque } from '@/lib/types';

export default function ChequeHistory() {
  const [activeTab, setActiveTab] = useState<'Pending' | 'Cleared'>('Pending');

  const { data: cheques, isLoading } = useCheques(activeTab);

  const updateCheque = useUpdateCheque();
  const reverseCheque = useReverseCheque();
  const clearCheque = useClearCheque();
  const deleteCheque = useDeleteCheque();

  // Edit Modal State
  const [editingCheque, setEditingCheque] = useState<OutboundCheque | null>(null);
  const [editAmount, setEditAmount] = useState('');

  // Reverse Modal State
  const [reversingCheque, setReversingCheque] = useState<OutboundCheque | null>(null);

  const handleEditClick = (cheque: OutboundCheque) => {
    setEditingCheque(cheque);
    setEditAmount(cheque.amount.toString());
  };

  const handleUpdate = (e: FormEvent) => {
    e.preventDefault();
    if (!editingCheque) return;

    updateCheque.mutate(
      {
        id: editingCheque.id,
        updates: {
          amount: parseFloat(editAmount),
        },
      },
      {
        onSuccess: () => {
          setEditingCheque(null);
        },
      }
    );
  };

  const handleDelete = () => {
    if (!editingCheque) return;
    if (window.confirm(`Are you sure you want to delete cheque #${editingCheque.cheque_number} for ${editingCheque.payee_name}?`)) {
      deleteCheque.mutate(editingCheque.id, {
        onSuccess: () => {
          setEditingCheque(null);
        }
      });
    }
  };

  const handleReverse = () => {
    if (!reversingCheque) return;

    reverseCheque.mutate(reversingCheque.id, {
      onSuccess: () => {
        setReversingCheque(null);
      }
    });
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
      <header className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">Cheques</h2>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Manage your issued cheques and their statuses.
          </p>
        </div>

        {/* Tabs */}
        <div className="flex p-1 bg-zinc-100 dark:bg-zinc-800/60 rounded-lg shrink-0">
          <button
            onClick={() => setActiveTab('Pending')}
            className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${activeTab === 'Pending'
                ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 shadow-sm'
                : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300'
              }`}
          >
            Pending
          </button>
          <button
            onClick={() => setActiveTab('Cleared')}
            className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${activeTab === 'Cleared'
                ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 shadow-sm'
                : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300'
              }`}
          >
            Cleared
          </button>
        </div>
      </header>

      <div className="glass-card overflow-hidden rounded-2xl shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-zinc-200/60 bg-zinc-50/50 dark:border-zinc-800/60 dark:bg-zinc-900/50">
                <th className="px-6 py-4 font-medium text-zinc-600 dark:text-zinc-300">Date</th>
                <th className="px-6 py-4 font-medium text-zinc-600 dark:text-zinc-300">Cheque Number</th>
                <th className="px-6 py-4 font-medium text-zinc-600 dark:text-zinc-300">Payee</th>
                <th className="px-6 py-4 font-medium text-zinc-600 dark:text-zinc-300">Amount</th>
                <th className="px-6 py-4 font-medium text-zinc-600 dark:text-zinc-300 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200/60 dark:divide-zinc-800/60">
              {cheques?.map((cheque) => (
                <tr key={cheque.id} className="transition-colors hover:bg-zinc-50/50 dark:hover:bg-zinc-800/30">
                  <td className="px-6 py-4 text-zinc-700 dark:text-zinc-300">
                    {new Date(cheque.date).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 text-zinc-700 dark:text-zinc-300 font-mono text-xs">
                    {cheque.cheque_number}
                  </td>
                  <td className="px-6 py-4 text-zinc-700 dark:text-zinc-300 font-medium">
                    {cheque.payee_name}
                  </td>
                  <td className="px-6 py-4 font-medium text-sky-600 dark:text-sky-400">
                    Rs. {cheque.amount.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 text-right">
                    {activeTab === 'Pending' ? (
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => handleEditClick(cheque)}
                          className="btn btn-sm bg-emerald-50 text-emerald-600 hover:bg-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-400 dark:hover:bg-emerald-500/20 border-transparent shadow-none"
                        >
                          Edit Amount
                        </button>
                        <button
                          disabled={clearCheque.isPending}
                          onClick={() => {
                            if (window.confirm(`Are you sure you want to mark cheque #${cheque.cheque_number} for ${cheque.payee_name} as cleared?`)) {
                              clearCheque.mutate(cheque.id);
                            }
                          }}
                          className="btn btn-sm bg-sky-50 text-sky-600 hover:bg-sky-100 dark:bg-sky-500/10 dark:text-sky-400 dark:hover:bg-sky-500/20 border-transparent shadow-none"
                        >
                          Mark Cleared
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setReversingCheque(cheque)}
                        className="btn btn-sm bg-amber-50 text-amber-600 hover:bg-amber-100 dark:bg-amber-500/10 dark:text-amber-500 dark:hover:bg-amber-500/20 border-transparent shadow-none"
                      >
                        Reverse
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {(!cheques || cheques.length === 0) && (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-zinc-500">
                    No {activeTab.toLowerCase()} cheques found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Amount Modal (For Pending Cheques) */}
      <Modal open={!!editingCheque} onClose={() => setEditingCheque(null)} title="Edit Cheque Amount">
        <form onSubmit={handleUpdate} className="space-y-4">
          {editingCheque && (
            <div className="mb-4 text-sm text-zinc-500 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800/50 p-3 rounded-xl">
              Editing cheque <strong>#{editingCheque.cheque_number}</strong> for <strong>{editingCheque.payee_name}</strong>
            </div>
          )}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-zinc-500 dark:text-zinc-400">
              New Amount (Rs.)
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
          <div className="flex justify-between items-center mt-6">
            <button
              type="button"
              onClick={handleDelete}
              disabled={deleteCheque.isPending}
              className="btn bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-500/10 dark:text-red-500 dark:hover:bg-red-500/20 border-transparent shadow-none"
            >
              {deleteCheque.isPending ? 'Deleting...' : 'Delete Cheque'}
            </button>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setEditingCheque(null)}
                className="btn bg-zinc-100 text-zinc-700 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={updateCheque.isPending || deleteCheque.isPending}
                className="btn btn-primary"
              >
                {updateCheque.isPending ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </form>
      </Modal>

      {/* Reverse Confirmation Modal (For Cleared Cheques) */}
      <Modal open={!!reversingCheque} onClose={() => setReversingCheque(null)} title="Reverse Cleared Cheque">
        <div className="space-y-4">
          <div className="text-sm text-zinc-600 dark:text-zinc-400">
            Are you sure you want to reverse this cheque back to <strong>Pending (Pending)</strong>?
          </div>
          {reversingCheque?.vendor_id && (
            <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg text-sm text-amber-800 dark:text-amber-200">
              <strong>Note:</strong> This cheque is linked to a vendor. Reversing it will automatically restore Rs. {reversingCheque.amount.toLocaleString()} back to the vendor's balance owed.
            </div>
          )}
          <div className="flex justify-end gap-3 mt-6">
            <button
              type="button"
              onClick={() => setReversingCheque(null)}
              className="btn bg-zinc-100 text-zinc-700 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleReverse}
              disabled={reverseCheque.isPending}
              className="btn bg-amber-500 hover:bg-amber-600 text-white border-transparent"
            >
              {reverseCheque.isPending ? 'Reversing...' : 'Confirm Reverse'}
            </button>
          </div>
        </div>
      </Modal>

    </div>
  );
}
