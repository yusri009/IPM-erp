import type { ReactNode } from 'react';

interface MetricCardProps {
  label: string;
  value: string;
  icon: ReactNode;
  accent: 'emerald' | 'blue' | 'amber' | 'rose';
}

const accentStyles: Record<MetricCardProps['accent'], { text: string; glow: string; iconBg: string }> = {
  emerald: {
    text: 'text-emerald-600 dark:text-emerald-400',
    glow: 'glow-emerald',
    iconBg: 'bg-emerald-100/50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400',
  },
  blue: {
    text: 'text-sky-600 dark:text-sky-400',
    glow: 'glow-blue',
    iconBg: 'bg-sky-100/50 text-sky-600 dark:bg-sky-500/10 dark:text-sky-400',
  },
  amber: {
    text: 'text-amber-600 dark:text-amber-400',
    glow: 'glow-amber',
    iconBg: 'bg-amber-100/50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400',
  },
  rose: {
    text: 'text-rose-600 dark:text-rose-400',
    glow: 'glow-rose',
    iconBg: 'bg-rose-100/50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400',
  },
};

export function MetricCard({ label, value, icon, accent }: MetricCardProps) {
  const styles = accentStyles[accent];

  return (
    <div className={`glass-card ${styles.glow} p-6 animate-fade-in-up`}>
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">{label}</p>
          <p className={`text-3xl font-bold tracking-tight ${styles.text}`}>
            {value}
          </p>
        </div>
        <div className={`rounded-xl p-3 ${styles.iconBg}`}>
          {icon}
        </div>
      </div>
    </div>
  );
}
