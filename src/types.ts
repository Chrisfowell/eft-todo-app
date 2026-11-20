export type Section = 'work' | 'personal';
export type Priority = 'high' | 'normal' | 'low';
export type TaskType =
  | 'quote'
  | 'ce'
  | 'fault'
  | 'install'
  | 'service'
  | 'survey'
  | 'meeting'
  | 'other';

export interface Task {
  id: string;
  section: Section;
  owner: string | null;
  title: string;
  type: TaskType;
  job: string;
  due: string | null; // YYYY-MM-DD
  due_time: string; // HH:MM or ''
  priority: Priority;
  notes: string;
  contact_id: string | null;
  assignees: string[];
  done: boolean;
  done_at: string | null;
  created_at: string;
}

export interface Contact {
  id: string;
  name: string;
  company: string;
  role: string;
  phone: string;
  email: string;
  notes: string;
  created_at?: string;
}

export interface Profile {
  id: string;
  name: string;
  email: string | null;
}

export type Filter = 'today' | 'open' | 'week' | 'done' | 'contacts';
