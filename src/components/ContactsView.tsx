import React, { useState } from 'react';
import { Alert, Linking, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { contactFor, initials } from '../logic';
import { useColors } from '../theme';
import type { Contact, Task } from '../types';
import { Btn, Chip, Field } from '../ui';

export function ContactsView({
  contacts,
  tasks,
  query,
  onSave,
  onDelete,
  onToast,
}: {
  contacts: Contact[];
  tasks: Task[];
  query: string;
  onSave: (c: Partial<Contact> & { name: string }) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onToast: (m: string) => void;
}) {
  const c = useColors();
  const [editing, setEditing] = useState<Partial<Contact> | null>(null);
  const q = query.trim().toLowerCase();
  const list = contacts
    .slice()
    .sort((a, b) => a.name.localeCompare(b.name))
    .filter((k) => !q || [k.name, k.company, k.role, k.phone, k.email, k.notes].some((v) => v?.toLowerCase().includes(q)));

  return (
    <View style={{ gap: 8 }}>
      <Btn label="+ New contact" kind="primary" onPress={() => setEditing({})} />
      {list.length === 0 ? (
        <View style={[s.empty, { borderColor: c.line }]}>
          <Text style={{ color: c.muted, textAlign: 'center' }}>
            {q ? 'No contacts match.' : 'No contacts yet. Add one, and any task that mentions their name will show their details.'}
          </Text>
        </View>
      ) : null}
      {list.map((k) => {
        const n = tasks.filter((t) => !t.done && contactFor(t, contacts)?.id === k.id).length;
        return (
          <Pressable
            key={k.id}
            onPress={() => setEditing(k)}
            accessibilityRole="button"
            style={[s.card, { backgroundColor: c.surface, borderColor: c.line }]}
          >
            <View style={[s.avatar, { backgroundColor: c.band }]}>
              <Text style={s.avatarText}>{initials(k.name)}</Text>
            </View>
            <View style={{ flex: 1, gap: 4 }}>
              <Text style={[s.name, { color: c.fg }]}>{k.name}</Text>
              {k.role || k.company ? (
                <Text style={{ color: c.muted, fontSize: 13 }}>{[k.role, k.company].filter(Boolean).join(' · ')}</Text>
              ) : null}
              <View style={s.row}>
                {k.phone ? (
                  <>
                    <Text style={{ color: c.fg }} selectable>
                      {k.phone}
                    </Text>
                    <Text style={[s.link, { color: c.accent }]} onPress={() => Linking.openURL(`tel:${k.phone.replace(/\s/g, '')}`)}>
                      Call
                    </Text>
                    <Text
                      style={[s.link, { color: c.accent }]}
                      onPress={async () => {
                        await Clipboard.setStringAsync(k.phone);
                        onToast('Number copied');
                      }}
                    >
                      Copy
                    </Text>
                  </>
                ) : null}
                {k.email ? (
                  <>
                    <Text style={{ color: c.fg }} selectable>
                      {k.email}
                    </Text>
                    <Text
                      style={[s.link, { color: c.accent }]}
                      onPress={async () => {
                        await Clipboard.setStringAsync(k.email);
                        onToast('Email copied');
                      }}
                    >
                      Copy
                    </Text>
                  </>
                ) : null}
              </View>
              {n ? (
                <View style={s.row}>
                  <Chip tone="job" label={`${n} open task${n > 1 ? 's' : ''}`} />
                </View>
              ) : null}
              {k.notes ? <Text style={{ color: c.muted, fontSize: 13 }}>{k.notes}</Text> : null}
            </View>
          </Pressable>
        );
      })}
      <ContactEditor
        contact={editing}
        onClose={() => setEditing(null)}
        onSave={async (data) => {
          try {
            await onSave(data);
            setEditing(null);
          } catch {
            onToast("Couldn't save that contact. Try again.");
          }
        }}
        onDelete={(id) =>
          Alert.alert('Delete this contact?', editing?.name ?? '', [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Delete',
              style: 'destructive',
              onPress: async () => {
                try {
                  await onDelete(id);
                  setEditing(null);
                } catch {
                  onToast("Couldn't delete that contact.");
                }
              },
            },
          ])
        }
      />
    </View>
  );
}

function ContactEditor({
  contact,
  onClose,
  onSave,
  onDelete,
}: {
  contact: Partial<Contact> | null;
  onClose: () => void;
  onSave: (c: Partial<Contact> & { name: string }) => void;
  onDelete: (id: string) => void;
}) {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const [v, setV] = useState<Partial<Contact>>({});
  const [last, setLast] = useState<Partial<Contact> | null>(null);
  if (contact !== last) {
    setLast(contact);
    setV(contact ?? {});
  }
  if (!contact) return null;
  const set = (k: keyof Contact) => (t: string) => setV((x) => ({ ...x, [k]: t }));
  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <View style={s.shade}>
        <View style={[s.sheet, { backgroundColor: c.surface, paddingBottom: insets.bottom + 12 }]}>
          <View style={s.head}>
            <Text style={[s.h, { color: c.fg }]}>{contact.id ? 'Edit contact' : 'New contact'}</Text>
            <Pressable onPress={onClose} hitSlop={12}>
              <Text style={{ color: c.muted, fontWeight: '600', fontSize: 15 }}>Close</Text>
            </Pressable>
          </View>
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ gap: 8, paddingHorizontal: 16 }}>
            <Field value={v.name ?? ''} onChangeText={set('name')} placeholder="Name" />
            <Field value={v.company ?? ''} onChangeText={set('company')} placeholder="Company" />
            <Field value={v.role ?? ''} onChangeText={set('role')} placeholder="Role" />
            <Field value={v.phone ?? ''} onChangeText={set('phone')} placeholder="Phone" keyboardType="phone-pad" />
            <Field value={v.email ?? ''} onChangeText={set('email')} placeholder="Email" keyboardType="email-address" autoCapitalize="none" />
            <Field value={v.notes ?? ''} onChangeText={set('notes')} placeholder="Notes" multiline />
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
              {contact.id ? <Btn label="Delete" kind="danger" onPress={() => onDelete(contact.id as string)} /> : null}
              <View style={{ flex: 1 }} />
              <Btn
                label={contact.id ? 'Save' : 'Add contact'}
                kind="primary"
                disabled={!v.name?.trim()}
                onPress={() =>
                  onSave({
                    id: contact.id,
                    name: (v.name ?? '').trim(),
                    company: (v.company ?? '').trim(),
                    role: (v.role ?? '').trim(),
                    phone: (v.phone ?? '').trim(),
                    email: (v.email ?? '').trim(),
                    notes: (v.notes ?? '').trim(),
                  })
                }
              />
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  empty: { borderWidth: 1, borderStyle: 'dashed', borderRadius: 12, padding: 24 },
  card: { flexDirection: 'row', gap: 12, padding: 12, borderWidth: 1, borderRadius: 12 },
  avatar: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  name: { fontSize: 16, fontWeight: '600' },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, alignItems: 'center' },
  link: { fontWeight: '700' },
  shade: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.45)' },
  sheet: { borderTopLeftRadius: 18, borderTopRightRadius: 18, paddingTop: 14, maxHeight: '90%' },
  head: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 8 },
  h: { fontSize: 18, fontWeight: '700' },
});
