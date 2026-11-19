import React, { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { portalApi, setToken } from '../services/api';
import { useTenantTheme } from '../theme/ThemeProvider';
import { Card, Field, PrimaryButton } from '../components/Ui';

export function AuthScreen({ onAuthenticated }: { onAuthenticated: () => void }) {
  const theme = useTenantTheme();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [loading, setLoading] = useState(false);
  const [requires2fa, setRequires2fa] = useState(false);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [totpCode, setTotpCode] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [bvn, setBvn] = useState('');
  const [referralCode, setReferralCode] = useState('');

  const handleSubmit = async () => {
    setLoading(true);
    try {
      if (mode === 'login') {
        const res = await portalApi.login({ email: email.trim(), password, totpCode: totpCode.trim() || undefined });
        if (!res.success) {
          if (res.error?.requires2fa) setRequires2fa(true);
          return Alert.alert('Sign In', res.error?.message || 'Invalid credentials.');
        }
        await setToken(res.data.token);
        onAuthenticated();
      } else {
        const res = await portalApi.register({
          fullName: fullName.trim(),
          email: email.trim(),
          phone: phone.trim(),
          password,
          bvn: bvn.trim() || undefined,
          referralCode: referralCode.trim() || undefined,
        });
        if (!res.success) return Alert.alert('Registration', res.error?.message || 'Registration failed.');
        await setToken(res.data.token);
        onAuthenticated();
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={[styles.hero, { backgroundColor: theme.primaryColor }]}>
        <Text style={styles.brand}>{theme.brandName}</Text>
        <Text style={styles.sub}>Mobile Banking, Instant Transfers, Cards &amp; Bills</Text>
      </View>

      <View style={styles.tabs}>
        <TouchableOpacity
          onPress={() => setMode('login')}
          style={[styles.tab, mode === 'login' && { borderBottomColor: theme.accentColor, borderBottomWidth: 3 }]}
        >
          <Text style={[styles.tabText, mode === 'login' && { color: theme.primaryColor }]}>Sign In</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setMode('register')}
          style={[styles.tab, mode === 'register' && { borderBottomColor: theme.accentColor, borderBottomWidth: 3 }]}
        >
          <Text style={[styles.tabText, mode === 'register' && { color: theme.primaryColor }]}>Open Account</Text>
        </TouchableOpacity>
      </View>

      <Card>
        {mode === 'register' && (
          <>
            <Field label="Full Legal Name" value={fullName} onChangeText={setFullName} placeholder="Chinedu Okafor" />
            <Field label="Phone Number" value={phone} onChangeText={setPhone} keyboardType="phone-pad" placeholder="08012345678" />
          </>
        )}
        <Field label="Email Address" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" placeholder="you@email.com" />
        <Field label="Password" value={password} onChangeText={setPassword} secureTextEntry placeholder="Min 8 characters" />
        {mode === 'login' && requires2fa && (
          <Field label="Authenticator 2FA Code (6 Digits)" value={totpCode} onChangeText={setTotpCode} keyboardType="number-pad" maxLength={6} placeholder="123456" />
        )}
        {mode === 'register' && (
          <>
            <Field label="11-Digit BVN (Optional)" value={bvn} onChangeText={setBvn} keyboardType="number-pad" maxLength={11} placeholder="22212345678" />
            <Field label="Referral Code (Optional)" value={referralCode} onChangeText={setReferralCode} autoCapitalize="characters" placeholder="FIN-XXXXXX" />
          </>
        )}
        <PrimaryButton
          title={loading ? 'Please wait...' : mode === 'login' ? 'Sign In →' : 'Create Account & Issue NGN Account →'}
          onPress={handleSubmit}
          color={theme.accentColor}
          disabled={loading}
        />
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, paddingTop: 28, backgroundColor: '#f1f5f9', flexGrow: 1 },
  hero: { borderRadius: 18, padding: 22, marginBottom: 18 },
  brand: { color: '#ffffff', fontSize: 24, fontWeight: '900' },
  sub: { color: 'rgba(255,255,255,0.82)', fontSize: 13, marginTop: 4 },
  tabs: { flexDirection: 'row', marginBottom: 14, backgroundColor: '#fff', borderRadius: 10 },
  tab: { flex: 1, paddingVertical: 12, alignItems: 'center' },
  tabText: { fontWeight: '800', color: '#64748b', fontSize: 14 },
});
