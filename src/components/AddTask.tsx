import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { TYPES } from '../logic';
import { useColors, useIsDark } from '../theme';
import type { Priority, Section, Task, TaskType } from '../types';
import { Btn, Field, Pills } from '../ui';
import { DateTimeButtons } from './DateTimeButtons';

export function AddTask({
  open,
  onToggle,
  section,
  onAdd,
}: {
  open: boolean;
  onToggle: () => void;
  section: Section;
  onAdd: (t: Partial<Task>) => Promise<boolean>;
}) {
  const c = useColors();
  const dark = useIsDark();
  const [title, setTitle] = useState('');
  const [type, setType] = useState<TaskType>('other');
  const [job, setJob] = useState('');
  const [due, setDue] = useState<string | null>(null);
  const [time, setTime] = useState('');
  const [priority, setPriority] = useState<Priority>('normal');
  const [busy, setBusy] = useState(false);

  const add = async () => {
    const t = title.trim();
    if (!t || busy) return;
    setBusy(true);
    const ok = await onAdd({ section, title: t, type, job: job.trim(), due, due_time: time, priority });
    setBusy(false);
    if (ok) {
      setTitle('');
      setJob('');
      setDue(null);
      setTime('');
      setPriority('normal');
      setType('other');
    }
  };

  return (
    <View style={{ marginBottom: 14 }}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        onPress={onToggle}
        style={[s.bar, { backgroundColor: c.surface, borderColor: c.line }]}
      >
        <View style={[s.plus, { backgroundColor: c.accent }]}>
          <Text style={s.plusText}>+</Text>
        </View>
        <Text style={[s.barText, { color: c.fg }]}>Add a task</Text>
        <Text style={{ color: c.muted, fontSize: 16 }}>{open ? '▴' : '▾'}</Text>
      </Pressable>
      {open ? (
        <View style={[s.form, { backgroundColor: c.surface, borderColor: c.line }]}>
          <Field
            value={title}
            onChangeText={setTitle}
            placeholder="What needs doing?"
            autoFocus
            returnKeyType="done"
            onSubmitEditing={add}
          />
          <Text style={[s.hint, { color: c.muted }]}>
            Tip: tap the mic on your keyboard to say the task.
          </Text>
          <Pills
            options={TYPES.map((t) => ({ key: t.key, label: t.label }))}
            value={type}
            onChange={setType}
            colorFor={(k) => {
              const t = TYPES.find((x) => x.key === k)!;
              return dark ? t.dark : t.light;
            }}
          />
          <Field value={job} onChangeText={setJob} placeholder="Job / site (optional)" />
          <DateTimeButtons due={due} time={time} onDue={setDue} onTime={setTime} />
          <Pills
            options={[
              { key: 'normal', label: 'Normal' },
              { key: 'high', label: 'High' },
              { key: 'low', label: 'Low' },
            ]}
            value={priority}
            onChange={(v) => setPriority(v as Priority)}
          />
          <Btn label={busy ? 'Adding…' : 'Add task'} kind="primary" onPress={add} disabled={busy || !title.trim()} />
        </View>
      ) : null}
    </View>
  );
}

const s = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  plus: { width: 26, height: 26, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  plusText: { color: '#fff', fontSize: 20, fontWeight: '700', lineHeight: 22 },
  barText: { flex: 1, fontWeight: '700', fontSize: 16 },
  form: { marginTop: 8, borderWidth: 1, borderRadius: 12, padding: 12, gap: 10 },
  hint: { fontSize: 12, marginTop: -4 },
});
