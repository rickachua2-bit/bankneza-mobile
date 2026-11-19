import React, { useState } from 'react';
import { Alert, Modal, ScrollView, Share, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { Ionicons } from '@expo/vector-icons';
import { isFeatureEnabled, useTenantTheme } from '../theme/ThemeProvider';
import { Card, PrimaryButton } from '../components/Ui';

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
  const [hideBal, setHideBal] = useState(false);
  const [receiptTx, setReceiptTx] = useState<any>(null);
  const fmt = (n: number) => `₦${Number(n || 0).toLocaleString('en-NG')}`;
  const txs = Array.isArray(customer?.transactions) ? customer.transactions : [];

  const copyAccount = async () => {
    if (!customer?.virtualAccountNumber) return;
    await Clipboard.setStringAsync(customer.virtualAccountNumber);
    Alert.alert('Copied', `Account number ${customer.virtualAccountNumber} copied!`);
  };

  const shareReceipt = async (tx: any) => {
    await Share.share({
      message: `${theme.brandName} Transaction Receipt\nType: ${tx.type}\nAmount: ${fmt(Math.abs(tx.amountNgn))}\nDetails: ${tx.description}\nReference: ${tx.reference}\nDate: ${new Date(tx.createdAt).toLocaleString()}\nStatus: ${tx.status || 'SUCCESS'}`,
    });
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={[styles.walletCard, { backgroundColor: theme.primaryColor }]}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text style={styles.walletLabel}>Available NGN Balance</Text>
            <TouchableOpacity onPress={() => setHideBal(!hideBal)}>
              <Ionicons name={hideBal ? 'eye-off' : 'eye'} size={16} color="rgba(255,255,255,0.85)" />
            </TouchableOpacity>
          </View>
          <TouchableOpacity onPress={onRefresh}>
            <Text style={{ color: '#fff', fontWeight: '700', fontSize: 12 }}>↻ Refresh</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.walletAmt}>{hideBal ? '₦ ••••••' : fmt(customer?.walletBalanceNgn)}</Text>

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
          { key: 'transfer', label: 'Send', icon: 'send', show: isFeatureEnabled(theme, 'TRANSFERS') },
          { key: 'bills', label: 'Bills', icon: 'flash', show: isFeatureEnabled(theme, 'BILLS') },
          { key: 'cards', label: 'Cards', icon: 'card', show: isFeatureEnabled(theme, 'VIRTUAL_CARDS') || isFeatureEnabled(theme, 'PHYSICAL_CARDS') },
          { key: 'profile', label: 'KYC & 2FA', icon: 'shield-checkmark', show: true },
        ].filter((a) => a.show).map((a) => (
          <TouchableOpacity key={a.key} onPress={() => onNavigate(a.key as any)} style={styles.actionBtn}>
            <Ionicons name={a.icon as any} size={20} color={theme.accentColor} style={{ marginBottom: 4 }} />
            <Text style={[styles.actionTxt, { color: theme.primaryColor }]}>{a.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Card>
        <Text style={[styles.sectionTitle, { color: theme.primaryColor }]}>Recent Transactions</Text>
        {txs.length === 0 ? (
          <Text style={{ color: '#64748b', fontSize: 13 }}>No transactions yet. Fund your NGN account above to begin.</Text>
        ) : (
          txs.slice(0, 15).map((t: any) => {
            const isPos = Number(t.amountNgn || 0) >= 0;
            return (
              <TouchableOpacity key={t.id} onPress={() => setReceiptTx(t)} style={styles.txRow}>
                <View style={{ flex: 1, paddingRight: 8 }}>
                  <Text style={styles.txDesc} numberOfLines={1}>{t.description}</Text>
                  <Text style={styles.txMeta}>{t.type} • {new Date(t.createdAt).toLocaleDateString()}</Text>
                </View>
                <Text style={{ fontWeight: '800', color: isPos ? '#059669' : '#dc2626' }}>
                  {isPos ? '+' : '-'}{fmt(Math.abs(t.amountNgn))}
                </Text>
              </TouchableOpacity>
            );
          })
        )}
      </Card>

      <Modal visible={Boolean(receiptTx)} transparent animationType="slide" onRequestClose={() => setReceiptTx(null)}>
        <View style={styles.modalBg}>
          <View style={styles.modalCard}>
            <Text style={[styles.sectionTitle, { color: theme.primaryColor, textAlign: 'center' }]}>Transaction Receipt</Text>
            {receiptTx && (
              <>
                <Text style={{ fontSize: 26, fontWeight: '900', textAlign: 'center', color: '#0f172a', marginVertical: 8 }}>
                  {fmt(Math.abs(receiptTx.amountNgn))}
                </Text>
                <Text style={{ fontSize: 13, color: '#475569', marginBottom: 6 }}>Type: {receiptTx.type}</Text>
                <Text style={{ fontSize: 13, color: '#475569', marginBottom: 6 }}>Details: {receiptTx.description}</Text>
                <Text style={{ fontSize: 13, color: '#475569', marginBottom: 6 }}>Ref: {receiptTx.reference}</Text>
                <Text style={{ fontSize: 13, color: '#059669', fontWeight: '700', marginBottom: 14 }}>Status: {receiptTx.status || 'SUCCESS'}</Text>
                <View style={{ gap: 8 }}>
                  <PrimaryButton title="Share Receipt" onPress={() => shareReceipt(receiptTx)} color={theme.accentColor} />
                  <PrimaryButton title="Close" onPress={() => setReceiptTx(null)} color="#64748b" />
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16 },
  walletCard: { borderRadius: 18, padding: 20, marginBottom: 14 },
  walletLabel: { color: 'rgba(255,255,255,0.85)', fontSize: 12.5, fontWeight: '600' },
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
  modalBg: { flex: 1, backgroundColor: 'rgba(15,23,42,0.55)', justifyContent: 'center', padding: 20 },
  modalCard: { backgroundColor: '#fff', borderRadius: 16, padding: 20 },
});
