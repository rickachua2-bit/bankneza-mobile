import React, { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { portalApi } from '../services/api';
import { useTenantTheme } from '../theme/ThemeProvider';
import { Card, Field, PrimaryButton } from '../components/Ui';

export function BillsScreen({ onSuccess }: { onSuccess: () => void }) {
  const theme = useTenantTheme();
  const [category, setCategory] = useState<'AIRTIME' | 'DATA' | 'ELECTRICITY' | 'CABLE'>('AIRTIME');
  const [provider, setProvider] = useState('MTN');
  const [customerRef, setCustomerRef] = useState('');
  const [validatedName, setValidatedName] = useState('');
  const [amount, setAmount] = useState('');
  const [planCode, setPlanCode] = useState('');
  const [plans, setPlans] = useState<any[]>([]);
  const [cablePlans, setCablePlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const providersByCat: Record<string, string[]> = {
    AIRTIME: ['MTN', 'AIRTEL', 'GLO', '9MOBILE'],
    DATA: ['MTN', 'AIRTEL', 'GLO', '9MOBILE'],
    ELECTRICITY: ['IKEDC', 'EKEDC', 'AEDC', 'IBEDC', 'PHED'],
    CABLE: ['DSTV', 'GOTV', 'STARTIMES'],
  };

  useEffect(() => {
    portalApi.getBillsData().then((r) => {
      if (r.success && Array.isArray(r.data?.cablePlans)) setCablePlans(r.data.cablePlans);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    setValidatedName('');
    setPlanCode('');
    if (category === 'DATA') {
      portalApi.getDataPlans(provider).then((r) => {
        const list = Array.isArray(r.data) ? r.data : [];
        setPlans(list.slice(0, 8));
      }).catch(() => setPlans([]));
    } else if (category === 'CABLE') {
      const list = cablePlans.filter((p) => String(p.provider || p.biller || '').toUpperCase().includes(provider));
      setPlans(list.slice(0, 8));
    } else {
      setPlans([]);
    }
  }, [category, provider, cablePlans]);

  const validateCustomer = async () => {
    if (!customerRef.trim()) return;
    setValidatedName('Verifying...');
    const res = await portalApi.validateBill({
      category,
      disco: provider,
      provider,
      meterNumber: customerRef.trim(),
      smartcardNumber: customerRef.trim(),
    });
    const cname = res.data?.customerName || res.data?.name;
    setValidatedName(res.success && cname ? `✓ ${cname}` : '');
    if (!res.success || !cname) Alert.alert('Verification', res.error?.message || 'Could not verify meter/smartcard.');
  };

  const handlePay = async () => {
    setLoading(true);
    try {
      const res = await portalApi.purchaseBill({
        category,
        providerName: provider,
        customerRef: customerRef.trim(),
        amountNgn: Number(amount),
        planCode: planCode || undefined,
      });
      if (!res.success) return Alert.alert('Bill Payment', res.error?.message || 'Bill payment failed.');
      Alert.alert('Success', `Bill paid! Ref: ${res.data?.reference}${res.data?.token ? `\nToken: ${res.data.token}` : ''}`);
      setCustomerRef('');
      setAmount('');
      setValidatedName('');
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

        {plans.length > 0 && (
          <View style={{ marginBottom: 12 }}>
            <Text style={{ fontSize: 12, fontWeight: '700', color: '#475569', marginBottom: 6 }}>Select Plan</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
              {plans.map((pl, idx) => {
                const code = String(pl.code || pl.planCode || pl.id || idx);
                const price = String(pl.amount || pl.price || '');
                const selected = planCode === code;
                return (
                  <TouchableOpacity
                    key={code}
                    onPress={() => { setPlanCode(code); if (price) setAmount(price); }}
                    style={[styles.chip, selected && { backgroundColor: theme.primaryColor, borderColor: theme.primaryColor }]}
                  >
                    <Text style={{ fontSize: 11, fontWeight: '700', color: selected ? '#fff' : '#334155' }}>
                      {pl.name || pl.description} (₦{price})
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}

        <Field
          label={category === 'ELECTRICITY' ? 'Meter Number' : category === 'CABLE' ? 'Smartcard / IUC' : 'Phone Number'}
          value={customerRef}
          onChangeText={setCustomerRef}
          keyboardType="number-pad"
          placeholder={category === 'ELECTRICITY' ? '45012345678' : '08012345678'}
        />
        {(category === 'ELECTRICITY' || category === 'CABLE') && (
          <View style={{ marginBottom: 10 }}>
            <PrimaryButton title="Verify Meter / Smartcard" onPress={validateCustomer} color={theme.primaryColor} />
            {validatedName ? <Text style={{ color: '#059669', fontWeight: '800', marginTop: 6 }}>{validatedName}</Text> : null}
          </View>
        )}
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
