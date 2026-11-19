import React, { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { portalApi } from '../services/api';
import { useTenantTheme } from '../theme/ThemeProvider';
import { Card, Field, PrimaryButton } from '../components/Ui';

export function TransferScreen({ customer, onSuccess }: { customer: any; onSuccess: () => void }) {
  const theme = useTenantTheme();
  const [banks, setBanks] = useState<Array<{ code: string; name: string }>>([]);
  const [bankSearch, setBankSearch] = useState('');
  const [selectedBank, setSelectedBank] = useState<{ code: string; name: string } | null>(null);
  const [accountNumber, setAccountNumber] = useState('');
  const [accountName, setAccountName] = useState('');
  const [amount, setAmount] = useState('');
  const [narration, setNarration] = useState('');
  const [totpCode, setTotpCode] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    portalApi.getBanks().then((res) => {
      if (res.success && Array.isArray(res.data)) {
        setBanks(res.data.map((b: any) => ({ code: String(b.code || b.bankCode), name: String(b.name || b.bankName) })));
      }
    }).catch(() => {});
  }, []);

  const resolve = async (acc: string, bank = selectedBank) => {
    if (!bank || acc.length !== 10) return;
    setAccountName('Verifying...');
    const res = await portalApi.resolveAccount({ bankCode: bank.code, accountNumber: acc });
    const name = res.data?.accountName || res.data?.account_name;
    setAccountName(res.success && name ? name : '');
    if (!res.success) Alert.alert('Lookup Failed', res.error?.message || 'Could not resolve account name.');
  };

  const handleSend = async () => {
    if (!selectedBank || !accountName || accountName === 'Verifying...') {
      return Alert.alert('Verify Recipient', 'Select a bank and enter a valid 10-digit account number.');
    }
    setLoading(true);
    try {
      const res = await portalApi.sendTransfer({
        bankCode: selectedBank.code,
        bankName: selectedBank.name,
        accountNumber,
        accountName,
        amount: Number(amount),
        narration: narration.trim() || 'Transfer',
        totpCode: totpCode.trim() || undefined,
      });
      if (!res.success) return Alert.alert('Transfer Failed', res.error?.message || 'Unable to complete transfer.');
      Alert.alert('Success', `Transfer sent to ${accountName}!${res.data?.cashbackEarned ? ` Cashback: ₦${res.data.cashbackEarned}` : ''}`);
      setAmount('');
      setNarration('');
      setTotpCode('');
      onSuccess();
    } finally {
      setLoading(false);
    }
  };

  const filtered = banks.filter((b) => b.name.toLowerCase().includes(bankSearch.toLowerCase())).slice(0, 6);

  return (
    <ScrollView contentContainerStyle={{ padding: 16 }}>
      <Card>
        <Text style={[styles.title, { color: theme.primaryColor }]}>Instant Bank Transfer</Text>
        <Field label="Search Bank" value={bankSearch} onChangeText={setBankSearch} placeholder="GTBank, Access, OPay..." />
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
          {filtered.map((b) => (
            <TouchableOpacity
              key={b.code}
              onPress={() => { setSelectedBank(b); if (accountNumber.length === 10) resolve(accountNumber, b); }}
              style={[styles.chip, selectedBank?.code === b.code && { backgroundColor: theme.accentColor, borderColor: theme.accentColor }]}
            >
              <Text style={{ fontSize: 12, fontWeight: '700', color: selectedBank?.code === b.code ? '#fff' : '#334155' }}>{b.name}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Field
          label="10-Digit Account Number"
          value={accountNumber}
          onChangeText={(v) => { setAccountNumber(v); if (v.length === 10) resolve(v); }}
          keyboardType="number-pad"
          maxLength={10}
          placeholder="0123456789"
        />
        {accountName ? <Text style={{ color: '#059669', fontWeight: '800', marginBottom: 10 }}>✓ {accountName}</Text> : null}
        <Field label="Amount (₦)" value={amount} onChangeText={setAmount} keyboardType="numeric" placeholder="5000" />
        <Field label="Narration" value={narration} onChangeText={setNarration} placeholder="Payment / Family" />
        {customer?.totpEnabled && (
          <Field label="2FA Authenticator Code" value={totpCode} onChangeText={setTotpCode} keyboardType="number-pad" maxLength={6} placeholder="123456" />
        )}
        <PrimaryButton title={loading ? 'Sending...' : 'Send Money Now →'} onPress={handleSend} color={theme.accentColor} disabled={loading} />
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 16, fontWeight: '800', marginBottom: 12 },
  chip: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: '#cbd5e1', backgroundColor: '#f8fafc' },
});
