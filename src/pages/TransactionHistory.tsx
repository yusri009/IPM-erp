import { useState } from 'react';
import { useTransactions, useTransactionDocumentUrl } from '@/hooks/useTransactions';
import { useVendors } from '@/hooks/useVendors';

/** Fetches a signed URL on-demand and opens it in a new tab or shows it in a modal. */
function DocumentButton({ path }: { path: string }) {
  const [open, setOpen] = useState(false);
  const { data: url, isLoading } = useTransactionDocumentUrl(open ? path : null);

  const handleClick = () => {
    setOpen(true);
  };

  // Once URL is ready, open in new tab and reset
  if (open && url) {
    window.open(url, '_blank', 'noopener,noreferrer');
    setOpen(false);
  }

  return (
    <button
      onClick={handleClick}
      disabled={isLoading}
      className="btn btn-sm bg-violet-50 text-violet-600 hover:bg-violet-100 dark:bg-violet-500/10 dark:text-violet-400 dark:hover:bg-violet-500/20 border-transparent shadow-none"
    >
      {isLoading ? '…' : 'View Doc'}
    </button>
  );
}

export default function TransactionHistory() {
  const [filterVendorId, setFilterVendorId] = useState('');
  const [filterDate, setFilterDate] = useState('');

  const { data: transactions, isLoading } = useTransactions(
    filterVendorId || undefined,
    filterDate || undefined
  );
  
  const { data: vendors } = useVendors();

  const clearFilters = () => {
    setFilterVendorId('');
    setFilterDate('');
  };

  return (
    <div className="animate-fade-in-up space-y-6">
      <header className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">Transaction History</h2>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Audit trail of all vendor invoices and payments.
          </p>
        </div>
      </header>

      {/* ── Filters ── */}
      <div className="glass-card p-6 rounded-2xl flex flex-col sm:flex-row items-end gap-4">
        <div className="w-full sm:w-1/3">
          <label className="mb-1.5 block text-xs font-medium text-zinc-500 dark:text-zinc-400">
            Filter by Date
          </label>
          <input
            type="date"
            className="input w-full"
            value={filterDate}
            onChange={(e) => setFilterDate(e.target.value)}
          />
        </div>
        <div className="w-full sm:w-1/3">
          <label className="mb-1.5 block text-xs font-medium text-zinc-500 dark:text-zinc-400">
            Filter by Vendor
          </label>
          <select
            className="input w-full bg-white dark:bg-zinc-800"
            value={filterVendorId}
            onChange={(e) => setFilterVendorId(e.target.value)}
          >
            <option value="">All Vendors</option>
            {vendors?.map((v) => (
              <option key={v.id} value={v.id}>
                {v.name}
              </option>
            ))}
          </select>
        </div>
        {(filterDate || filterVendorId) && (
          <div>
            <button
              onClick={clearFilters}
              className="btn btn-secondary"
            >
              Clear Filters
            </button>
          </div>
        )}
      </div>

      {/* ── Transactions Table ── */}
      <div className="glass-card overflow-hidden rounded-2xl shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-zinc-200/60 bg-zinc-50/50 dark:border-zinc-800/60 dark:bg-zinc-900/50">
                <th className="px-6 py-4 font-medium text-zinc-600 dark:text-zinc-300">Date</th>
                <th className="px-6 py-4 font-medium text-zinc-600 dark:text-zinc-300">Vendor Name</th>
                <th className="px-6 py-4 font-medium text-zinc-600 dark:text-zinc-300">Type</th>
                <th className="px-6 py-4 font-medium text-zinc-600 dark:text-zinc-300">Method</th>
                <th className="px-6 py-4 font-medium text-zinc-600 dark:text-zinc-300 text-right">Amount</th>
                <th className="px-6 py-4 font-medium text-zinc-600 dark:text-zinc-300">Notes</th>
                <th className="px-6 py-4 font-medium text-zinc-600 dark:text-zinc-300">Doc</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200/60 dark:divide-zinc-800/60">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-zinc-500">
                    <span className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-zinc-600 border-t-zinc-300" />
                  </td>
                </tr>
              ) : !transactions?.length ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-zinc-500">
                    No transactions found for the selected filters.
                  </td>
                </tr>
              ) : (
                transactions.map((txn) => (
                  <tr key={txn.id} className="transition-colors hover:bg-zinc-50/50 dark:hover:bg-zinc-800/30">
                    <td className="px-6 py-4 text-zinc-700 dark:text-zinc-300">
                      {new Date(txn.date).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-zinc-900 dark:text-zinc-100 font-medium">
                      {txn.wholesale_vendors?.name ?? 'Unknown Vendor'}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                          txn.type === 'Invoice'
                            ? 'bg-rose-100 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400'
                            : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400'
                        }`}
                      >
                        {txn.type}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-zinc-700 dark:text-zinc-300">
                      {txn.payment_method || '-'}
                    </td>
                    <td className="px-6 py-4 text-right font-medium text-zinc-900 dark:text-zinc-100">
                      Rs. {txn.amount.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-zinc-500 dark:text-zinc-400 max-w-[200px] truncate">
                      {txn.notes || '-'}
                    </td>
                    <td className="px-6 py-4">
                      {txn.document_path ? (
                        <DocumentButton path={txn.document_path} />
                      ) : (
                        <span className="text-xs text-zinc-400">—</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
