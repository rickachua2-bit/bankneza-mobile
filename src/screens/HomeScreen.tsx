import React from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { useTenantTheme } from '../theme/ThemeProvider';
import { Card } from '../components/Ui';

export function HomeScreen({
  customer,
  onNavigate,
  onRefresh,
}: {
  customer: any;
  onNavigate: (tab: 'transfer' | 'bills' | 'cards' | 'profile') => void;
  onRefresh: () => void;
}) {
  const theme = useTenantTheme();
  const fmt = (n: number) => `₦${Number(n || 0).toLocaleString('en-NG')}`;
  const txs = Array.isArray(customer?.transactions) ? customer.transactions : [];

  const copyAccount = async () => {
    if (!customer?.virtualAccountNumber) return;
    await Clipboard.setStringAsync(customer.virtualAccountNumber);
    Alert.alert('Copied', `Account number ${customer.virtualAccountNumber} copied!`);
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={[styles.walletCard, { backgroundColor: theme.primaryColor }]}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text style={styles.walletLabel}>Available NGN Balance</Text>
          <TouchableOpacity onPress={onRefresh}>
            <Text style={{ color: '#fff', fontWeight: '700', fontSize: 12 }}>↻ Refresh</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.walletAmt}>{fmt(customer?.walletBalanceNgn)}</Text>

        <View style={styles.vaBox}>
          <View style={{ flex: 1 }}>
            <Text style={styles.vaBank}>{customer?.virtualAccountBank || 'NGN Virtual Account'}</Text>
            <Text style={styles.vaNum}>{customer?.virtualAccountNumber || 'Provisioning...'}</Text>
          </View>
          {customer?.virtualAccountNumber && (
            <TouchableOpacity onPress={copyAccount} style={[styles.copyBtn, { backgroundColor: theme.accentColor }]}>
              <Text style={{ color: '#fff', fontWeight: '800', fontSize: 12 }}>Copy</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      <View style={styles.actionsRow}>
        {[
          { key: 'transfer', label: 'Send Money' },
          { key: 'bills', label: 'Pay Bills' },
          { key: 'cards', label: 'Cards' },
          { key: 'profile', label: 'KYC & 2FA' },
        ].map((a) => (
          <TouchableOpacity key={a.key} onPress={() => onNavigate(a.key as any)} style={styles.actionBtn}>
            <Text style={[styles.actionTxt, { color: theme.primaryColor }]}>{a.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Card>
        <Text style={[styles.sectionTitle, { color: theme.primaryColor }]}>Recent Transactions</Text>
        {txs.length === 0 ? (
          <Text style={{ color: '#64748b', fontSize: 13 }}>No transactions yet. Fund your NGN account above to begin.</Text>
        ) : (
          txs.slice(0, 12).map((t: any) => {
            const isPos = Number(t.amountNgn || 0) >= 0;
            return (
              <View key={t.id} style={styles.txRow}>
                <View style={{ flex: 1, paddingRight: 8 }}>
                  <Text style={styles.txDesc} numberOfLines={1}>{t.description}</Text>
                  <Text style={styles.txMeta}>{t.type} • {new Date(t.createdAt).toLocaleDateString()}</Text>
                </View>
                <Text style={{ fontWeight: '800', color: isPos ? '#059669' : '#dc2626' }}>
                  {isPos ? '+' : '-'}{fmt(Math.abs(t.amountNgn))}
                </Text>
              </View>
            );
          })
        )}
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16 },
  walletCard: { borderRadius: 18, padding: 20, marginBottom: 14 },
  walletLabel: { color: 'rgba(255,255,255,0.8)', fontSize: 12.5, fontWeight: '600' },
  walletAmt: { color: '#ffffff', fontSize: 30, fontWeight: '900', marginVertical: 8 },
  vaBox: { backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 12, padding: 12, flexDirection: 'row', alignItems: 'center', marginTop: 6 },
  vaBank: { color: 'rgba(255,255,255,0.75)', fontSize: 11 },
  vaNum: { color: '#ffffff', fontSize: 16, fontWeight: '800', marginTop: 2 },
  copyBtn: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 },
  actionsRow: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  actionBtn: { flex: 1, backgroundColor: '#ffffff', borderRadius: 12, paddingVertical: 12, alignItems: 'center', borderWidth: 1, borderColor: '#e2e8f0' },
  actionTxt: { fontSize: 12, fontWeight: '800' },
  sectionTitle: { fontSize: 15, fontWeight: '800', marginBottom: 10 },
  txRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  txDesc: { fontSize: 13, fontWeight: '600', color: '#0f172a' },
  txMeta: { fontSize: 11, color: '#64748b', marginTop: 2 },
});
