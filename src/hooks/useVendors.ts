import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useTenantId } from '@/lib/auth';
import imageCompression from 'browser-image-compression';
import type {
  WholesaleVendor,
  VendorTransaction,
  VendorInvoiceRequest,
  VendorPaymentRequest,
} from '@/lib/types';

export const vendorKeys = {
  all: ['vendors'] as const,
  transactions: (vendorId: string) => ['vendors', vendorId, 'transactions'] as const,
};

/** Fetch all wholesale vendors, ordered by name. */
export function useVendors() {
  const tenantId = useTenantId();

  return useQuery({
    queryKey: vendorKeys.all,
    queryFn: async (): Promise<WholesaleVendor[]> => {
      const { data, error } = await supabase
        .from('wholesale_vendors')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('name', { ascending: true });

      if (error) throw error;
      return data ?? [];
    },
  });
}

/** Fetch the full transaction history for a specific vendor. */
export function useVendorTransactions(vendorId: string | null) {
  const tenantId = useTenantId();

  return useQuery({
    queryKey: vendorKeys.transactions(vendorId ?? ''),
    queryFn: async (): Promise<VendorTransaction[]> => {
      if (!vendorId) return [];

      const { data, error } = await supabase
        .from('vendor_transactions')
        .select('*')
        .eq('vendor_id', vendorId)
        .eq('tenant_id', tenantId)
        .order('date', { ascending: false });

      if (error) throw error;
      return data ?? [];
    },
    enabled: !!vendorId,
  });
}

/** Mutation: create a new vendor (stamps tenant_id). */
export function useAddVendor() {
  const queryClient = useQueryClient();
  const tenantId = useTenantId();

  return useMutation({
    mutationFn: async (vendor: { name: string }) => {
      const { data, error } = await supabase
        .from('wholesale_vendors')
        .insert({ name: vendor.name, tenant_id: tenantId })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: vendorKeys.all });
    },
  });
}

/** Compression settings for attached receipt/invoice images. */
const IMAGE_COMPRESSION_OPTIONS = {
  maxSizeMB: 0.5,          // Raised to 0.5 MB for better compatibility
  maxWidthOrHeight: 1200,
  useWebWorker: false,      // Disabled — web worker causes hangs in many environments
};

/**
 * Compress (images only) and upload a file to Supabase Storage.
 * Returns the final stored path string.
 * Throws a clear error if the bucket or RLS blocks the upload.
 */
async function uploadTransactionDocument(
  file: File,
  tenantId: string,
  recordId: string
): Promise<string> {
  let fileToUpload: File | Blob = file;

  // Only compress images — skip PDFs
  if (file.type.startsWith('image/')) {
    try {
      fileToUpload = await imageCompression(file, IMAGE_COMPRESSION_OPTIONS);
    } catch (compressionErr) {
      console.warn('[Upload] Compression failed, uploading original:', compressionErr);
      fileToUpload = file; // Fall back to original if compression fails
    }
  }

  const timestamp = Date.now();
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const filePath = `${tenantId}/${recordId}/${timestamp}_${safeName}`;

  const { error } = await supabase.storage
    .from('transaction-documents')
    .upload(filePath, fileToUpload, {
      upsert: false,
      contentType: file.type || 'application/octet-stream',
    });

  if (error) {
    console.error('[Upload] Supabase storage error:', error);
    throw new Error(`Document upload failed: ${error.message}`);
  }

  return filePath;
}

