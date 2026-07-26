import type { ChequeStatus } from '@/lib/types';

interface StatusBadgeProps {
  status: ChequeStatus;
}

const statusConfig: Record<ChequeStatus, { bg: string; text: string; dot: string }> = {
  Pending: {
    bg: 'bg-amber-500/10',
    text: 'text-amber-400',
    dot: 'bg-amber-400',
  },
  Cleared: {
    bg: 'bg-emerald-500/10',
    text: 'text-emerald-400',
    dot: 'bg-emerald-400',
  },
  Bounced: {
    bg: 'bg-rose-500/10',
    text: 'text-rose-400',
    dot: 'bg-rose-400',
  },
};

export function StatusBadge({ status }: StatusBadgeProps) {
  const config = statusConfig[status];

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${config.bg} ${config.text}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${config.dot}`} />
      {status}
    </span>
  );
}
