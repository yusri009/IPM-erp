import type { ReactNode } from 'react';

interface MetricCardProps {
  label: string;
  value: string;
  icon: ReactNode;
  accent: 'emerald' | 'blue' | 'amber' | 'rose' | 'teal' | 'orange' | 'violet' | 'indigo';
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
  teal: {
    text: 'text-teal-600 dark:text-teal-400',
    glow: 'glow-teal',
    iconBg: 'bg-teal-100/50 text-teal-600 dark:bg-teal-500/10 dark:text-teal-400',
  },
  orange: {
    text: 'text-orange-600 dark:text-orange-400',
    glow: 'glow-orange',
    iconBg: 'bg-orange-100/50 text-orange-600 dark:bg-orange-500/10 dark:text-orange-400',
  },
  violet: {
    text: 'text-violet-600 dark:text-violet-400',
    glow: 'glow-violet',
    iconBg: 'bg-violet-100/50 text-violet-600 dark:bg-violet-500/10 dark:text-violet-400',
  },
  indigo: {
    text: 'text-indigo-600 dark:text-indigo-400',
    glow: 'glow-indigo',
    iconBg: 'bg-indigo-100/50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400',
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