/** Mutation: record an invoice — increases vendor's balance_owed (stamps tenant_id). */
export function useRecordInvoice() {
  const queryClient = useQueryClient();
  const tenantId = useTenantId();

  return useMutation({
    mutationFn: async (req: VendorInvoiceRequest) => {
      // 1. Insert the transaction record (return id for file path)
      const { data: txRecord, error: txErr } = await supabase
        .from('vendor_transactions')
        .insert({
          tenant_id: tenantId,
          vendor_id: req.vendorId,
          date: req.date,
          type: 'Invoice' as const,
          payment_method: null,
          amount: req.amount,
          notes: req.notes ?? null,
        })
        .select('id')
        .single();

      if (txErr || !txRecord) throw txErr ?? new Error('Failed to create transaction');

      // 2. If file provided — compress, upload, store path
      if (req.file) {
        const docPath = await uploadTransactionDocument(req.file, tenantId, txRecord.id);
        await supabase
          .from('vendor_transactions')
          .update({ document_path: docPath })
          .eq('id', txRecord.id);
      }

      // 3. Increment balance_owed
      const { data: vendor, error: fetchErr } = await supabase
        .from('wholesale_vendors')
        .select('balance_owed')
        .eq('id', req.vendorId)
        .eq('tenant_id', tenantId)
        .single();

      if (fetchErr || !vendor) throw fetchErr ?? new Error('Vendor not found');

      const newBalance = Number(vendor.balance_owed) + req.amount;

      const { error: updateErr } = await supabase
        .from('wholesale_vendors')
        .update({ balance_owed: newBalance })
        .eq('id', req.vendorId);

      if (updateErr) throw updateErr;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: vendorKeys.all });
      queryClient.invalidateQueries({ queryKey: vendorKeys.transactions(variables.vendorId) });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

/** Mutation: pay a vendor (stamps tenant_id on all inserts).
 *  - Cash: immediately deducts balance_owed.
 *  - Cheque: creates a Pending outbound_cheque; balance_owed is NOT deducted
 *    until the cheque is cleared via useClearCheque. */
export function usePayVendor() {
  const queryClient = useQueryClient();
  const tenantId = useTenantId();

  return useMutation({
    mutationFn: async (req: VendorPaymentRequest) => {
      if (req.method === 'Cash') {
        // ── Cash Payment ──
        // 1. Insert transaction (return id for file path)
        const { data: txRecord, error: txErr } = await supabase
          .from('vendor_transactions')
          .insert({
            tenant_id: tenantId,
            vendor_id: req.vendorId,
            date: req.date,
            type: 'Payment' as const,
            payment_method: 'Cash' as const,
            amount: req.amount,
          })
          .select('id')
          .single();

        if (txErr || !txRecord) throw txErr ?? new Error('Failed to create transaction');

        // 2. If file provided — compress, upload, store path
        if (req.file) {
          const docPath = await uploadTransactionDocument(req.file, tenantId, txRecord.id);
          await supabase
            .from('vendor_transactions')
            .update({ document_path: docPath })
            .eq('id', txRecord.id);
        }

        // 3. Deduct from balance_owed
        const { data: vendor, error: fetchErr } = await supabase
          .from('wholesale_vendors')
          .select('balance_owed')
          .eq('id', req.vendorId)
          .eq('tenant_id', tenantId)
          .single();

        if (fetchErr || !vendor) throw fetchErr ?? new Error('Vendor not found');

        const newBalance = Math.max(0, Number(vendor.balance_owed) - req.amount);

        const { error: updateErr } = await supabase
          .from('wholesale_vendors')
          .update({ balance_owed: newBalance })
          .eq('id', req.vendorId);

        if (updateErr) throw updateErr;
      } else {
        // ── Cheque Payment ──
        if (!req.chequeNumber) throw new Error('Cheque number is required for cheque payments');

        // 1. Create the outbound cheque as Pending
        const { data: cheque, error: chequeErr } = await supabase
          .from('outbound_cheques')
          .insert({
            tenant_id: tenantId,
            date: req.date,
            payee_name: req.vendorName,
            vendor_id: req.vendorId,
            amount: req.amount,
            cheque_number: req.chequeNumber,
            status: 'Pending' as const,
          })
          .select()
          .single();

        if (chequeErr || !cheque) throw chequeErr ?? new Error('Failed to create cheque');

        // 2. Insert transaction with cheque reference (return id for file path)
        const { data: txRecord, error: txErr } = await supabase
          .from('vendor_transactions')
          .insert({
            tenant_id: tenantId,
            vendor_id: req.vendorId,
            date: req.date,
            type: 'Payment' as const,
            payment_method: 'Cheque' as const,
            amount: req.amount,
            cheque_id: cheque.id,
          })
          .select('id')
          .single();

        if (txErr || !txRecord) throw txErr ?? new Error('Failed to create transaction');

        // 3. If file provided — compress, upload, store path
        if (req.file) {
          const docPath = await uploadTransactionDocument(req.file, tenantId, txRecord.id);
          await supabase
            .from('vendor_transactions')
            .update({ document_path: docPath })
            .eq('id', txRecord.id);
        }

        // Note: balance_owed is NOT decremented here.
        // It will be decremented when the cheque is cleared via useClearCheque.
      }
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: vendorKeys.all });
      queryClient.invalidateQueries({ queryKey: vendorKeys.transactions(variables.vendorId) });
      queryClient.invalidateQueries({ queryKey: ['cheques'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}
