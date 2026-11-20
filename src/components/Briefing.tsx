import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { ESCALATE_DAYS } from '../config';
import { ageDays, effPri, raised, raiseWhy, sortTasks, today } from '../logic';
import { useColors } from '../theme';
import type { Section, Task } from '../types';
import { Btn } from '../ui';

export function Briefing({
  tasks,
  section,
  hidden,
  onToggleHidden,
}: {
  tasks: Task[];
  section: Section;
  hidden: boolean;
  onToggleHidden: () => void;
}) {
  const c = useColors();
  const t = today();
  const open = tasks.filter((x) => !x.done);
  if (!open.length) return null;
  const h = new Date().getHours();
  const greet = h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
  const due = open.filter((x) => x.due && x.due <= t);
  const over = due.filter((x) => (x.due as string) < t);
  const up = sortTasks(open.filter(raised)).filter((x) => !due.includes(x));
  const oldest = open
    .slice()
    .sort((a, b) => Date.parse(a.created_at) - Date.parse(b.created_at))
    .slice(0, 2);

  const parts = [`${open.length} open`];
  if (due.length) parts.push(`${due.length} due today${over.length ? ` (${over.length} overdue)` : ''}`);
  const allUp = open.filter(raised).length;
  if (allUp) parts.push(`${allUp} moved up in priority`);

  const group = (title: string, items: Task[], why: (x: Task) => { t: string; red?: boolean }) =>
    items.length ? (
      <View style={s.grp} key={title}>
        <Text style={[s.lbl, { color: c.muted, borderBottomColor: c.accent }]}>{title.toUpperCase()}</Text>
        {items.slice(0, 4).map((x) => {
          const w = why(x);
          return (
            <View style={s.ln} key={x.id}>
              <Text style={[s.lnText, { color: c.fg }]}>
                {x.title}
                {x.job ? ` (${x.job})` : ''}
              </Text>
              <Text style={[s.why, { color: w.red ? c.crit : c.muted, fontWeight: w.red ? '700' : '400' }]}>
                {w.t}
              </Text>
            </View>
          );
        })}
        {items.length > 4 ? <Text style={{ color: c.muted }}>{`+${items.length - 4} more`}</Text> : null}
      </View>
    ) : null;

  return (
    <View style={[s.card, { backgroundColor: c.surface, borderColor: c.line }]} accessibilityLabel="Briefing">
      <View style={s.head}>
        <Text style={[s.greet, { color: c.fg }]}>
          {greet}
          {section === 'work' ? ' · briefing' : ''}
        </Text>
        <Btn small label={hidden ? 'Show' : 'Hide for today'} onPress={onToggleHidden} />
      </View>
      <Text style={{ color: c.muted, fontSize: 14 }}>{parts.join(' · ')}.</Text>
      {hidden ? null : (
        <>
          {group('Due today', due, (x) => ({
            t: (x.due as string) < t ? 'Overdue' : x.due_time || 'Today',
            red: (x.due as string) < t,
          }))}
          {group('Moved up', up, (x) => ({
            t: `Now ${effPri(x)} · ${raiseWhy(x)}`,
            red: effPri(x) === 'high',
          }))}
          {!due.length && !up.length
            ? group('Been waiting longest', oldest, (x) => {
                const d = ageDays(x);
                return { t: d < 1 ? 'Added today' : `${d} day${d === 1 ? '' : 's'}` };
              })
            : null}
          <Text style={{ color: c.muted, fontSize: 12 }}>
            {`Tasks move up a priority level every ${ESCALATE_DAYS} days they stay open, and overdue tasks go straight to high.`}
          </Text>
        </>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: 12, padding: 14, gap: 10, marginBottom: 14 },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  greet: { fontSize: 17, fontWeight: '700', flexShrink: 1 },
  grp: { gap: 4 },
  lbl: { fontSize: 11, letterSpacing: 0.8, fontWeight: '700', alignSelf: 'flex-start', borderBottomWidth: 2, paddingBottom: 3, marginBottom: 2 },
  ln: { flexDirection: 'row', gap: 10, alignItems: 'baseline' },
  lnText: { flex: 1, fontSize: 14 },
  why: { fontSize: 12 },
});
