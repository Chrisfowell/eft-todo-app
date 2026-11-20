import { ESCALATE_DAYS } from './config';
import type { Contact, Priority, Task, TaskType } from './types';

export const TYPES: { key: TaskType; label: string; light: string; dark: string }[] = [
  { key: 'quote', label: 'Quote', light: '#1f63c6', dark: '#6ea8ff' },
  { key: 'ce', label: 'C&E', light: '#7a45d1', dark: '#b593ff' },
  { key: 'fault', label: 'Fault', light: '#b86a00', dark: '#f0a540' },
  { key: 'install', label: 'Install', light: '#0d7f86', dark: '#45c6cd' },
  { key: 'service', label: 'Service', light: '#2e7d4f', dark: '#5cc58a' },
  { key: 'survey', label: 'Survey', light: '#b0306f', dark: '#f07aaf' },
  { key: 'meeting', label: 'Meeting', light: '#3949ab', dark: '#8c9eff' },
  { key: 'other', label: 'Other', light: '#626468', dark: '#9a9ea5' },
];

export const typeOf = (k: string) => TYPES.find((t) => t.key === k) ?? TYPES[TYPES.length - 1];

const PRI: Priority[] = ['high', 'normal', 'low'];
const RANK: Record<Priority, number> = { high: 0, normal: 1, low: 2 };

const pad = (n: number) => String(n).padStart(2, '0');
export const ymd = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const today = () => ymd(new Date());

export function weekStart(): number {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return d.getTime();
}

export function ageDays(t: Task): number {
  const c = Date.parse(t.created_at);
  if (Number.isNaN(c)) return 0;
  return Math.max(0, Math.floor((Date.now() - c) / 86400000));
}

export const isOverdue = (t: Task) => !t.done && !!t.due && t.due < today();

/** Priority after ageing: one level up per ESCALATE_DAYS open; overdue goes straight to high. */
export function effPri(t: Task): Priority {
  const base = t.priority || 'normal';
  if (t.done) return base;
  if (isOverdue(t)) return 'high';
  return PRI[Math.max(0, RANK[base] - Math.floor(ageDays(t) / ESCALATE_DAYS))];
}

export const raised = (t: Task) => !t.done && effPri(t) !== (t.priority || 'normal');
export const raiseWhy = (t: Task) => (isOverdue(t) ? 'overdue' : `${ageDays(t)} days old`);

export function sortTasks(list: Task[]): Task[] {
  return list.slice().sort((a, b) => {
    if (a.done !== b.done) return a.done ? 1 : -1;
    if (a.done) return Date.parse(b.done_at ?? '0') - Date.parse(a.done_at ?? '0');
    const da = a.due ?? '9999', db = b.due ?? '9999';
    if (da !== db) return da < db ? -1 : 1;
    const pa = RANK[effPri(a)], pb = RANK[effPri(b)];
    if (pa !== pb) return pa - pb;
    return Date.parse(a.created_at) - Date.parse(b.created_at);
  });
}

export function fmtDue(d: string): string {
  try {
    return new Date(`${d}T12:00:00`).toLocaleDateString('en-GB', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    });
  } catch {
    return d;
  }
}

/** The contact picked on the task, or one whose full name appears in it. */
export function contactFor(t: Task, contacts: Contact[]): Contact | null {
  if (t.contact_id) {
    const k = contacts.find((c) => c.id === t.contact_id);
    if (k) return k;
  }
  const hay = [t.title, t.notes, t.job].join(' ').toLowerCase();
  return (
    contacts.find((c) => c.name && c.name.trim().length > 2 && hay.includes(c.name.trim().toLowerCase())) ??
    null
  );
}

export const initials = (n: string) =>
  (n || '?')
    .trim()
    .split(/\s+/)
    .map((s) => s[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
