import React, { useEffect, useState } from 'react';
import { Alert, Modal, ScrollView, Share, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { portalApi } from '../services/api';
import { useTenantTheme } from '../theme/ThemeProvider';
import { Card, Field, PrimaryButton } from '../components/Ui';

export function TransferScreen({ customer, onSuccess }: { customer: any; onSuccess: () => void }) {
  const theme = useTenantTheme();
  const isDark = theme.isDark;
  const [mode, setMode] = useState<'BANK' | 'P2P'>('BANK');
  const [banks, setBanks] = useState<Array<{ code: string; name: string }>>([]);
  const [beneficiaries, setBeneficiaries] = useState<Array<{ id: string; bankCode: string; bankName: string; accountNumber: string; accountName: string }>>([]);
  const [bankSearch, setBankSearch] = useState('');
  const [selectedBank, setSelectedBank] = useState<{ code: string; name: string } | null>(null);
  const [accountNumber, setAccountNumber] = useState('');
  const [accountName, setAccountName] = useState('');
  const [saveBen, setSaveBen] = useState(true);

  const [p2pId, setP2pId] = useState('');
  const [p2pRecipient, setP2pRecipient] = useState<{ fullName: string; email: string; phone: string } | null>(null);
  const [p2pLookingUp, setP2pLookingUp] = useState(false);

  const [amount, setAmount] = useState('');
  const [narration, setNarration] = useState('');
  const [totpCode, setTotpCode] = useState('');
  const [transferPin, setTransferPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [receipt, setReceipt] = useState<any>(null);

  const titleColor = isDark ? '#F8FAFC' : '#0F172A';
  const mutedColor = isDark ? '#94A3B8' : '#64748B';
  const borderCol = isDark ? '#1E293B' : '#E2E8F0';
  const cardBg = isDark ? '#141B2D' : '#FFFFFF';

  useEffect(() => {
    portalApi
      .getBanks()
      .then((res) => {
        if (res.success && Array.isArray(res.data)) {
          setBanks(res.data.map((b: any) => ({ code: String(b.code || b.bankCode), name: String(b.name || b.bankName) })));
        }
      })
      .catch(() => {});
    portalApi
      .getBeneficiaries()
      .then((res) => {
        if (res.success && Array.isArray(res.data)) setBeneficiaries(res.data);
      })
      .catch(() => {});
  }, []);

  const resolve = async (acc: string, bank = selectedBank) => {
    if (!bank || acc.length !== 10) return;
    setAccountName('Verifying...');
    const res = await portalApi.resolveAccount({ bankCode: bank.code, accountNumber: acc });
    const name = res.data?.accountName || res.data?.account_name;
    setAccountName(res.success && name ? name : '');
    if (!res.success) Alert.alert('Lookup Failed', res.error?.message || 'Could not resolve account name.');
  };

  const resolveP2pRecipient = async () => {
    if (!p2pId.trim()) return;
    setP2pLookingUp(true);
    try {
      const res = await portalApi.resolveP2p(p2pId.trim());
      if (!res.success) {
        setP2pRecipient(null);
        return Alert.alert('User Not Found', res.error?.message || 'No user found with that email or phone.');
      }
      setP2pRecipient(res.data);
    } finally {
      setP2pLookingUp(false);
    }
  };

  const handleSendBank = async () => {
    if (!selectedBank || !accountName || accountName === 'Verifying...') {
      return Alert.alert('Verify Recipient', 'Select a bank and enter a valid 10-digit account number.');
    }
    if (!amount || Number(amount) < 100) {
      return Alert.alert('Invalid Amount', 'Minimum bank transfer is ₦100.');
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
        transferPin: transferPin.trim(),
        setTransferPin: !customer?.hasTransferPin,
      });
      if (!res.success) return Alert.alert('Transfer Failed', res.error?.message || 'Unable to complete transfer.');
      if (saveBen) {
        portalApi
          .saveBeneficiary({
            bankCode: selectedBank.code,
            bankName: selectedBank.name,
            accountNumber,
            accountName,
          })
          .catch(() => {});
      }
      setReceipt({
        type: 'Bank Transfer (NIP)',
        recipient: accountName,
        destination: `${selectedBank.name} • ${accountNumber}`,
        amount: Number(amount),
        reference: res.data?.payout?.reference || `TRF-${Date.now()}`,
        narration: narration.trim() || 'Transfer',
        cashback: res.data?.cashbackEarned || 0,
      });
      setAmount('');
      setNarration('');
      setTotpCode('');
      setTransferPin('');
    } finally {
      setLoading(false);
    }
  };

  const handleSendP2p = async () => {
    if (!p2pRecipient) {
      return Alert.alert('Verify User', 'Tap Verify User first to confirm the recipient.');
    }
    if (!amount || Number(amount) < 50) {
      return Alert.alert('Invalid Amount', 'Minimum wallet transfer is ₦50.');
    }
    setLoading(true);
    try {
      const res = await portalApi.sendP2pTransfer({
        identifier: p2pId.trim(),
        amount: Number(amount),
        narration: narration.trim() || 'Instant Wallet Transfer',
        totpCode: totpCode.trim() || undefined,
      });
      if (!res.success) return Alert.alert('Transfer Failed', res.error?.message || 'Unable to complete transfer.');
      setReceipt({
        type: `${theme.brandName} Instant Wallet Transfer (₦0 Fee)`,
        recipient: p2pRecipient.fullName,
        destination: `${p2pRecipient.email} • ${p2pRecipient.phone}`,
        amount: Number(amount),
        reference: res.data?.reference || `P2P-${Date.now()}`,
        narration: narration.trim() || 'Instant Wallet Transfer',
        cashback: 0,
      });
      setAmount('');
      setNarration('');
      setTotpCode('');
    } finally {
      setLoading(false);
    }
  };

  const filtered = banks.filter((b) => b.name.toLowerCase().includes(bankSearch.toLowerCase())).slice(0, 8);

  return (
    <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 32 }}>
      {/* TRANSFER MODE SWITCHER: BANK NIP vs INSTANT WALLET P2P */}
      <View style={[styles.modeBar, { backgroundColor: isDark ? '#1E293B' : '#E2E8F0' }]}>
        <TouchableOpacity
          onPress={() => setMode('BANK')}
          style={[styles.modeBtn, mode === 'BANK' && { backgroundColor: theme.primaryColor }]}
        >
          <Ionicons name="business" size={16} color={mode === 'BANK' ? '#fff' : titleColor} />
          <Text style={[styles.modeTxt, { color: mode === 'BANK' ? '#fff' : titleColor }]}>To Any Bank</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setMode('P2P')}
          style={[styles.modeBtn, mode === 'P2P' && { backgroundColor: theme.accentColor }]}
        >
          <Ionicons name="flash" size={16} color={mode === 'P2P' ? '#fff' : titleColor} />
          <Text style={[styles.modeTxt, { color: mode === 'P2P' ? '#fff' : titleColor }]}>
            To {theme.brandName} User (Free)
          </Text>
        </TouchableOpacity>
      </View>

      {mode === 'BANK' ? (
        <Card>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <Text style={[styles.title, { color: titleColor, marginBottom: 0 }]}>Instant Bank Transfer</Text>
            <Text style={{ fontSize: 11.5, fontWeight: '800', color: theme.accentColor }}>
              Bal: ₦{Number(customer?.walletBalanceNgn || 0).toLocaleString()}
            </Text>
          </View>

          {/* SAVED BENEFICIARIES STRIP */}
          {beneficiaries.length > 0 && (
            <View style={{ marginBottom: 14 }}>
              <Text style={{ fontSize: 11.5, fontWeight: '800', color: mutedColor, marginBottom: 6 }}>Saved Beneficiaries</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                {beneficiaries.map((ben) => (
                  <TouchableOpacity
                    key={ben.id}
                    onPress={() => {
                      setSelectedBank({ code: ben.bankCode, name: ben.bankName });
                      setAccountNumber(ben.accountNumber);
                      setAccountName(ben.accountName);
                    }}
                    style={[styles.benChip, { backgroundColor: isDark ? '#1E293B' : '#F1F5F9', borderColor: borderCol }]}
                  >
                    <View style={[styles.benAvatar, { backgroundColor: theme.primaryColor }]}>
                      <Text style={{ color: '#fff', fontSize: 11, fontWeight: '900' }}>{ben.accountName.slice(0, 2).toUpperCase()}</Text>
                    </View>
                    <View>
                      <Text style={{ fontSize: 11.5, fontWeight: '800', color: titleColor }} numberOfLines={1}>
                        {ben.accountName.split(' ').slice(0, 2).join(' ')}
                      </Text>
                      <Text style={{ fontSize: 10, color: mutedColor }}>{ben.bankName} • {ben.accountNumber}</Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}

          <Field label="Search Destination Bank" value={bankSearch} onChangeText={setBankSearch} placeholder="GTBank, Access, OPay, Moniepoint, Kuda..." />
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
            {filtered.map((b) => {
              const active = selectedBank?.code === b.code;
              return (
                <TouchableOpacity
                  key={b.code}
                  onPress={() => {
                    setSelectedBank(b);
                    if (accountNumber.length === 10) resolve(accountNumber, b);
                  }}
                  style={[
                    styles.chip,
                    {
                      backgroundColor: active ? theme.accentColor : isDark ? '#1E293B' : '#F8FAFC',
                      borderColor: active ? theme.accentColor : borderCol,
                    },
                  ]}
                >
                  <Text style={{ fontSize: 12, fontWeight: '800', color: active ? '#fff' : titleColor }}>{b.name}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <Field
            label="10-Digit Account Number"
            value={accountNumber}
            onChangeText={(v) => {
              setAccountNumber(v);
              if (v.length === 10) resolve(v);
            }}
            keyboardType="number-pad"
            maxLength={10}
            placeholder="0123456789"
          />

          {accountName ? (
            <View style={[styles.resolvedBanner, { backgroundColor: '#DCFCE7' }]}>
              <Ionicons name="checkmark-circle" size={18} color="#15803D" />
              <Text style={{ color: '#15803D', fontWeight: '900', fontSize: 13, flex: 1 }}>{accountName}</Text>
              <TouchableOpacity onPress={() => setSaveBen(!saveBen)} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Ionicons name={saveBen ? 'bookmark' : 'bookmark-outline'} size={15} color="#15803D" />
                <Text style={{ fontSize: 11, fontWeight: '800', color: '#15803D' }}>{saveBen ? 'Saved' : 'Save'}</Text>
              </TouchableOpacity>
            </View>
          ) : null}

          <Text style={{ fontSize: 11.5, fontWeight: '800', color: mutedColor, marginBottom: 6 }}>Quick Amount</Text>
          <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
            {['1000', '5000', '10000', '25000', '50000'].map((q) => (
              <TouchableOpacity
                key={q}
                onPress={() => setAmount(q)}
                style={[
                  styles.chip,
                  {
                    backgroundColor: amount === q ? `${theme.accentColor}22` : isDark ? '#1E293B' : '#F8FAFC',
                    borderColor: amount === q ? theme.accentColor : borderCol,
                  },
                ]}
              >
                <Text style={{ fontSize: 11.5, fontWeight: '800', color: amount === q ? theme.accentColor : titleColor }}>
                  ₦{Number(q).toLocaleString()}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Field label="Amount (₦)" value={amount} onChangeText={setAmount} keyboardType="numeric" placeholder="5000" />
          <Field label="Narration" value={narration} onChangeText={setNarration} placeholder="Invoice / Family Support" />
          <Field
            label={customer?.hasTransferPin ? '4-Digit Transfer PIN' : 'Create 4-Digit Transfer PIN (First-Time Setup)'}
            value={transferPin}
            onChangeText={setTransferPin}
            keyboardType="number-pad"
            maxLength={4}
            secureTextEntry
            placeholder="????"
          />
          {customer?.totpEnabled && (
            <Field label="2FA Authenticator Code" value={totpCode} onChangeText={setTotpCode} keyboardType="number-pad" maxLength={6} placeholder="123456" />
          )}
          <PrimaryButton title={loading ? 'Sending Transfer...' : 'Send Bank Transfer Now →'} onPress={handleSendBank} color={theme.accentColor} disabled={loading} />
        </Card>
      ) : (
        <Card>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <Text style={[styles.title, { color: titleColor, marginBottom: 0 }]}>
              Instant {theme.brandName} P2P Transfer
            </Text>
            <View style={{ backgroundColor: '#DCFCE7', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 }}>
              <Text style={{ color: '#15803D', fontSize: 10.5, fontWeight: '900' }}>ZERO FEE • INSTANT</Text>
            </View>
          </View>
          <Text style={{ fontSize: 12, color: mutedColor, marginBottom: 12 }}>
            Send money instantly to any {theme.brandName} customer using their email address, phone number, or account number.
          </Text>
          <Field
            label="Recipient Email, Phone, or Account Number"
            value={p2pId}
            onChangeText={(v) => {
              setP2pId(v);
              setP2pRecipient(null);
            }}
            autoCapitalize="none"
            placeholder="user@domain.com or 08012345678"
          />
          <View style={{ marginBottom: 12 }}>
            <PrimaryButton
              title={p2pLookingUp ? 'Verifying User...' : 'Verify Recipient →'}
              onPress={resolveP2pRecipient}
              color={theme.primaryColor}
            />
          </View>

          {p2pRecipient && (
            <View style={[styles.resolvedBanner, { backgroundColor: '#DCFCE7' }]}>
              <Ionicons name="checkmark-circle" size={18} color="#15803D" />
              <View style={{ flex: 1 }}>
                <Text style={{ color: '#15803D', fontWeight: '900', fontSize: 13 }}>{p2pRecipient.fullName}</Text>
                <Text style={{ color: '#166534', fontSize: 11 }}>{p2pRecipient.email} • {p2pRecipient.phone}</Text>
              </View>
            </View>
          )}

          <Field label="Amount (₦)" value={amount} onChangeText={setAmount} keyboardType="numeric" placeholder="2000" />
          <Field label="Note / Narration" value={narration} onChangeText={setNarration} placeholder="Lunch / Settlement" />
          {customer?.totpEnabled && (
            <Field label="2FA Authenticator Code" value={totpCode} onChangeText={setTotpCode} keyboardType="number-pad" maxLength={6} placeholder="123456" />
          )}
          <PrimaryButton
            title={loading ? 'Sending Instant Transfer...' : `Send Free to ${p2pRecipient?.fullName || 'User'} →`}
            onPress={handleSendP2p}
            color={theme.accentColor}
            disabled={loading}
          />
        </Card>
      )}

      {/* BRANDED SHAREABLE RECEIPT MODAL */}
      <Modal visible={Boolean(receipt)} transparent animationType="slide" onRequestClose={() => { setReceipt(null); onSuccess(); }}>
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalSheet, { backgroundColor: cardBg }]}>
            {receipt && (
              <>
                <View style={{ alignItems: 'center', marginBottom: 14 }}>
                  <View style={[styles.successBadge, { backgroundColor: '#DCFCE7' }]}>
                    <Ionicons name="checkmark-circle" size={40} color="#15803D" />
                  </View>
                  <Text style={{ fontSize: 12, fontWeight: '900', color: theme.accentColor, marginTop: 8 }}>
                    {theme.brandName.toUpperCase()} OFFICIAL RECEIPT
                  </Text>
                  <Text style={{ fontSize: 28, fontWeight: '900', color: titleColor, marginTop: 4 }}>
                    ₦{Number(receipt.amount).toLocaleString()}
                  </Text>
                  <Text style={{ fontSize: 12.5, color: '#15803D', fontWeight: '800', marginTop: 2 }}>
                    Transfer Successful ✓
                  </Text>
                </View>

                <View style={[styles.receiptBox, { backgroundColor: isDark ? '#1E293B' : '#F8FAFC', borderColor: borderCol }]}>
                  <View style={styles.receiptRow}>
                    <Text style={{ color: mutedColor, fontSize: 12 }}>Transfer Type</Text>
                    <Text style={{ color: titleColor, fontWeight: '800', fontSize: 12 }}>{receipt.type}</Text>
                  </View>
                  <View style={styles.receiptRow}>
                    <Text style={{ color: mutedColor, fontSize: 12 }}>Beneficiary</Text>
                    <Text style={{ color: titleColor, fontWeight: '800', fontSize: 12 }}>{receipt.recipient}</Text>
                  </View>
                  <View style={styles.receiptRow}>
                    <Text style={{ color: mutedColor, fontSize: 12 }}>Account / Destination</Text>
                    <Text style={{ color: titleColor, fontWeight: '800', fontSize: 12 }}>{receipt.destination}</Text>
                  </View>
                  <View style={styles.receiptRow}>
                    <Text style={{ color: mutedColor, fontSize: 12 }}>Reference</Text>
                    <Text style={{ color: titleColor, fontWeight: '800', fontSize: 11.5 }}>{receipt.reference}</Text>
                  </View>
                  {receipt.cashback > 0 && (
                    <View style={styles.receiptRow}>
                      <Text style={{ color: '#15803D', fontSize: 12, fontWeight: '800' }}>Cashback Earned</Text>
                      <Text style={{ color: '#15803D', fontWeight: '900', fontSize: 12 }}>+₦{receipt.cashback}</Text>
                    </View>
                  )}
                </View>

                <View style={{ gap: 10 }}>
                  <PrimaryButton
                    title="Share Receipt"
                    color={theme.primaryColor}
                    onPress={() =>
                      Share.share({
                        message: `${theme.brandName} Transfer Receipt\nAmount: ₦${Number(receipt.amount).toLocaleString()}\nBeneficiary: ${receipt.recipient} (${receipt.destination})\nReference: ${receipt.reference}\nStatus: SUCCESS`,
                      })
                    }
                  />
                  <PrimaryButton
                    title="Done"
                    color={theme.accentColor}
                    onPress={() => {
                      setReceipt(null);
                      onSuccess();
                    }}
                  />
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
  modeBar: { flexDirection: 'row', borderRadius: 14, padding: 4, marginBottom: 14 },
  modeBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 11, borderRadius: 11 },
  modeTxt: { fontSize: 12.5, fontWeight: '900' },
  title: { fontSize: 16, fontWeight: '900', marginBottom: 12 },
  chip: { paddingHorizontal: 11, paddingVertical: 7, borderRadius: 10, borderWidth: 1 },
  benChip: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 10, paddingVertical: 8, borderRadius: 12, borderWidth: 1 },
  benAvatar: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  resolvedBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 11, borderRadius: 12, marginBottom: 12 },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(15,23,42,0.58)', justifyContent: 'flex-end' },
  modalSheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 32 },
  successBadge: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center' },
  receiptBox: { borderRadius: 16, padding: 14, borderWidth: 1, marginBottom: 16, gap: 10 },
  receiptRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
});
