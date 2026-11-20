import React, { useRef } from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import Swipeable from 'react-native-gesture-handler/Swipeable';
import * as Clipboard from 'expo-clipboard';
import { contactFor, effPri, fmtDue, raised, raiseWhy, today, typeOf } from '../logic';
import { useColors, useIsDark } from '../theme';
import type { Contact, Profile, Task } from '../types';
import { Chip } from '../ui';

export function TaskCard({
  task,
  contacts,
  people,
  me,
  showJob,
  showFrom,
  onToggle,
  onDelete,
  onOpen,
  onCopied,
}: {
  task: Task;
  contacts: Contact[];
  people: Profile[];
  me: string;
  showJob: boolean;
  showFrom: boolean;
  onToggle: (t: Task) => void;
  onDelete: (t: Task) => void;
  onOpen: (t: Task) => void;
  onCopied: () => void;
}) {
  const c = useColors();
  const dark = useIsDark();
  const ref = useRef<Swipeable>(null);
  const t = today();
  const ty = typeOf(task.type);
  const ep = effPri(task);
  const contact = contactFor(task, contacts);
  const nameOf = (id: string) =>
    id === me ? 'You' : people.find((p) => p.id === id)?.name || 'Colleague';

  const action = (label: string, bg: string, align: 'flex-start' | 'flex-end') => (
    <View style={[st.action, { backgroundColor: bg, alignItems: align }]}>
      <Text style={st.actionText}>{label}</Text>
    </View>
  );

  return (
    <Swipeable
      ref={ref}
      friction={2}
      leftThreshold={90}
      rightThreshold={90}
      overshootLeft={false}
      overshootRight={false}
      renderLeftActions={() => action(task.done ? 'Reopen' : 'Done', c.ok, 'flex-start')}
      renderRightActions={() => action('Delete', c.crit, 'flex-end')}
      onSwipeableOpen={(dir) => {
        ref.current?.close();
        if (dir === 'left') onToggle(task);
        else onDelete(task);
      }}
    >
      <View
        style={[
          st.card,
          { backgroundColor: c.surface, borderColor: c.line },
          ep === 'high' && !task.done && { borderLeftWidth: 4, borderLeftColor: c.crit },
        ]}
      >
        <Pressable
          accessibilityRole="checkbox"
          accessibilityState={{ checked: task.done }}
          accessibilityLabel={(task.done ? 'Mark not done: ' : 'Mark done: ') + task.title}
          hitSlop={10}
          onPress={() => onToggle(task)}
          style={[
            st.check,
            { borderColor: task.done ? c.ok : c.line, backgroundColor: task.done ? c.ok : c.bg },
          ]}
        >
          {task.done ? <Text style={st.tick}>✓</Text> : null}
        </Pressable>
        <Pressable style={st.body} onPress={() => onOpen(task)} accessibilityRole="button">
          <Text
            style={[
              st.title,
              { color: task.done ? c.muted : c.fg },
              task.done && { textDecorationLine: 'line-through', fontWeight: '400' },
            ]}
          >
            {task.title}
          </Text>
          <View style={st.meta}>
            <Chip label={ty.label} dot={dark ? ty.dark : ty.light} />
            {showJob && task.job ? <Chip label={task.job} tone="job" /> : null}
            {task.due && !task.done ? (
              <Chip
                tone={task.due < t ? 'over' : task.due === t ? 'today' : 'plain'}
                label={
                  (task.due < t
                    ? `Overdue · ${fmtDue(task.due)}`
                    : task.due === t
                      ? 'Due today'
                      : `Due ${fmtDue(task.due)}`) + (task.due_time ? ` ${task.due_time}` : '')
                }
              />
            ) : null}
            {raised(task) ? (
              <Chip tone="up" label={`↑ ${ep === 'high' ? 'High' : 'Normal'} · ${raiseWhy(task)}`} />
            ) : ep === 'high' && !task.done ? (
              <Chip tone="high" label="High priority" />
            ) : null}
            {ep === 'low' ? <Chip label="Low" /> : null}
            {(task.assignees ?? []).map((id) => (
              <Chip key={id} tone="tag" label={`@${nameOf(id)}`} />
            ))}
            {showFrom && task.owner && task.owner !== me ? (
              <Chip label={`From ${nameOf(task.owner)}`} />
            ) : null}
          </View>
          {contact && (contact.phone || contact.email || contact.name) ? (
            <View style={st.contact}>
              <Text style={[st.cName, { color: c.fg }]}>{contact.name}</Text>
              {contact.phone ? (
                <>
                  <Text style={{ color: c.fg }} selectable>
                    {contact.phone}
                  </Text>
                  <Text
                    style={[st.link, { color: c.accent }]}
                    onPress={() => Linking.openURL(`tel:${contact.phone.replace(/\s/g, '')}`)}
                  >
                    Call
                  </Text>
                  <Text
                    style={[st.link, { color: c.accent }]}
                    onPress={async () => {
                      await Clipboard.setStringAsync(contact.phone);
                      onCopied();
                    }}
                  >
                    Copy
                  </Text>
                </>
              ) : null}
            </View>
          ) : null}
          {task.notes ? (
            <Text style={[st.notes, { color: c.muted }]} numberOfLines={2}>
              {task.notes}
            </Text>
          ) : null}
        </Pressable>
      </View>
    </Swipeable>
  );
}

const st = StyleSheet.create({
  card: {
    flexDirection: 'row',
    gap: 12,
    padding: 12,
    borderWidth: 1,
    borderRadius: 12,
  },
  check: {
    width: 26,
    height: 26,
    borderRadius: 8,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  tick: { color: '#fff', fontWeight: '800', fontSize: 15, lineHeight: 18 },
  body: { flex: 1, minWidth: 0 },
  title: { fontSize: 16, fontWeight: '600' },
  meta: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 6 },
  contact: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 8, alignItems: 'center' },
  cName: { fontWeight: '600', fontSize: 14 },
  link: { fontWeight: '700', fontSize: 14 },
  notes: { fontSize: 13, marginTop: 6 },
  action: { flex: 1, justifyContent: 'center', borderRadius: 12, paddingHorizontal: 22 },
  actionText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
