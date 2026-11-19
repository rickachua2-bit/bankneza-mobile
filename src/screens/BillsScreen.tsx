import React, { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { portalApi } from '../services/api';
import { useTenantTheme } from '../theme/ThemeProvider';
import { Card, Field, PrimaryButton } from '../components/Ui';

export function BillsScreen({ onSuccess }: { onSuccess: () => void }) {
  const theme = useTenantTheme();
  const [category, setCategory] = useState<'AIRTIME' | 'DATA' | 'ELECTRICITY' | 'CABLE'>('AIRTIME');
  const [provider, setProvider] = useState('MTN');
  const [customerRef, setCustomerRef] = useState('');
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);

  const providersByCat: Record<string, string[]> = {
    AIRTIME: ['MTN', 'AIRTEL', 'GLO', '9MOBILE'],
    DATA: ['MTN', 'AIRTEL', 'GLO', '9MOBILE'],
    ELECTRICITY: ['IKEDC', 'EKEDC', 'AEDC', 'IBEDC', 'PHED'],
    CABLE: ['DSTV', 'GOTV', 'STARTIMES'],
  };

  const handlePay = async () => {
    setLoading(true);
    try {
      const res = await portalApi.purchaseBill({
        category,
        providerName: provider,
        customerRef: customerRef.trim(),
        amountNgn: Number(amount),
      });
      if (!res.success) return Alert.alert('Bill Payment', res.error?.message || 'Bill payment failed.');
      Alert.alert('Success', `Bill paid! Ref: ${res.data?.reference}${res.data?.token ? `\nToken: ${res.data.token}` : ''}`);
      setCustomerRef('');
      setAmount('');
      onSuccess();
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={{ padding: 16 }}>
      <Card>
        <Text style={[styles.title, { color: theme.primaryColor }]}>Bills, Airtime, Data &amp; Power</Text>
        <View style={{ flexDirection: 'row', gap: 6, marginBottom: 12, flexWrap: 'wrap' }}>
          {(['AIRTIME', 'DATA', 'ELECTRICITY', 'CABLE'] as const).map((c) => (
            <TouchableOpacity
              key={c}
              onPress={() => { setCategory(c); setProvider(providersByCat[c][0]); }}
              style={[styles.chip, category === c && { backgroundColor: theme.primaryColor, borderColor: theme.primaryColor }]}
            >
              <Text style={{ fontSize: 12, fontWeight: '700', color: category === c ? '#fff' : '#334155' }}>{c}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={{ flexDirection: 'row', gap: 6, marginBottom: 12, flexWrap: 'wrap' }}>
          {providersByCat[category].map((p) => (
            <TouchableOpacity
              key={p}
              onPress={() => setProvider(p)}
              style={[styles.chip, provider === p && { backgroundColor: theme.accentColor, borderColor: theme.accentColor }]}
            >
              <Text style={{ fontSize: 12, fontWeight: '700', color: provider === p ? '#fff' : '#334155' }}>{p}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Field
          label={category === 'ELECTRICITY' ? 'Meter Number' : category === 'CABLE' ? 'Smartcard / IUC' : 'Phone Number'}
          value={customerRef}
          onChangeText={setCustomerRef}
          keyboardType="number-pad"
          placeholder={category === 'ELECTRICITY' ? '45012345678' : '08012345678'}
        />
        <Field label="Amount (₦)" value={amount} onChangeText={setAmount} keyboardType="numeric" placeholder="1000" />
        <PrimaryButton title={loading ? 'Processing...' : 'Pay Bill Now →'} onPress={handlePay} color={theme.accentColor} disabled={loading} />
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 16, fontWeight: '800', marginBottom: 12 },
  chip: { paddingHorizontal: 10, paddingVertical: 7, borderRadius: 8, borderWidth: 1, borderColor: '#cbd5e1', backgroundColor: '#f8fafc' },
});
