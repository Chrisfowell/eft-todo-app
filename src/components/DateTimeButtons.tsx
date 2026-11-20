import React from 'react';
import { StyleSheet, View } from 'react-native';
import { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { fmtDue, ymd } from '../logic';
import { Btn } from '../ui';

const pad = (n: number) => String(n).padStart(2, '0');

/** Due date and time pickers using the phone's own calendar and clock. */
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
  const pickDate = () =>
    DateTimePickerAndroid.open({
      value: due ? new Date(`${due}T12:00:00`) : new Date(),
      mode: 'date',
      onChange: (e, d) => {
        if (e.type === 'set' && d) onDue(ymd(d));
      },
    });
  const pickTime = () => {
    const base = new Date();
    if (time) {
      const [h, m] = time.split(':').map(Number);
      base.setHours(h || 9, m || 0);
    } else base.setHours(9, 0);
    DateTimePickerAndroid.open({
      value: base,
      mode: 'time',
      is24Hour: true,
      onChange: (e, d) => {
        if (e.type === 'set' && d) onTime(`${pad(d.getHours())}:${pad(d.getMinutes())}`);
      },
    });
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
    </View>
  );
}

const s = StyleSheet.create({
  row: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  grow: { flexGrow: 1 },
});
