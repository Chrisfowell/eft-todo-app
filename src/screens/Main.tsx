import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AddTask } from '../components/AddTask';
import { Briefing } from '../components/Briefing';
import { Confetti } from '../components/Confetti';
import { ContactsView } from '../components/ContactsView';
import { TaskCard } from '../components/TaskCard';
import { TaskEditor } from '../components/TaskEditor';
import { Toast, ToastState } from '../components/Toast';
import { ageDays, contactFor, effPri, sortTasks, today, typeOf, weekStart } from '../logic';
import { supabase } from '../supabase';
import { useColors } from '../theme';
import type { Filter, Section, Task } from '../types';
import { Btn, Field, SectionHeading } from '../ui';
import { useData } from '../useData';

const PREFS = 'eft-todo-prefs';

export function Main({ userId }: { userId: string }) {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const data = useData(userId);
  const [section, setSection] = useState<Section>('work');
  const [filter, setFilter] = useState<Filter>('open');
  const [scope, setScope] = useState<'mine' | 'all'>('mine');
  const [group, setGroup] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [briefHidden, setBriefHidden] = useState<string>(''); // "<section>-<date>" when hidden
  const [query, setQuery] = useState('');
  const [editing, setEditing] = useState<Task | null>(null);
  const [toast, setToast] = useState<ToastState | null>(null);
  const [confetti, setConfetti] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const loaded = useRef(false);

  // Remember view choices on this phone.
  useEffect(() => {
    AsyncStorage.getItem(PREFS)
      .then((raw) => {
        if (!raw) return;
        const p = JSON.parse(raw);
        if (p.section) setSection(p.section);
        if (p.filter) setFilter(p.filter);
        if (p.scope) setScope(p.scope);
        if (typeof p.group === 'boolean') setGroup(p.group);
        if (typeof p.addOpen === 'boolean') setAddOpen(p.addOpen);
        if (typeof p.briefHidden === 'string') setBriefHidden(p.briefHidden);
      })
      .catch(() => {})
      .finally(() => {
        loaded.current = true;
      });
  }, []);
  useEffect(() => {
    if (!loaded.current) return;
    AsyncStorage.setItem(PREFS, JSON.stringify({ section, filter, scope, group, addOpen, briefHidden })).catch(() => {});
  }, [section, filter, scope, group, addOpen, briefHidden]);

  const showToast = useCallback((msg: string, undo?: () => void) => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ msg, undo });
    toastTimer.current = setTimeout(() => setToast(null), 6000);
  }, []);

  const confettiDone = useCallback(() => {}, []);
  const me = userId;
  const t = today();
  const ws = weekStart();

  // Tasks in this section that belong to "my" view.
  const sectionTasks = useMemo(() => {
    const inSection = data.tasks.filter((x) => x.section === section);
    if (section === 'personal' || scope === 'all') return inSection;
    return inSection.filter((x) => x.owner === me || (x.assignees ?? []).includes(me));
  }, [data.tasks, section, scope, me]);

  const open = sectionTasks.filter((x) => !x.done);
  const dueCount = open.filter((x) => x.due && x.due <= t).length;
  const doneWeek = sectionTasks.filter((x) => x.done && Date.parse(x.done_at ?? '0') >= ws).length;

  const toggle = async (task: Task) => {
    const nowDone = !task.done;
    try {
      await data.updateTask(task.id, { done: nowDone, done_at: nowDone ? new Date().toISOString() : null });
      if (nowDone) {
        const left = sectionTasks.filter((x) => !x.done && x.id !== task.id).length;
        if (left === 0) {
          setConfetti((n) => n + 1);
          showToast('List cleared. Nice work!');
        } else showToast('Ticked off');
      }
    } catch {
      showToast("Couldn't save that. Check your signal and try again.");
    }
  };

  const remove = async (task: Task) => {
    setEditing(null);
    try {
      await data.deleteTask(task);
      showToast('Task deleted', async () => {
        setToast(null);
        try {
          await data.restoreTask(task);
        } catch {
          showToast("Couldn't bring that task back.");
        }
      });
    } catch {
      showToast("Couldn't delete that task. Try again.");
    }
  };

  const add = async (task: Partial<Task>) => {
    try {
      await data.addTask(task);
      if (filter === 'done' || filter === 'week' || filter === 'contacts') setFilter('open');
      return true;
    } catch {
      showToast("Couldn't add that task. Check your signal and try again.");
      return false;
    }
  };

  const save = async (id: string, patch: Partial<Task>) => {
    setEditing(null);
    try {
      await data.updateTask(id, patch);
    } catch {
      showToast("Couldn't save that change. Try again.");
    }
  };

  const account = () => {
    const p = data.people.find((x) => x.id === me);
    Alert.alert(p?.name || 'Your account', p?.email ?? '', [
      { text: 'Close', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: () => supabase.auth.signOut() },
    ]);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await data.reload();
    setRefreshing(false);
  };

  // ----- what to list -----
  const q = query.trim().toLowerCase();
  let shown: Task[] = [];
  if (q) {
    shown = sectionTasks.filter((x) => {
      const k = contactFor(x, data.contacts);
      return [x.title, x.job, x.notes, k?.name, k?.phone, k?.email, typeOf(x.type).label].some((v) =>
        v?.toLowerCase().includes(q),
      );
    });
  } else if (filter === 'done') shown = sectionTasks.filter((x) => x.done);
  else if (filter === 'today') shown = open.filter((x) => (x.due && x.due <= t) || effPri(x) === 'high');
  else shown = open;
  shown = sortTasks(shown);

  const card = (x: Task, inGroup = false) => (
    <TaskCard
      key={x.id}
      task={x}
      contacts={data.contacts}
      people={data.people}
      me={me}
      showJob={!inGroup}
      showFrom={scope === 'all'}
      onToggle={toggle}
      onDelete={remove}
      onOpen={setEditing}
      onCopied={() => showToast('Copied')}
    />
  );

  const briefKey = `${section}-${t}`;

  const renderList = () => {
    if (data.loading) return <Empty text="Loading your list…" />;
    if (filter === 'contacts' && !q)
      return (
        <ContactsView
          contacts={data.contacts}
          tasks={data.tasks}
          query={query}
          onSave={data.saveContact}
          onDelete={data.deleteContact}
          onToast={(m) => showToast(m)}
        />
      );
    if (filter === 'week' && !q) return renderWeek();
    const brief =
      !q && (filter === 'open' || filter === 'today') ? (
        <Briefing
          tasks={sectionTasks}
          section={section}
          hidden={briefHidden === briefKey}
          onToggleHidden={() => setBriefHidden(briefHidden === briefKey ? '' : briefKey)}
        />
      ) : null;
    if (!shown.length)
      return (
        <>
          {brief}
          <Empty
            text={
              q
                ? `No tasks match "${query.trim()}".`
                : filter === 'done'
                  ? 'Nothing ticked off yet.'
                  : filter === 'today'
                    ? 'Nothing due today and no high-priority jobs. Nice.'
                    : 'All clear. Tap "Add a task" to add one.'
            }
          />
        </>
      );
    if (group && !q) {
      const groups = new Map<string, Task[]>();
      shown.forEach((x) => {
        const k = x.job.trim() || 'No job set';
        groups.set(k, [...(groups.get(k) ?? []), x]);
      });
      const keys = [...groups.keys()].sort((a, b) =>
        a === 'No job set' ? 1 : b === 'No job set' ? -1 : a.localeCompare(b),
      );
      return (
        <>
          {brief}
          {keys.map((k) => (
            <View key={k}>
              <SectionHeading count={groups.get(k)!.length}>{k}</SectionHeading>
              <View style={st.list}>{groups.get(k)!.map((x) => card(x, true))}</View>
            </View>
          ))}
        </>
      );
    }
    return (
      <>
        {brief}
        <View style={st.list}>{shown.map((x) => card(x))}</View>
      </>
    );
  };

  const renderWeek = () => {
    const doneW = sortTasks(sectionTasks.filter((x) => x.done && Date.parse(x.done_at ?? '0') >= ws));
    const added = sectionTasks.filter((x) => Date.parse(x.created_at) >= ws).length;
    const oldest = open
      .slice()
      .sort((a, b) => Date.parse(a.created_at) - Date.parse(b.created_at))
      .slice(0, 3);
    return (
      <>
        <View style={st.stats}>
          <Stat n={doneW.length} label="Done" />
          <Stat n={added} label="Added" />
          <Stat n={open.length} label="Still open" />
        </View>
        {oldest.length ? (
          <>
            <SectionHeading>Oldest open jobs</SectionHeading>
            <View style={st.list}>
              {oldest.map((x) => {
                const d = ageDays(x);
                return (
                  <View key={x.id} style={[st.oldrow, { backgroundColor: c.surface, borderColor: c.line }]}>
                    <Text style={{ color: c.fg, flex: 1 }}>{x.title}</Text>
                    <Text style={{ color: c.crit, fontWeight: '700', fontSize: 12 }}>
                      {d < 1 ? 'today' : `${d} day${d === 1 ? '' : 's'}`}
                    </Text>
                  </View>
                );
              })}
            </View>
          </>
        ) : null}
        <SectionHeading>Done this week</SectionHeading>
        {doneW.length ? (
          <View style={st.list}>{doneW.map((x) => card(x))}</View>
        ) : (
          <Empty text="Nothing ticked off since Monday yet." />
        )}
      </>
    );
  };

  const Stat = ({ n, label, red }: { n: number; label: string; red?: boolean }) => (
    <View style={[st.stat, { backgroundColor: c.surface, borderColor: c.line }]}>
      <Text style={[st.statN, { color: red ? c.crit : c.fg }]}>{n}</Text>
      <Text style={[st.statL, { color: c.muted }]}>{label.toUpperCase()}</Text>
    </View>
  );

  const Empty = ({ text }: { text: string }) => (
    <View style={[st.empty, { borderColor: c.line }]}>
      <Text style={{ color: c.muted, textAlign: 'center' }}>{text}</Text>
    </View>
  );

  const dateStr = new Date().toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  const TABS: { key: Filter; label: string }[] = [
    { key: 'today', label: 'Today' },
    { key: 'open', label: 'Open' },
    { key: 'week', label: 'This week' },
    { key: 'done', label: 'Done' },
    { key: 'contacts', label: 'Contacts' },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <View style={[st.band, { backgroundColor: c.band, paddingTop: insets.top + 12 }]}>
        <View style={{ flex: 1 }}>
          <Text style={st.h1}>{section === 'personal' ? 'Personal To-Do' : 'Work To-Do'}</Text>
          <Text style={[st.sub, { color: c.bandSub }]}>
            {(section === 'personal' ? 'Personal' : 'EFT Group | Work') + ' | ' + dateStr}
          </Text>
        </View>
        <Pressable onPress={account} accessibilityRole="button" accessibilityLabel="Account">
          <Image source={require('../../assets/logo.png')} style={st.logo} />
        </Pressable>
      </View>
      <View style={[st.strip, { backgroundColor: c.accent }]} />

      <ScrollView
        contentContainerStyle={[st.content, { paddingBottom: insets.bottom + 96 }]}
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[c.accent]} />}
      >
        <View style={[st.seg, { backgroundColor: c.surface, borderColor: c.line }]}>
          {(['work', 'personal'] as Section[]).map((k) => (
            <Pressable
              key={k}
              accessibilityRole="button"
              accessibilityState={{ selected: section === k }}
              onPress={() => setSection(k)}
              style={[st.segBtn, section === k && { backgroundColor: c.accent }]}
            >
              <Text style={{ fontWeight: '700', color: section === k ? c.accentInk : c.muted }}>
                {k === 'work' ? 'Work' : 'Personal'}
              </Text>
            </Pressable>
          ))}
        </View>

        {data.error ? <Text style={[st.error, { color: c.crit, backgroundColor: c.critSoft }]}>{data.error}</Text> : null}

        <View style={st.stats}>
          <Stat n={open.length} label="Open" />
          <Stat n={dueCount} label="Due / overdue" red />
          <Stat n={doneWeek} label="Done this week" />
        </View>

        {filter !== 'contacts' ? (
          <AddTask open={addOpen} onToggle={() => setAddOpen(!addOpen)} section={section} onAdd={add} />
        ) : null}

        <Field
          value={query}
          onChangeText={setQuery}
          placeholder={filter === 'contacts' ? 'Search contacts' : 'Search tasks, sites, contacts, notes'}
          style={{ backgroundColor: c.surface, marginBottom: 10 }}
        />

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={st.tabs}>
          {TABS.map((tab) => {
            const on = filter === tab.key;
            return (
              <Pressable
                key={tab.key}
                accessibilityRole="tab"
                accessibilityState={{ selected: on }}
                onPress={() => setFilter(tab.key)}
                style={[st.tab, { borderColor: on ? c.fg : c.line, backgroundColor: on ? c.fg : c.surface }]}
              >
                <Text style={{ color: on ? c.bg : c.fg, fontWeight: on ? '700' : '500' }}>{tab.label}</Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {filter !== 'contacts' && filter !== 'week' ? (
          <View style={st.toolbar}>
            <Btn small label={group ? '✓ Grouped by job' : 'Group by job'} onPress={() => setGroup(!group)} />
            {section === 'work' ? (
              <Btn
                small
                label={scope === 'all' ? "✓ Everyone's tasks" : "Everyone's tasks"}
                onPress={() => setScope(scope === 'all' ? 'mine' : 'all')}
              />
            ) : null}
          </View>
        ) : null}

        {renderList()}

        {filter !== 'contacts' ? (
          <Text style={[st.hint, { color: c.muted }]}>
            Swipe right to tick off, swipe left to delete. Tap a task to edit it. Pull down to refresh.
          </Text>
        ) : null}
      </ScrollView>

      <TaskEditor
        task={editing}
        contacts={data.contacts}
        people={data.people}
        me={me}
        onClose={() => setEditing(null)}
        onSave={save}
        onDelete={remove}
      />
      <Confetti run={confetti} onDone={confettiDone} />
      <Toast toast={toast} onUndo={() => toast?.undo?.()} />
    </View>
  );
}

const st = StyleSheet.create({
  band: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 16, paddingBottom: 14 },
  h1: { color: '#fff', fontSize: 21, fontWeight: '700' },
  sub: { fontSize: 12.5, marginTop: 3 },
  logo: { width: 48, height: 48, borderRadius: 3 },
  strip: { height: 4 },
  content: { padding: 16 },
  seg: { flexDirection: 'row', borderWidth: 1, borderRadius: 12, padding: 4, gap: 4, marginBottom: 14 },
  segBtn: { flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: 9 },
  stats: { flexDirection: 'row', gap: 10, marginBottom: 14 },
  stat: { flex: 1, borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10 },
  statN: { fontSize: 24, fontWeight: '700', fontVariant: ['tabular-nums'] },
  statL: { fontSize: 10.5, letterSpacing: 0.6, fontWeight: '600' },
  tabs: { gap: 6, paddingBottom: 8 },
  tab: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 7 },
  toolbar: { flexDirection: 'row', gap: 8, marginBottom: 10, flexWrap: 'wrap' },
  list: { gap: 8 },
  empty: { borderWidth: 1, borderStyle: 'dashed', borderRadius: 12, padding: 24 },
  oldrow: { flexDirection: 'row', gap: 10, alignItems: 'center', borderWidth: 1, borderRadius: 10, padding: 12 },
  hint: { fontSize: 12, textAlign: 'center', marginTop: 16 },
  error: { padding: 10, borderRadius: 8, marginBottom: 12, fontSize: 13 },
});
