import React, { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '../components/AppIcons';
import { portalApi } from '../services/api';
import { isFeatureEnabled, useTenantTheme } from '../theme/ThemeProvider';
import { Field, PrimaryButton } from '../components/Ui';

type BillCategory = 'AIRTIME' | 'DATA' | 'ELECTRICITY' | 'CABLE' | 'BETTING';

const providersByCat: Record<BillCategory, string[]> = {
  AIRTIME: ['MTN', 'AIRTEL', 'GLO', '9MOBILE'],
  DATA: ['MTN', 'AIRTEL', 'GLO', '9MOBILE'],
  ELECTRICITY: ['IKEDC', 'EKEDC', 'AEDC', 'IBEDC', 'PHED', 'KEDCO'],
  CABLE: ['DSTV', 'GOTV', 'STARTIMES'],
  BETTING: ['SPORTYBET', 'BET9JA', '1XBET', 'BETKING'],
};

const categoryMeta: Array<{ key: BillCategory; label: string; sub: string; icon: any; tint: string }> = [
  { key: 'AIRTIME', label: 'Airtime', sub: 'Instant VTU Top-Up', icon: 'call', tint: '#10B981' },
  { key: 'DATA', label: 'Mobile Data', sub: '4G / 5G Bundles', icon: 'wifi', tint: '#6366F1' },
  { key: 'ELECTRICITY', label: 'Electricity', sub: 'Prepaid & Postpaid', icon: 'flash', tint: '#F59E0B' },
  { key: 'CABLE', label: 'Cable TV', sub: 'DStv, GOtv & More', icon: 'tv', tint: '#EC4899' },
  { key: 'BETTING', label: 'Betting', sub: 'Instant Wallet Fund', icon: 'trophy', tint: '#0EA5E9' },
];

export function BillsScreen({ onSuccess }: { onSuccess: () => void }) {
  const theme = useTenantTheme();
  const isDark = theme.isDark;
  const [category, setCategory] = useState<BillCategory>('AIRTIME');
  const [provider, setProvider] = useState('MTN');
  const [plans, setPlans] = useState<any[]>([]);
  const [planCode, setPlanCode] = useState('');
  const [customerRef, setCustomerRef] = useState('');
  const [validatedName, setValidatedName] = useState('');
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);

  const cardBg = isDark ? '#141B2D' : '#FFFFFF';
  const titleColor = isDark ? '#F8FAFC' : '#0F172A';
  const mutedColor = isDark ? '#94A3B8' : '#64748B';
  const borderCol = isDark ? '#1E293B' : '#E2E8F0';

  const visibleCategories = categoryMeta.filter((c) =>
    c.key === 'BETTING' ? isFeatureEnabled(theme, 'BETTING_VAS') || isFeatureEnabled(theme, 'BILLS') : true
  );

  useEffect(() => {
    setValidatedName('');
    setPlanCode('');
    if (category === 'DATA') {
      portalApi
        .getDataPlans(provider)
        .then((res) => {
          setPlans(res.success && Array.isArray(res.data) ? res.data : []);
        })
        .catch(() => setPlans([]));
    } else {
      setPlans([]);
    }
  }, [category, provider]);

  const validateCustomer = async () => {
    if (!customerRef.trim()) return;
    setValidatedName('Verifying customer...');
    const res = await portalApi.validateBill({
      category,
      disco: category === 'ELECTRICITY' ? provider : undefined,
      provider: category === 'CABLE' ? provider : undefined,
      meterNumber: category === 'ELECTRICITY' ? customerRef.trim() : undefined,
      smartcardNumber: category === 'CABLE' ? customerRef.trim() : undefined,
    });
    const name = res.data?.customerName || res.data?.name;
    setValidatedName(res.success && name ? `✓ ${name}` : 'Unable to verify meter / smartcard');
  };

  const handlePay = async () => {
    if (!customerRef.trim() || !amount) {
      return Alert.alert('Missing Details', 'Enter recipient number/ID and amount.');
    }
    setLoading(true);
    try {
      if (category === 'BETTING') {
        const r = await portalApi.fundBetting({
          operator: provider,
          customerId: customerRef.trim(),
          amount: Number(amount),
        });
        if (!r.success) return Alert.alert('Betting Top-Up Failed', r.error?.message || 'Unable to fund betting wallet.');
        Alert.alert('Betting Wallet Funded ✓', `Operator: ${provider}\nReference: ${r.data?.reference || 'SUCCESS'}`);
        setAmount('');
        onSuccess();
        return;
      }

      const res = await portalApi.purchaseBill({
        category,
        providerName: provider,
        customerRef: customerRef.trim(),
        amountNgn: Number(amount),
        planCode: planCode || undefined,
      });
      if (!res.success) return Alert.alert('Bill Payment Failed', res.error?.message || 'Could not process bill.');
      const tok = res.data?.token ? `\nMeter Token: ${res.data.token}` : '';
      const cb = res.data?.cashbackEarned ? `\nCashback Earned: ₦${res.data.cashbackEarned}` : '';
      Alert.alert('Bill Paid ✓', `${provider} ${category} completed!${tok}${cb}`);
      setAmount('');
      onSuccess();
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 32 }}>
      {/* HEADER BANNER */}
      <View style={[styles.bannerCard, { backgroundColor: theme.primaryColor }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <View style={[styles.bannerIcon, { backgroundColor: 'rgba(255,255,255,0.18)' }]}>
            <Ionicons name="flash" size={24} color="#ffffff" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ color: '#fff', fontSize: 16.5, fontWeight: '900' }}>{theme.brandName} Bills & Utilities Hub</Text>
            <Text style={{ color: 'rgba(255,255,255,0.82)', fontSize: 12, marginTop: 2 }}>
              Instant Airtime, Data, Electricity Tokens, Cable TV & Betting Top-Up
            </Text>
          </View>
        </View>
      </View>

      {/* UNIFIED BILL CATEGORY SELECTOR */}
      <Text style={[styles.secLabel, { color: titleColor }]}>1. Choose Bill Category</Text>
      <View style={styles.catGrid}>
        {visibleCategories.map((c) => {
          const active = category === c.key;
          return (
            <TouchableOpacity
              key={c.key}
              onPress={() => {
                setCategory(c.key);
                setProvider(providersByCat[c.key][0]);
              }}
              style={[
                styles.catCard,
                {
                  backgroundColor: active ? theme.primaryColor : cardBg,
                  borderColor: active ? theme.primaryColor : borderCol,
                },
              ]}
            >
              <View style={[styles.catIconWrap, { backgroundColor: active ? 'rgba(255,255,255,0.2)' : `${c.tint}1F` }]}>
                <Ionicons name={c.icon} size={20} color={active ? '#ffffff' : c.tint} />
              </View>
              <Text style={{ fontSize: 12.5, fontWeight: '800', color: active ? '#ffffff' : titleColor, marginTop: 6 }}>
                {c.label}
              </Text>
              <Text style={{ fontSize: 10, color: active ? 'rgba(255,255,255,0.8)' : mutedColor, marginTop: 1 }} numberOfLines={1}>
                {c.sub}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* BILL PAYMENT FORM CARD */}
      <View style={[styles.formCard, { backgroundColor: cardBg, borderColor: borderCol }]}>
        <Text style={[styles.secLabel, { color: titleColor, marginTop: 0 }]}>2. Select Service Provider</Text>
        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
          {providersByCat[category].map((p) => {
            const active = provider === p;
            return (
              <TouchableOpacity
                key={p}
                onPress={() => setProvider(p)}
                style={[
                  styles.providerPill,
                  {
                    backgroundColor: active ? theme.accentColor : isDark ? '#1E293B' : '#F1F5F9',
                    borderColor: active ? theme.accentColor : borderCol,
                  },
                ]}
              >
                <Text style={{ fontSize: 12, fontWeight: '800', color: active ? '#fff' : titleColor }}>{p}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {plans.length > 0 && (
          <View style={{ marginBottom: 14 }}>
            <Text style={[styles.secLabel, { color: titleColor, marginTop: 0 }]}>Select Package / Bouquet</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
              {plans.map((pl, idx) => {
                const code = String(pl.code || pl.planCode || pl.id || idx);
                const price = String(pl.amount || pl.price || '');
                const selected = planCode === code;
                return (
                  <TouchableOpacity
                    key={code}
                    onPress={() => {
                      setPlanCode(code);
                      if (price) setAmount(price);
                    }}
                    style={[
                      styles.providerPill,
                      {
                        backgroundColor: selected ? theme.primaryColor : isDark ? '#1E293B' : '#F8FAFC',
                        borderColor: selected ? theme.primaryColor : borderCol,
                      },
                    ]}
                  >
                    <Text style={{ fontSize: 11.5, fontWeight: '700', color: selected ? '#fff' : titleColor }}>
                      {pl.name || pl.description} (₦{price})
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}

        <Field
          label={
            category === 'ELECTRICITY'
              ? 'Meter Number'
              : category === 'CABLE'
              ? 'Smartcard / IUC Number'
              : category === 'BETTING'
              ? `${provider} User / Customer ID`
              : 'Recipient Phone Number'
          }
          value={customerRef}
          onChangeText={setCustomerRef}
          keyboardType="number-pad"
          placeholder={
            category === 'ELECTRICITY' ? '45012345678' : category === 'CABLE' ? '1023456789' : '08012345678'
          }
        />

        {(category === 'ELECTRICITY' || category === 'CABLE') && (
          <View style={{ marginBottom: 12 }}>
            <PrimaryButton title="Verify Meter / Smartcard" onPress={validateCustomer} color={theme.primaryColor} />
            {validatedName ? <Text style={{ color: '#10B981', fontWeight: '800', marginTop: 6 }}>{validatedName}</Text> : null}
          </View>
        )}

        <Text style={{ fontSize: 11.5, fontWeight: '700', color: mutedColor, marginBottom: 6 }}>Quick Amount</Text>
        <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
          {['500', '1000', '2000', '5000', '10000'].map((amt) => (
            <TouchableOpacity
              key={amt}
              onPress={() => setAmount(amt)}
              style={[
                styles.quickAmtPill,
                {
                  backgroundColor: amount === amt ? `${theme.accentColor}22` : isDark ? '#1E293B' : '#F8FAFC',
                  borderColor: amount === amt ? theme.accentColor : borderCol,
                },
              ]}
            >
              <Text style={{ fontSize: 11.5, fontWeight: '800', color: amount === amt ? theme.accentColor : titleColor }}>
                ₦{Number(amt).toLocaleString()}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Field label="Amount (₦)" value={amount} onChangeText={setAmount} keyboardType="numeric" placeholder="1000" />
        <PrimaryButton
          title={loading ? 'Processing Payment...' : `Pay ${provider} ${category} Now →`}
          onPress={handlePay}
          color={theme.accentColor}
          disabled={loading}
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  bannerCard: { borderRadius: 20, padding: 16, marginBottom: 16 },
  bannerIcon: { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center' },
  secLabel: { fontSize: 13.5, fontWeight: '900', marginBottom: 10 },
  catGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  catCard: { width: '31.5%', borderRadius: 16, padding: 12, borderWidth: 1 },
  catIconWrap: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  formCard: { borderRadius: 20, padding: 16, borderWidth: 1 },
  providerPill: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, borderWidth: 1 },
  quickAmtPill: { paddingHorizontal: 11, paddingVertical: 6, borderRadius: 999, borderWidth: 1 },
});
