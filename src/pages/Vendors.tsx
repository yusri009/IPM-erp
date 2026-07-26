import { useState, type FormEvent } from 'react';
import { Modal } from '@/components/Modal';
import { StatusBadge } from '@/components/StatusBadge';
import {
  useVendors,
  useAddVendor,
  useRecordInvoice,
  usePayVendor,
  useVendorTransactions,
} from '@/hooks/useVendors';
import type { WholesaleVendor, PaymentMethod } from '@/lib/types';

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

export default function Vendors() {
  const { data: vendors, isLoading } = useVendors();
  const addVendor = useAddVendor();
  const recordInvoice = useRecordInvoice();
  const payVendor = usePayVendor();

  // ── Add vendor form ──
  const [vendorName, setVendorName] = useState('');

  // ── Invoice modal ──
  const [invoiceModal, setInvoiceModal] = useState(false);
  const [invoiceVendor, setInvoiceVendor] = useState<WholesaleVendor | null>(null);
  const [invoiceAmount, setInvoiceAmount] = useState('');
  const [invoiceDate, setInvoiceDate] = useState(todayISO());
  const [invoiceNotes, setInvoiceNotes] = useState('');

  // ── Payment modal ──
  const [paymentModal, setPaymentModal] = useState(false);
  const [paymentVendor, setPaymentVendor] = useState<WholesaleVendor | null>(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentDate, setPaymentDate] = useState(todayISO());
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('Cash');
  const [paymentChequeNum, setPaymentChequeNum] = useState('');

  // ── Transaction history ──
  const [historyVendor, setHistoryVendor] = useState<WholesaleVendor | null>(null);
  const { data: transactions, isLoading: txLoading } = useVendorTransactions(
    historyVendor?.id ?? null
  );

  const handleAddVendor = (e: FormEvent) => {
    e.preventDefault();
    if (!vendorName.trim()) return;
    addVendor.mutate({ name: vendorName.trim() }, {
      onSuccess: () => setVendorName(''),
    });
  };

  const openInvoiceModal = (vendor: WholesaleVendor) => {
    setInvoiceVendor(vendor);
    setInvoiceAmount('');
    setInvoiceDate(todayISO());
    setInvoiceNotes('');
    setInvoiceModal(true);
  };

  const handleRecordInvoice = (e: FormEvent) => {
    e.preventDefault();
    if (!invoiceVendor || !invoiceAmount) return;

    recordInvoice.mutate(
      {
        vendorId: invoiceVendor.id,
        amount: parseFloat(invoiceAmount),
        date: invoiceDate,
        notes: invoiceNotes || undefined,
      },
      { onSuccess: () => setInvoiceModal(false) }
    );
  };

  const openPaymentModal = (vendor: WholesaleVendor) => {
    setPaymentVendor(vendor);
    setPaymentAmount('');
    setPaymentDate(todayISO());
    setPaymentMethod('Cash');
    setPaymentChequeNum('');
    setPaymentModal(true);
  };

  const handlePayVendor = (e: FormEvent) => {
    e.preventDefault();
    if (!paymentVendor || !paymentAmount) return;
    if (paymentMethod === 'Cheque' && !paymentChequeNum) return;

    payVendor.mutate(
      {
        vendorId: paymentVendor.id,
        vendorName: paymentVendor.name,
        amount: parseFloat(paymentAmount),
        date: paymentDate,
        method: paymentMethod,
        chequeNumber: paymentMethod === 'Cheque' ? paymentChequeNum : undefined,
      },
      { onSuccess: () => setPaymentModal(false) }
    );
  };

  return (
    <div className="space-y-8">
      {/* ── Page Header ── */}
      <div className="animate-fade-in-up">
        <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-100">Vendors</h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          Manage wholesale vendors, invoices, and payments
        </p>
      </div>

      {/* ── Add Vendor ── */}
      <div className="glass-card animate-fade-in-up p-6">
        <h2 className="mb-4 text-base font-semibold text-zinc-900 dark:text-zinc-200">
          <span className="mr-2 inline-block h-2 w-2 rounded-full bg-sky-400" />
          Add New Vendor
        </h2>
        <form onSubmit={handleAddVendor} className="flex gap-3">
          <input
            type="text"
            className="input flex-1"
            placeholder="Vendor name, e.g. Reliance Fresh Supply"
            value={vendorName}
            onChange={(e) => setVendorName(e.target.value)}
            required
          />
          <button type="submit" className="btn btn-primary" disabled={addVendor.isPending}>
            {addVendor.isPending ? 'Adding…' : 'Add Vendor'}
          </button>
        </form>
      </div>

      {/* ── Vendor Table ── */}
      <div className="glass-card animate-fade-in-up overflow-hidden p-6">
        <h2 className="mb-4 text-base font-semibold text-zinc-900 dark:text-zinc-200">
          <span className="mr-2 inline-block h-2 w-2 rounded-full bg-sky-400" />
          Wholesale Vendors
        </h2>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <span className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-zinc-600 border-t-zinc-300" />
          </div>
        ) : !vendors?.length ? (
          <div className="py-12 text-center text-sm text-zinc-500 dark:text-zinc-400">
            No vendors registered yet. Add one above.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Vendor Name</th>
                  <th>Balance Owed</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {vendors.map((vendor) => (
                  <tr key={vendor.id}>
                    <td className="font-medium text-zinc-900 dark:text-zinc-200">{vendor.name}</td>
                    <td>
                      <span
                        className={`font-semibold ${vendor.balance_owed > 0 ? 'text-rose-400' : 'text-emerald-400'
                          }`}
                      >
                        {formatCurrency(vendor.balance_owed)}
                      </span>
                    </td>
                    <td>
                      <div className="flex justify-end gap-2">
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() => {
                            setHistoryVendor(
                              historyVendor?.id === vendor.id ? null : vendor
                            );
                          }}
                        >
                          {historyVendor?.id === vendor.id ? 'Hide History' : 'History'}
                        </button>
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() => openInvoiceModal(vendor)}
                        >
                          + Invoice
                        </button>
                        <button
                          className="btn btn-primary btn-sm"
                          onClick={() => openPaymentModal(vendor)}
                        >
                          Make Payment
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Transaction History (expandable) ── */}
      {historyVendor && (
        <div className="glass-card animate-fade-in-up overflow-hidden p-6">
          <h2 className="mb-4 text-base font-semibold text-zinc-900 dark:text-zinc-200">
            <span className="mr-2 inline-block h-2 w-2 rounded-full bg-violet-400" />
            Transaction History — {historyVendor.name}
          </h2>

          {txLoading ? (
            <div className="flex items-center justify-center py-8">
              <span className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-zinc-600 border-t-zinc-300" />
            </div>
          ) : !transactions?.length ? (
            <div className="py-8 text-center text-sm text-zinc-500 dark:text-zinc-400">
              No transactions recorded yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Type</th>
                    <th>Method</th>
                    <th>Amount</th>
                    <th>Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((tx) => (
                    <tr key={tx.id}>
                      <td className="text-zinc-600 dark:text-zinc-400">{tx.date}</td>
                      <td>
                        <StatusBadge
                          status={tx.type === 'Invoice' ? 'Bounced' : 'Cleared'}
                        />
                        <span className="ml-2 text-sm text-zinc-700 dark:text-zinc-300">{tx.type}</span>
                      </td>
                      <td className="text-zinc-600 dark:text-zinc-400">{tx.payment_method ?? '—'}</td>
                      <td
                        className={`font-semibold ${tx.type === 'Invoice' ? 'text-rose-400' : 'text-emerald-400'
                          }`}
                      >
                        {tx.type === 'Invoice' ? '+' : '-'}
                        {formatCurrency(tx.amount)}
                      </td>
                      <td className="text-zinc-500 dark:text-zinc-400">{tx.notes ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── Record Invoice Modal ── */}
      <Modal
        open={invoiceModal}
        onClose={() => setInvoiceModal(false)}
        title={`Record Invoice — ${invoiceVendor?.name ?? ''}`}
      >
        <form onSubmit={handleRecordInvoice} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-zinc-500 dark:text-zinc-400">Date</label>
              <input
                type="date"
                className="input"
                value={invoiceDate}
                onChange={(e) => setInvoiceDate(e.target.value)}
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
                value={invoiceAmount}
                onChange={(e) => setInvoiceAmount(e.target.value)}
                required
              />
            </div>
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-zinc-500 dark:text-zinc-400">Notes (optional)</label>
            <input
              type="text"
              className="input"
              placeholder="e.g. Rice 50kg, Oil 20L"
              value={invoiceNotes}
              onChange={(e) => setInvoiceNotes(e.target.value)}
            />
          </div>
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              className="btn btn-secondary flex-1"
              onClick={() => setInvoiceModal(false)}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary flex-1"
              disabled={recordInvoice.isPending}
            >
              {recordInvoice.isPending ? 'Recording…' : 'Record Invoice'}
            </button>
          </div>
        </form>
      </Modal>

      {/* ── Make Payment Modal ── */}
      <Modal
        open={paymentModal}
        onClose={() => setPaymentModal(false)}
        title={`Pay Vendor — ${paymentVendor?.name ?? ''}`}
      >
        <form onSubmit={handlePayVendor} className="space-y-4">
          {/* Current balance display */}
          {paymentVendor && (
            <div className="rounded-lg bg-zinc-100 dark:bg-zinc-800/50 p-3 text-sm">
              <span className="text-zinc-600 dark:text-zinc-400">Outstanding balance: </span>
              <span className="font-semibold text-rose-500 dark:text-rose-400">
                {formatCurrency(paymentVendor.balance_owed)}
              </span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-zinc-500 dark:text-zinc-400">Date</label>
              <input
                type="date"
                className="input"
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
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
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
                required
              />
            </div>
          </div>

          {/* Payment method toggle */}
          <div>
            <label className="mb-2 block text-xs font-medium text-zinc-500 dark:text-zinc-400">Payment Method</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <button
                type="button"
                className={`rounded-lg border px-4 py-2.5 text-sm font-medium transition-all ${paymentMethod === 'Cash'
                    ? 'border-emerald-500/50 bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400 shadow-sm dark:shadow-[0_0_12px_oklch(0.72_0.19_160/0.1)]'
                    : 'border-zinc-200 bg-zinc-50 text-zinc-600 hover:border-zinc-300 dark:border-zinc-700 dark:bg-zinc-800/50 dark:text-zinc-400 dark:hover:border-zinc-600'
                  }`}
                onClick={() => setPaymentMethod('Cash')}
              >
                💵 Direct Cash
              </button>
              <button
                type="button"
                className={`rounded-lg border px-4 py-2.5 text-sm font-medium transition-all ${paymentMethod === 'Cheque'
                    ? 'border-amber-500/50 bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400 shadow-sm dark:shadow-[0_0_12px_oklch(0.8_0.16_85/0.1)]'
                    : 'border-zinc-200 bg-zinc-50 text-zinc-600 hover:border-zinc-300 dark:border-zinc-700 dark:bg-zinc-800/50 dark:text-zinc-400 dark:hover:border-zinc-600'
                  }`}
                onClick={() => setPaymentMethod('Cheque')}
              >
                📝 Cheque
              </button>
            </div>
          </div>

          {/* Cheque number field (conditional) */}
          {paymentMethod === 'Cheque' && (
            <div className="animate-fade-in-up">
              <label className="mb-1.5 block text-xs font-medium text-zinc-500 dark:text-zinc-400">Cheque Number</label>
              <input
                type="text"
                className="input"
                placeholder="e.g. 004521"
                value={paymentChequeNum}
                onChange={(e) => setPaymentChequeNum(e.target.value)}
                required
              />
              <p className="mt-1.5 text-xs text-amber-500/80">
                ⚠ Cheque will be added as "Pending". Balance won't deduct until cleared.
              </p>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              className="btn btn-secondary flex-1"
              onClick={() => setPaymentModal(false)}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary flex-1"
              disabled={payVendor.isPending}
            >
              {payVendor.isPending ? 'Processing…' : 'Submit Payment'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
