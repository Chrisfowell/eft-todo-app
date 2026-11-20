import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from './supabase';
import type { Contact, Profile, Task } from './types';

/** Loads tasks, contacts and people, and keeps them live across phones. */
export function useData(userId: string | null) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [people, setPeople] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(async () => {
    if (!userId) return;
    const [t, c, p] = await Promise.all([
      supabase.from('tasks').select('*'),
      supabase.from('contacts').select('*'),
      supabase.from('profiles').select('id,name,email'),
    ]);
    if (t.error || c.error || p.error) {
      setError("Couldn't load your list. Check your signal and pull down to try again.");
    } else {
      setError(null);
      setTasks((t.data ?? []) as Task[]);
      setContacts((c.data ?? []) as Contact[]);
      setPeople((p.data ?? []) as Profile[]);
    }
    setLoading(false);
  }, [userId]);

  // Coalesce a burst of live changes into one reload.
  const soon = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(load, 300);
  }, [load]);

  useEffect(() => {
    if (!userId) return;
    load();
    const ch = supabase
      .channel('eft-todo-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, soon)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'contacts' }, soon)
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
      if (timer.current) clearTimeout(timer.current);
    };
  }, [userId, load, soon]);

  const addTask = useCallback(
    async (data: Partial<Task>) => {
      const { error: e } = await supabase.from('tasks').insert({ ...data, owner: userId });
      if (e) throw e;
      await load();
    },
    [userId, load],
  );

  const updateTask = useCallback(
    async (id: string, patch: Partial<Task>) => {
      setTasks((ts) => ts.map((t) => (t.id === id ? { ...t, ...patch } : t)));
      const { error: e } = await supabase.from('tasks').update(patch).eq('id', id);
      if (e) {
        await load();
        throw e;
      }
    },
    [load],
  );

  const deleteTask = useCallback(
    async (task: Task) => {
      setTasks((ts) => ts.filter((t) => t.id !== task.id));
      const { error: e } = await supabase.from('tasks').delete().eq('id', task.id);
      if (e) {
        await load();
        throw e;
      }
    },
    [load],
  );

  const restoreTask = useCallback(
    async (task: Task) => {
      const { error: e } = await supabase.from('tasks').insert(task);
      if (e) throw e;
      await load();
    },
    [load],
  );

  const saveContact = useCallback(
    async (c: Partial<Contact> & { name: string }) => {
      const { id, created_at, ...rest } = c;
      const res = id
        ? await supabase.from('contacts').update(rest).eq('id', id)
        : await supabase.from('contacts').insert(rest);
      if (res.error) throw res.error;
      await load();
    },
    [load],
  );

  const deleteContact = useCallback(
    async (id: string) => {
      const { error: e } = await supabase.from('contacts').delete().eq('id', id);
      if (e) throw e;
      await load();
    },
    [load],
  );

  return {
    tasks,
    contacts,
    people,
    loading,
    error,
    reload: load,
    addTask,
    updateTask,
    deleteTask,
    restoreTask,
    saveContact,
    deleteContact,
  };
}

export type Data = ReturnType<typeof useData>;
