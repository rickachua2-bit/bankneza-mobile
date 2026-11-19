import React, { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import * as LocalAuthentication from 'expo-local-authentication';
import { clearToken, portalApi } from '../services/api';
import { useTenantTheme } from '../theme/ThemeProvider';
import { Card, Field, PrimaryButton } from '../components/Ui';

export function ProfileSupportScreen({
  customer,
  onRefresh,
  onSignOut,
}: {
  customer: any;
  onRefresh: () => void;
  onSignOut: () => void;
}) {
  const theme = useTenantTheme();
  const [bvn, setBvn] = useState('');
  const [twoFaSecret, setTwoFaSecret] = useState('');
  const [twoFaCode, setTwoFaCode] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [tickets, setTickets] = useState<any[]>([]);

  const loadTickets = () => {
    portalApi.getSupportTickets().then((r) => {
      if (r.success && Array.isArray(r.data)) setTickets(r.data);
    }).catch(() => {});
  };

  useEffect(() => { loadTickets(); }, []);

  const upgradeBvn = async () => {
    const res = await portalApi.upgradeKyc(bvn.trim());
    Alert.alert('KYC Upgrade', res.success ? res.data?.message || 'Tier 2 Unlocked!' : res.error?.message || 'Failed.');
    if (res.success) onRefresh();
  };

  const init2fa = async () => {
    const res = await portalApi.setup2fa();
    if (!res.success) return Alert.alert('2FA', res.error?.message || 'Not enabled on this platform.');
    setTwoFaSecret(res.data?.secret || '');
  };

  const confirm2fa = async () => {
    const res = await portalApi.verify2fa(twoFaCode.trim());
    Alert.alert('2FA', res.success ? '2FA Enabled!' : res.error?.message || 'Invalid code.');
    if (res.success) { setTwoFaSecret(''); setTwoFaCode(''); onRefresh(); }
  };

  const testBiometrics = async () => {
    const res = await LocalAuthentication.authenticateAsync({ promptMessage: `Verify ${theme.brandName} Biometrics` });
    Alert.alert('Biometrics', res.success ? 'Device Biometric Verified ✓' : 'Cancelled or unavailable.');
  };

  const submitTicket = async () => {
    const res = await portalApi.createSupportTicket({ subject: subject.trim(), category: 'GENERAL', message: message.trim() });
    Alert.alert('Support', res.success ? 'Support ticket submitted!' : res.error?.message || 'Failed.');
    if (res.success) { setSubject(''); setMessage(''); loadTickets(); }
  };

  return (
    <ScrollView contentContainerStyle={{ padding: 16 }}>
      <Card>
        <Text style={[styles.title, { color: theme.primaryColor }]}>{customer?.fullName}</Text>
        <Text style={{ color: '#475569', fontSize: 13, marginBottom: 8 }}>
          {customer?.email} • KYC Tier {customer?.kycTier} ({customer?.kycStatus})
        </Text>
        <Text style={{ color: '#059669', fontWeight: '700', fontSize: 13, marginBottom: 10 }}>
          Points: {customer?.loyaltyPoints || 0} • Cashback: ₦{Number(customer?.cashbackEarnedNgn || 0).toLocaleString()}
        </Text>
        {customer?.referralCode && (
          <PrimaryButton
            title={`Copy Referral Code: ${customer.referralCode}`}
            onPress={async () => { await Clipboard.setStringAsync(customer.referralCode); Alert.alert('Copied', customer.referralCode); }}
            color={theme.primaryColor}
          />
        )}
      </Card>

      {Number(customer?.kycTier || 1) < 2 && (
        <Card>
          <Text style={[styles.title, { color: theme.primaryColor }]}>Upgrade to KYC Tier 2</Text>
          <Field label="11-Digit BVN" value={bvn} onChangeText={setBvn} maxLength={11} keyboardType="number-pad" placeholder="22212345678" />
          <PrimaryButton title="Verify BVN →" onPress={upgradeBvn} color={theme.accentColor} />
        </Card>
      )}

      <Card>
        <Text style={[styles.title, { color: theme.primaryColor }]}>Security, 2FA &amp; Biometrics</Text>
        <View style={{ gap: 8 }}>
          <PrimaryButton title="Test Face ID / Fingerprint" onPress={testBiometrics} color={theme.primaryColor} />
          {!customer?.totpEnabled && !twoFaSecret && (
            <PrimaryButton title="Enable Authenticator 2FA" onPress={init2fa} color={theme.accentColor} />
          )}
          {twoFaSecret ? (
            <View style={{ marginTop: 8 }}>
              <Text style={{ fontSize: 12, color: '#334155', marginBottom: 6 }}>Secret Key: {twoFaSecret}</Text>
              <Field label="Enter 6-Digit Code" value={twoFaCode} onChangeText={setTwoFaCode} maxLength={6} keyboardType="number-pad" />
              <PrimaryButton title="Verify & Activate 2FA" onPress={confirm2fa} color={theme.accentColor} />
            </View>
          ) : null}
        </View>
      </Card>

      <Card>
        <Text style={[styles.title, { color: theme.primaryColor }]}>Customer Support Desk</Text>
        <Field label="Subject" value={subject} onChangeText={setSubject} placeholder="Transfer / Card Inquiry" />
        <Field label="Message" value={message} onChangeText={setMessage} placeholder="Describe your request..." multiline />
        <PrimaryButton title="Submit Ticket" onPress={submitTicket} color={theme.accentColor} />
        {tickets.slice(0, 5).map((t) => (
          <View key={t.id} style={{ marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#f1f5f9' }}>
            <Text style={{ fontWeight: '700', color: '#0f172a' }}>{t.subject} ({t.status})</Text>
            {t.adminReply ? <Text style={{ fontSize: 12, color: '#166534', marginTop: 2 }}>Reply: {t.adminReply}</Text> : null}
          </View>
        ))}
      </Card>

      <PrimaryButton
        title="Sign Out"
        onPress={async () => { await clearToken(); onSignOut(); }}
        color="#dc2626"
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 16, fontWeight: '800', marginBottom: 8 },
});
