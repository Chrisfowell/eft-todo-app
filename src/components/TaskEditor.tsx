import React, { useEffect, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { TYPES } from '../logic';
import { useColors, useIsDark } from '../theme';
import type { Contact, Priority, Profile, Task, TaskType } from '../types';
import { Btn, Field, Label, Pills } from '../ui';
import { DateTimeButtons } from './DateTimeButtons';

export function TaskEditor({
  task,
  contacts,
  people,
  me,
  onClose,
  onSave,
  onDelete,
}: {
  task: Task | null;
  contacts: Contact[];
  people: Profile[];
  me: string;
  onClose: () => void;
  onSave: (id: string, patch: Partial<Task>) => void;
  onDelete: (t: Task) => void;
}) {
  const c = useColors();
  const dark = useIsDark();
  const insets = useSafeAreaInsets();
  const [title, setTitle] = useState('');
  const [type, setType] = useState<TaskType>('other');
  const [job, setJob] = useState('');
  const [due, setDue] = useState<string | null>(null);
  const [time, setTime] = useState('');
  const [priority, setPriority] = useState<Priority>('normal');
  const [notes, setNotes] = useState('');
  const [contactId, setContactId] = useState<string | null>(null);
  const [assignees, setAssignees] = useState<string[]>([]);

  useEffect(() => {
    if (!task) return;
    setTitle(task.title);
    setType(task.type);
    setJob(task.job);
    setDue(task.due);
    setTime(task.due_time);
    setPriority(task.priority);
    setNotes(task.notes);
    setContactId(task.contact_id);
    setAssignees(task.assignees ?? []);
  }, [task]);

  if (!task) return null;

  const save = () => {
    const t = title.trim();
    if (!t) return;
    onSave(task.id, {
      title: t,
      type,
      job: job.trim(),
      due,
      due_time: time,
      priority,
      notes: notes.trim(),
      contact_id: contactId,
      assignees,
    });
  };

  const confirmDelete = () =>
    Alert.alert('Delete this task?', task.title, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => onDelete(task) },
    ]);

  const sortedContacts = contacts.slice().sort((a, b) => a.name.localeCompare(b.name));
  const sortedPeople = people
    .filter((p) => p.name || p.email)
    .sort((a, b) => (a.id === me ? -1 : b.id === me ? 1 : (a.name || '').localeCompare(b.name || '')));

  return (
    <Modal visible animationType="slide" onRequestClose={onClose} transparent>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={s.shade}>
        <View
          style={[
            s.sheet,
            { backgroundColor: c.surface, paddingBottom: insets.bottom + 12, paddingTop: 14 },
          ]}
        >
          <View style={s.head}>
            <Text style={[s.h, { color: c.fg }]}>Edit task</Text>
            <Pressable onPress={onClose} hitSlop={12} accessibilityRole="button">
              <Text style={{ color: c.muted, fontSize: 15, fontWeight: '600' }}>Close</Text>
            </Pressable>
          </View>
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={s.body}>
            <Field value={title} onChangeText={setTitle} placeholder="Task" />
            <Label>JOB TYPE</Label>
            <Pills
              options={TYPES.map((t) => ({ key: t.key, label: t.label }))}
              value={type}
              onChange={setType}
              colorFor={(k) => {
                const t = TYPES.find((x) => x.key === k)!;
                return dark ? t.dark : t.light;
              }}
            />
            <Label>JOB / SITE</Label>
            <Field value={job} onChangeText={setJob} placeholder="e.g. Royal Bolton, H Block" />
            <Label>DUE</Label>
            <DateTimeButtons due={due} time={time} onDue={setDue} onTime={setTime} />
            <Label>PRIORITY</Label>
            <Pills
              options={[
                { key: 'high', label: 'High' },
                { key: 'normal', label: 'Normal' },
                { key: 'low', label: 'Low' },
              ]}
              value={priority}
              onChange={(v) => setPriority(v as Priority)}
            />
            <Label>CONTACT</Label>
            <View style={s.wrap}>
              <Pills
                options={[{ key: '', label: 'None' }, ...sortedContacts.map((k) => ({ key: k.id, label: k.name }))]}
                value={contactId ?? ''}
                onChange={(v) => setContactId(v || null)}
              />
            </View>
            {task.section === 'work' && sortedPeople.length > 0 ? (
              <>
                <Label>ASSIGNED TO</Label>
                <View style={s.wrap}>
                  {sortedPeople.map((p) => {
                    const on = assignees.includes(p.id);
                    return (
                      <Pressable
                        key={p.id}
                        accessibilityRole="checkbox"
                        accessibilityState={{ checked: on }}
                        onPress={() =>
                          setAssignees((a) => (on ? a.filter((x) => x !== p.id) : [...a, p.id]))
                        }
                        style={[
                          s.person,
                          {
                            borderColor: on ? c.accent : c.line,
                            backgroundColor: on ? c.accentSoft : c.surface,
                          },
                        ]}
                      >
                        <Text style={{ color: on ? c.accent : c.fg, fontWeight: on ? '700' : '500' }}>
                          {(on ? '✓ ' : '') + (p.id === me ? `${p.name || 'You'} (you)` : p.name || p.email || 'Colleague')}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </>
            ) : null}
            <Label>NOTES</Label>
            <Field value={notes} onChangeText={setNotes} placeholder="Part numbers, panel, access…" multiline />
            <View style={s.acts}>
              <Btn label="Delete" kind="danger" onPress={confirmDelete} />
              <View style={{ flex: 1 }} />
              <Btn label="Save" kind="primary" onPress={save} style={{ minWidth: 120 }} />
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const s = StyleSheet.create({
  shade: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.45)' },
  sheet: { borderTopLeftRadius: 18, borderTopRightRadius: 18, maxHeight: '92%' },
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 8 },
  h: { fontSize: 18, fontWeight: '700' },
  body: { paddingHorizontal: 16, gap: 8, paddingBottom: 12 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  person: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 7 },
  acts: { flexDirection: 'row', gap: 8, marginTop: 14 },
});
