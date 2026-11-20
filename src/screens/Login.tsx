import React, { useState } from 'react';
import { Image, KeyboardAvoidingView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../supabase';
import { useColors } from '../theme';
import { Btn, Field } from '../ui';

export function Login() {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const [mode, setMode] = useState<'in' | 'up'>('in');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ text: string; bad?: boolean } | null>(null);

  const go = async () => {
    setMsg(null);
    if (!email.trim() || password.length < 6) {
      setMsg({ text: 'Enter your email and a password of at least 6 characters.', bad: true });
      return;
    }
    if (mode === 'up' && !name.trim()) {
      setMsg({ text: 'Enter your name so colleagues can tag you.', bad: true });
      return;
    }
    setBusy(true);
    if (mode === 'in') {
      const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (error) setMsg({ text: 'That email and password don’t match. Check them and try again.', bad: true });
    } else {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: { data: { name: name.trim() } },
      });
      if (error) setMsg({ text: error.message, bad: true });
      else if (!data.session)
        setMsg({ text: 'Account created. Open the confirmation email we sent you, then come back and sign in.' });
    }
    setBusy(false);
  };

  return (
    <KeyboardAvoidingView behavior="height" style={{ flex: 1, backgroundColor: c.bg }}>
      <View style={[s.band, { backgroundColor: c.band, paddingTop: insets.top + 24 }]}>
        <Image source={require('../../assets/logo.png')} style={s.logo} accessibilityLabel="EFT Group" />
        <Text style={s.title}>EFT To-Do</Text>
        <Text style={[s.sub, { color: c.bandSub }]}>Jobs, quotes and follow-ups in one place</Text>
      </View>
      <View style={[s.strip, { backgroundColor: c.accent }]} />
      <ScrollView contentContainerStyle={s.body} keyboardShouldPersistTaps="handled">
        <Text style={[s.h, { color: c.fg }]}>{mode === 'in' ? 'Sign in' : 'Create your account'}</Text>
        {mode === 'up' ? <Field value={name} onChangeText={setName} placeholder="Your name" autoComplete="name" /> : null}
        <Field
          value={email}
          onChangeText={setEmail}
          placeholder="Email"
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
        />
        <Field
          value={password}
          onChangeText={setPassword}
          placeholder="Password"
          secureTextEntry
          autoComplete={mode === 'in' ? 'current-password' : 'new-password'}
          onSubmitEditing={go}
        />
        {msg ? <Text style={{ color: msg.bad ? c.crit : c.ok, fontSize: 14 }}>{msg.text}</Text> : null}
        <Btn label={busy ? 'Please wait…' : mode === 'in' ? 'Sign in' : 'Create account'} kind="primary" onPress={go} disabled={busy} />
        <Btn
          label={mode === 'in' ? 'New here? Create an account' : 'Already have an account? Sign in'}
          onPress={() => {
            setMode(mode === 'in' ? 'up' : 'in');
            setMsg(null);
          }}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  band: { alignItems: 'center', paddingBottom: 24, paddingHorizontal: 16, gap: 8 },
  logo: { width: 84, height: 84, borderRadius: 6 },
  title: { color: '#fff', fontSize: 26, fontWeight: '700', marginTop: 6 },
  sub: { fontSize: 14 },
  strip: { height: 4 },
  body: { padding: 20, gap: 12 },
  h: { fontSize: 20, fontWeight: '700', marginBottom: 4 },
});
