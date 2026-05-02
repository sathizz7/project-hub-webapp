export const SHELL = {
  sidebarWidth: 240,
  topbarHeight: 56,
  railWidth: 320,
} as const;

export const RADII = {
  sm: 6,
  md: 8,
  lg: 12,
} as const;

export const PROJECT_TYPE_COLORS: Record<string, string> = {
  engineering: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200",
  research: "bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-200",
  data_science: "bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-200",
  design: "bg-pink-100 text-pink-800 dark:bg-pink-900/40 dark:text-pink-200",
  marketing: "bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-200",
  strategy: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-200",
  product: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200",
  operations: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200",
  hr: "bg-cyan-100 text-cyan-800 dark:bg-cyan-900/40 dark:text-cyan-200",
  legal: "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200",
  sales: "bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-200",
  finance: "bg-teal-100 text-teal-800 dark:bg-teal-900/40 dark:text-teal-200",
  mixed: "bg-violet-100 text-violet-800 dark:bg-violet-900/40 dark:text-violet-200",
};

export const PRIORITY_DOT: Record<string, string> = {
  low: "bg-slate-400",
  medium: "bg-blue-500",
  high: "bg-amber-500",
  critical: "bg-rose-600 animate-pulse",
};

export const STATUS_PILL: Record<string, string> = {
  active: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
  completed: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200",
  paused: "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
  killed: "bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-300",
};
