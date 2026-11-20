import React, { useEffect, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SUPABASE_URL } from '../config';
import { supabase } from '../supabase';
import { useColors } from '../theme';
import { Btn } from '../ui';

const CONNECTOR_URL = `${SUPABASE_URL}/functions/v1/todo-mcp`;

/** Lets each person make their own key for the Claude connector. */
export function ConnectClaude({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const [hasKey, setHasKey] = useState<boolean | null>(null);
  const [key, setKey] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) return;
    setKey(null);
    setMsg(null);
    supabase.rpc('has_connector_key').then(({ data, error }) => setHasKey(error ? null : !!data));
  }, [visible]);

  const make = async () => {
    setBusy(true);
    setMsg(null);
    const { data, error } = await supabase.rpc('new_connector_key');
    setBusy(false);
    if (error || typeof data !== 'string') {
      setMsg("Couldn't make a key. Check your signal and try again.");
      return;
    }
    setKey(data);
    setHasKey(true);
  };

  const copy = async (label: string, text: string) => {
    await Clipboard.setStringAsync(text);
    setCopied(label);
    setTimeout(() => setCopied(null), 1500);
  };

  const Step = ({ n, children }: { n: number; children: React.ReactNode }) => (
    <View style={s.step}>
      <View style={[s.num, { backgroundColor: c.accent }]}>
        <Text style={s.numText}>{n}</Text>
      </View>
      <View style={{ flex: 1, gap: 6 }}>{children}</View>
    </View>
  );

  const Value = ({ label, value }: { label: string; value: string }) => (
    <View style={[s.value, { backgroundColor: c.bg, borderColor: c.line }]}>
      <Text style={{ color: c.fg, flex: 1, fontFamily: 'monospace', fontSize: 13 }} selectable>
        {value}
      </Text>
      <Btn small label={copied === label ? 'Copied' : 'Copy'} onPress={() => copy(label, value)} />
    </View>
  );

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={s.shade}>
        <View style={[s.sheet, { backgroundColor: c.surface, paddingBottom: insets.bottom + 12 }]}>
          <View style={s.head}>
            <Text style={[s.h, { color: c.fg }]}>Connect to Claude</Text>
            <Pressable onPress={onClose} hitSlop={12}>
              <Text style={{ color: c.muted, fontWeight: '600', fontSize: 15 }}>Close</Text>
            </Pressable>
          </View>
          <ScrollView contentContainerStyle={s.body}>
            <Text style={{ color: c.muted, fontSize: 14 }}>
              Add tasks by talking to Claude, on your phone or computer. Claude sorts out the job type, site, date and
              priority, and puts meetings in your Outlook calendar.
            </Text>

            <Step n={1}>
              <Text style={[s.t, { color: c.fg }]}>Make your personal key</Text>
              {key ? (
                <>
                  <Value label="key" value={`Bearer ${key}`} />
                  <Text style={{ color: c.crit, fontSize: 13 }}>
                    Copy it now. It won't be shown again, and anyone with it can add to your list.
                  </Text>
                </>
              ) : (
                <>
                  {hasKey ? (
                    <Text style={{ color: c.muted, fontSize: 13 }}>
                      You already have a key. Making a new one stops the old one working.
                    </Text>
                  ) : null}
                  <Btn
                    label={busy ? 'Making…' : hasKey ? 'Make a new key' : 'Make my key'}
                    kind="primary"
                    onPress={make}
                    disabled={busy}
                  />
                </>
              )}
              {msg ? <Text style={{ color: c.crit, fontSize: 13 }}>{msg}</Text> : null}
            </Step>

            <Step n={2}>
              <Text style={[s.t, { color: c.fg }]}>Add the connector in Claude</Text>
              <Text style={{ color: c.muted, fontSize: 13 }}>
                On claude.ai: Customize → Connectors → + Add → Add custom connector. Name it "EFT To-Do" and use this URL:
              </Text>
              <Value label="url" value={CONNECTOR_URL} />
            </Step>

            <Step n={3}>
              <Text style={[s.t, { color: c.fg }]}>Add your key</Text>
              <Text style={{ color: c.muted, fontSize: 13 }}>
                Choose "No sign in", then add a request header named Authorization. Paste the whole key from step 1
                (starting "Bearer") as its value, then click Add.
              </Text>
            </Step>

            <Step n={4}>
              <Text style={[s.t, { color: c.fg }]}>Allow it</Text>
              <Text style={{ color: c.muted, fontSize: 13 }}>
                Set each EFT To-Do tool to "Always allow". Then try: "add to my to-do list: survey at Royal Bolton
                Tuesday 10am".
              </Text>
            </Step>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  shade: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.45)' },
  sheet: { borderTopLeftRadius: 18, borderTopRightRadius: 18, paddingTop: 14, maxHeight: '92%' },
  head: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 8 },
  h: { fontSize: 18, fontWeight: '700' },
  body: { paddingHorizontal: 16, paddingBottom: 16, gap: 16 },
  step: { flexDirection: 'row', gap: 12 },
  num: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center', marginTop: 1 },
  numText: { color: '#fff', fontWeight: '700' },
  t: { fontSize: 15, fontWeight: '700' },
  value: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderRadius: 10, padding: 10 },
});
