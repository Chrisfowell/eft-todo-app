import React, { useState } from 'react';
import { Modal, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { fmtDue, ymd } from '../logic';
import { useColors, useIsDark } from '../theme';
import { Btn } from '../ui';

const pad = (n: number) => String(n).padStart(2, '0');

/** Due date and time pickers using the phone's own calendar and clock (Android and iPhone). */
export function DateTimeButtons({
  due,
  time,
  onDue,
  onTime,
}: {
  due: string | null;
  time: string;
  onDue: (d: string | null) => void;
  onTime: (t: string) => void;
}) {
  const c = useColors();
  const dark = useIsDark();
  const insets = useSafeAreaInsets();
  // iPhone: the picker shows in a sheet with a Done button.
  const [iosMode, setIosMode] = useState<'date' | 'time' | null>(null);
  const [iosValue, setIosValue] = useState(new Date());

  const dateValue = () => (due ? new Date(`${due}T12:00:00`) : new Date());
  const timeValue = () => {
    const base = new Date();
    if (time) {
      const [h, m] = time.split(':').map(Number);
      base.setHours(h || 9, m || 0, 0, 0);
    } else base.setHours(9, 0, 0, 0);
    return base;
  };
  const toTime = (d: Date) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;

  const pickDate = () => {
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        value: dateValue(),
        mode: 'date',
        onChange: (e, d) => {
          if (e.type === 'set' && d) onDue(ymd(d));
        },
      });
    } else {
      setIosValue(dateValue());
      setIosMode('date');
    }
  };

  const pickTime = () => {
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        value: timeValue(),
        mode: 'time',
        is24Hour: true,
        onChange: (e, d) => {
          if (e.type === 'set' && d) onTime(toTime(d));
        },
      });
    } else {
      setIosValue(timeValue());
      setIosMode('time');
    }
  };

  const iosDone = () => {
    if (iosMode === 'date') onDue(ymd(iosValue));
    else if (iosMode === 'time') onTime(toTime(iosValue));
    setIosMode(null);
  };

  return (
    <View style={s.row}>
      <Btn label={due ? `Due ${fmtDue(due)}` : 'Due date'} onPress={pickDate} style={s.grow} />
      <Btn label={time || 'Time'} onPress={pickTime} style={s.grow} />
      {due || time ? (
        <Btn
          label="Clear"
          onPress={() => {
            onDue(null);
            onTime('');
          }}
        />
      ) : null}

      {Platform.OS === 'ios' && iosMode ? (
        <Modal visible transparent animationType="slide" onRequestClose={() => setIosMode(null)}>
          <View style={s.shade}>
            <View style={[s.sheet, { backgroundColor: c.surface, paddingBottom: insets.bottom + 12 }]}>
              <View style={s.head}>
                <Pressable onPress={() => setIosMode(null)} hitSlop={12} accessibilityRole="button">
                  <Text style={{ color: c.muted, fontSize: 16, fontWeight: '600' }}>Cancel</Text>
                </Pressable>
                <Text style={{ color: c.fg, fontSize: 16, fontWeight: '700' }}>
                  {iosMode === 'date' ? 'Due date' : 'Time'}
                </Text>
                <Pressable onPress={iosDone} hitSlop={12} accessibilityRole="button">
                  <Text style={{ color: c.accent, fontSize: 16, fontWeight: '700' }}>Done</Text>
                </Pressable>
              </View>
              <DateTimePicker
                value={iosValue}
                mode={iosMode}
                display={iosMode === 'date' ? 'inline' : 'spinner'}
                is24Hour
                locale="en-GB"
                accentColor={c.accent}
                themeVariant={dark ? 'dark' : 'light'}
                onChange={(_e, d) => {
                  if (d) setIosValue(d);
                }}
                style={{ alignSelf: 'stretch' }}
              />
            </View>
          </View>
        </Modal>
      ) : null}
    </View>
  );
}

const s = StyleSheet.create({
  row: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  grow: { flexGrow: 1 },
  shade: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.45)' },
  sheet: { borderTopLeftRadius: 18, borderTopRightRadius: 18, paddingTop: 14, paddingHorizontal: 12 },
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 8, paddingBottom: 8 },
});
