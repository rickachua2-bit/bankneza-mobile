import React, { useEffect, useState } from 'react';
import {
  Alert,
  Image,
  Modal,
  RefreshControl,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { Ionicons } from '@expo/vector-icons';
import { isFeatureEnabled, useTenantTheme } from '../theme/ThemeProvider';
import { portalApi } from '../services/api';
import { Field, PrimaryButton } from '../components/Ui';

export function HomeScreen({
  customer,
  onNavigate,
  onRefresh,
}: {
  customer: any;
  onNavigate: (tab: 'transfer' | 'bills' | 'cards' | 'services' | 'profile') => void;
  onRefresh: () => void;
}) {
  const theme = useTenantTheme();
  const tpl = theme.appTemplate || 'OPAY';
  const isDark = theme.isDark;
  const [hideBal, setHideBal] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [receiptTx, setReceiptTx] = useState<any>(null);
  const [showNotifs, setShowNotifs] = useState(false);
  const [notifs, setNotifs] = useState<any[]>([]);
  const [showKycModal, setShowKycModal] = useState(false);
  const [kycMode, setKycMode] = useState<'PERSONAL' | 'BUSINESS'>('PERSONAL');
  const [bvn, setBvn] = useState('');
  const [nin, setNin] = useState('');
  const [rcNumber, setRcNumber] = useState('');
  const [kycLoading, setKycLoading] = useState(false);
  const [selectedCurr, setSelectedCurr] = useState<'NGN' | 'USD' | 'GBP' | 'EUR'>('NGN');

  const fmt = (n: number) => `₦${Number(n || 0).toLocaleString('en-NG')}`;
  const txs = Array.isArray(customer?.transactions) ? customer.transactions : [];
  const provisionedAccounts: Array<{ currency: string; category?: string; accountNumber: string; bankName: string; accountName?: string; routingNumber?: string; iban?: string }> =
    Array.isArray(customer?.provisionedAccounts) ? customer.provisionedAccounts : [];
  const isKycVerified = customer?.kycStatus === 'VERIFIED' || Number(customer?.kycTier || 0) >= 2;
  const activeAccount =
    provisionedAccounts.find((a) => a.currency === selectedCurr) ||
    (selectedCurr === 'NGN' && customer?.virtualAccountNumber
      ? { currency: 'NGN', accountNumber: customer.virtualAccountNumber, bankName: customer.virtualAccountBank || 'Partner Bank', accountName: customer.virtualAccountName, routingNumber: undefined as string | undefined }
      : null);
  const firstName = String(customer?.fullName || 'User').split(' ')[0];
  const initials = String(customer?.fullName || 'U')
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0] || '')
    .join('')
    .toUpperCase();

  const loadNotifs = async () => {
    const res = await portalApi.getNotifications().catch(() => ({ success: false, data: [] }));
    if (res.success && Array.isArray(res.data)) setNotifs(res.data);
  };

  useEffect(() => {
    loadNotifs();
  }, [customer?.id, customer?.kycStatus]);

  const handlePullRefresh = async () => {
    setRefreshing(true);
    await Promise.all([theme.refreshTheme(), loadNotifs()]);
    onRefresh();
    setRefreshing(false);
  };

  const copyAccount = async (num?: string) => {
    const target = num || activeAccount?.accountNumber || customer?.virtualAccountNumber;
    if (!target) return;
    await Clipboard.setStringAsync(target);
    Alert.alert('Copied ✓', `Account number ${target} copied to clipboard.`);
  };

  const shareReceipt = async (tx: any) => {
    await Share.share({
      message: `${theme.brandName} Receipt\nType: ${tx.type}\nAmount: ${fmt(Math.abs(tx.amountNgn))}\nDetails: ${tx.description}\nRef: ${tx.reference}\nDate: ${new Date(tx.createdAt).toLocaleString()}\nStatus: ${tx.status || 'SUCCESS'}`,
    });
  };

  const handleSubmitKyc = async () => {
    if (!/^\d{11}$/.test(bvn.trim()) && !/^\d{11}$/.test(nin.trim())) {
      return Alert.alert('Required', 'Enter a valid 11-digit BVN or 11-digit NIN.');
    }
    if (kycMode === 'BUSINESS' && !rcNumber.trim()) {
      return Alert.alert('Required', 'Enter your CAC RC / BN Number for Business KYB.');
    }
    setKycLoading(true);
    try {
      const res = await portalApi.submitKyc({
        bvn: bvn.trim() || undefined,
        nin: nin.trim() || undefined,
        rcNumber: kycMode === 'BUSINESS' ? rcNumber.trim().toUpperCase() : undefined,
      });
      if (!res.success) return Alert.alert('Verification Failed', res.error?.message || 'Could not verify identity.');
      setShowKycModal(false);
      Alert.alert('KYC Approved ✓', res.data?.message || 'Your dedicated bank account is now active!');
      onRefresh();
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Verification request failed.');
    } finally {
      setKycLoading(false);
    }
  };

  const pageBg = isDark ? '#0B0F1A' : tpl === 'KUDA' ? '#FFFFFF' : tpl === 'CARDTONIC' ? '#F6F4FF' : '#F3F6FB';
  const cardBg = isDark ? '#141B2D' : '#FFFFFF';
  const titleColor = isDark ? '#F8FAFC' : '#0F172A';
  const mutedColor = isDark ? '#94A3B8' : '#64748B';
  const borderCol = isDark ? '#1E293B' : '#E2E8F0';

  const quickActions = [
    { key: 'transfer', label: 'Transfer', icon: 'paper-plane', tint: theme.accentColor, show: isFeatureEnabled(theme, 'TRANSFERS') },
    { key: 'bills', label: 'Airtime', icon: 'call', tint: '#10B981', show: isFeatureEnabled(theme, 'BILLS') },
    { key: 'bills', label: 'Data', icon: 'wifi', tint: '#6366F1', show: isFeatureEnabled(theme, 'BILLS') },
    { key: 'bills', label: 'Power', icon: 'flash', tint: '#F59E0B', show: isFeatureEnabled(theme, 'BILLS') },
    { key: 'cards', label: 'Cards', icon: 'card', tint: '#EC4899', show: isFeatureEnabled(theme, 'VIRTUAL_CARDS') || isFeatureEnabled(theme, 'PHYSICAL_CARDS') },
    { key: 'services', label: 'FX / Global', icon: 'globe', tint: '#0EA5E9', show: true },
    { key: 'services', label: 'Flights', icon: 'airplane', tint: '#8B5CF6', show: true },
    { key: 'profile', label: 'More', icon: 'grid', tint: theme.primaryColor, show: true },
  ].filter((a) => a.show);

  const renderAccountOrKycGate = (darkSurface: boolean) => {
    if (!isKycVerified) {
      return (
        <TouchableOpacity
          onPress={() => setShowKycModal(true)}
          style={[
            styles.kycGateCard,
            { backgroundColor: darkSurface ? 'rgba(255,255,255,0.14)' : '#FEF3C7', borderColor: darkSurface ? 'rgba(255,255,255,0.22)' : '#FDE68A' },
          ]}
        >
          <View style={[styles.kycIconWrap, { backgroundColor: darkSurface ? 'rgba(255,255,255,0.2)' : '#F59E0B' }]}>
            <Ionicons name="shield-checkmark" size={20} color="#fff" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontWeight: '800', fontSize: 13, color: darkSurface ? '#fff' : '#92400E' }}>
              Complete KYC / KYB to Unlock Bank Account
            </Text>
            <Text style={{ fontSize: 11.5, color: darkSurface ? 'rgba(255,255,255,0.85)' : '#B45309', marginTop: 2 }}>
              Verify BVN, NIN, or Business RC to get your dedicated NGN account number.
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={darkSurface ? '#fff' : '#92400E'} />
        </TouchableOpacity>
      );
    }
    return (
      <View style={{ gap: 8 }}>
        <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
          {(['NGN', 'USD', 'GBP', 'EUR'] as const).map((c) => {
            const hasAcc = c === 'NGN' ? Boolean(customer?.virtualAccountNumber || provisionedAccounts.some((a) => a.currency === 'NGN')) : provisionedAccounts.some((a) => a.currency === c);
            return (
              <TouchableOpacity
                key={c}
                onPress={() => setSelectedCurr(c)}
                style={{
                  paddingHorizontal: 10,
                  paddingVertical: 4,
                  borderRadius: 999,
                  backgroundColor: selectedCurr === c ? theme.accentColor : darkSurface ? 'rgba(255,255,255,0.16)' : '#E2E8F0',
                }}
              >
                <Text style={{ fontSize: 11, fontWeight: '800', color: selectedCurr === c ? '#fff' : darkSurface ? 'rgba(255,255,255,0.85)' : '#334155' }}>
                  {c}{hasAcc ? ' ✓' : ''}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
        <View style={[styles.vaBar, { backgroundColor: darkSurface ? 'rgba(255,255,255,0.14)' : '#F1F5F9' }]}>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 11, fontWeight: '700', color: darkSurface ? 'rgba(255,255,255,0.82)' : mutedColor }}>
              {activeAccount ? `${activeAccount.bankName} • ${activeAccount.currency} Account` : `${selectedCurr} Account • Verified`}
            </Text>
            <Text style={{ fontSize: 15.5, fontWeight: '900', letterSpacing: 0.8, color: darkSurface ? '#fff' : titleColor, marginTop: 2 }} numberOfLines={1}>
              {activeAccount?.accountNumber || 'Syncing Account...'}
            </Text>
            {activeAccount?.routingNumber ? (
              <Text style={{ fontSize: 10.5, color: darkSurface ? 'rgba(255,255,255,0.75)' : mutedColor, marginTop: 1 }}>
                Routing / Sort: {activeAccount.routingNumber}
              </Text>
            ) : null}
          </View>
          {activeAccount?.accountNumber ? (
            <TouchableOpacity onPress={() => copyAccount(activeAccount.accountNumber)} style={[styles.copyPill, { backgroundColor: theme.accentColor }]}>
              <Ionicons name="copy" size={14} color="#fff" />
              <Text style={{ color: '#fff', fontWeight: '800', fontSize: 11.5 }}>Copy</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity onPress={handlePullRefresh} style={[styles.copyPill, { backgroundColor: theme.accentColor }]}>
              <Ionicons name="refresh" size={14} color="#fff" />
              <Text style={{ color: '#fff', fontWeight: '800', fontSize: 11.5 }}>Sync</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: pageBg }}
      contentContainerStyle={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handlePullRefresh} tintColor={theme.accentColor} />}
    >
      {/* MODERN TOP APP HEADER (Avatar, Greeting, KYC Pill, Notification Bell) */}
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => onNavigate('profile')} style={styles.userRow}>
          {theme.logoUrl ? (
            <Image source={{ uri: theme.logoUrl }} style={styles.avatarImg} />
          ) : (
            <View style={[styles.avatarCircle, { backgroundColor: theme.primaryColor }]}>
              <Text style={styles.avatarTxt}>{initials}</Text>
            </View>
          )}
          <View>
            <Text style={[styles.greeting, { color: titleColor }]}>Hi, {firstName}</Text>
            <TouchableOpacity
              onPress={() => (isKycVerified ? onNavigate('profile') : setShowKycModal(true))}
              style={[
                styles.kycPill,
                { backgroundColor: isKycVerified ? '#DCFCE7' : '#FEF3C7' },
              ]}
            >
              <Ionicons name={isKycVerified ? 'checkmark-circle' : 'alert-circle'} size={12} color={isKycVerified ? '#15803D' : '#B45309'} />
              <Text style={{ fontSize: 10.5, fontWeight: '800', color: isKycVerified ? '#15803D' : '#B45309' }}>
                {isKycVerified ? `Tier ${customer.kycTier || 2} Verified` : 'Verify KYC →'}
              </Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <TouchableOpacity onPress={() => onNavigate('profile')} style={[styles.iconBtn, { backgroundColor: cardBg, borderColor: borderCol }]}>
            <Ionicons name="headset-outline" size={19} color={titleColor} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setShowNotifs(true)} style={[styles.iconBtn, { backgroundColor: cardBg, borderColor: borderCol }]}>
            <Ionicons name="notifications-outline" size={20} color={titleColor} />
            {(notifs.length > 0 || !isKycVerified) && <View style={styles.notifDot} />}
          </TouchableOpacity>
        </View>
      </View>

      {/* TEMPLATE-SPECIFIC HERO SECTION */}
      {tpl === 'KUDA' ? (
        /* KUDA MINIMAL STYLE */
        <View style={[styles.kudaHero, { backgroundColor: cardBg, borderColor: borderCol }]}>
          <View style={styles.currPillRow}>
            {(['NGN', 'USD', 'GBP', 'EUR'] as const).map((c) => (
              <TouchableOpacity
                key={c}
                onPress={() => setSelectedCurr(c)}
                style={[styles.currPill, selectedCurr === c && { backgroundColor: theme.primaryColor }]}
              >
                <Text style={[styles.currPillTxt, selectedCurr === c && { color: '#fff' }]}>{c}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 12 }}>
            <Text style={{ fontSize: 12, color: mutedColor, fontWeight: '600' }}>{selectedCurr} Wallet Balance</Text>
            <TouchableOpacity onPress={() => setHideBal(!hideBal)}>
              <Ionicons name={hideBal ? 'eye-off-outline' : 'eye-outline'} size={16} color={mutedColor} />
            </TouchableOpacity>
          </View>
          <Text style={[styles.kudaBalance, { color: titleColor }]}>
            {hideBal ? '••••••' : selectedCurr === 'NGN' ? fmt(customer?.walletBalanceNgn) : `${selectedCurr} 0.00`}
          </Text>
          <View style={{ flexDirection: 'row', gap: 10, marginTop: 14, width: '100%' }}>
            <TouchableOpacity onPress={() => (isKycVerified ? copyAccount() : setShowKycModal(true))} style={[styles.pillCta, { backgroundColor: theme.primaryColor }]}>
              <Ionicons name="add-circle-outline" size={16} color="#fff" />
              <Text style={styles.pillCtaTxt}>Add Money</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => onNavigate('transfer')} style={[styles.pillCta, { backgroundColor: theme.accentColor }]}>
              <Ionicons name="paper-plane-outline" size={16} color="#fff" />
              <Text style={styles.pillCtaTxt}>Send Money</Text>
            </TouchableOpacity>
          </View>
          <View style={{ width: '100%', marginTop: 14 }}>{renderAccountOrKycGate(false)}</View>
        </View>
      ) : tpl === 'GREY' ? (
        /* GREY GLOBAL FX STYLE */
        <View style={{ marginBottom: 14 }}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12 }}>
            {[
              { code: 'NGN', label: 'Nigerian Naira', bal: fmt(customer?.walletBalanceNgn), bg: theme.primaryColor },
              { code: 'USD', label: 'US Dollar', bal: '$0.00', bg: '#0F172A' },
              { code: 'GBP', label: 'British Pound', bal: '£0.00', bg: '#1E293B' },
              { code: 'EUR', label: 'Euro Account', bal: '€0.00', bg: '#334155' },
            ].map((w) => (
              <View key={w.code} style={[styles.greyCard, { backgroundColor: w.bg }]}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={{ color: 'rgba(255,255,255,0.85)', fontWeight: '700', fontSize: 12 }}>{w.label}</Text>
                  <View style={styles.greyBadge}><Text style={{ color: '#fff', fontSize: 10, fontWeight: '800' }}>{w.code}</Text></View>
                </View>
                <Text style={{ color: '#fff', fontSize: 26, fontWeight: '900', marginTop: 14 }}>
                  {hideBal ? '••••••' : w.bal}
                </Text>
                <Text style={{ color: 'rgba(255,255,255,0.75)', fontSize: 11, marginTop: 6 }}>
                  {w.code === 'NGN' ? (isKycVerified ? `${customer.virtualAccountNumber} • ${customer.virtualAccountBank}` : 'Verify KYC to unlock NGN') : 'Tap FX / Global to activate'}
                </Text>
              </View>
            ))}
          </ScrollView>
          <View style={{ marginTop: 12 }}>{renderAccountOrKycGate(false)}</View>
        </View>
      ) : tpl === 'MONIEPOINT' ? (
        /* MONIEPOINT BUSINESS STYLE */
        <View style={[styles.heroCard, { backgroundColor: theme.primaryColor }]}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 12, fontWeight: '700' }}>BUSINESS / PERSONAL ACCOUNT</Text>
            <TouchableOpacity onPress={() => setHideBal(!hideBal)}>
              <Ionicons name={hideBal ? 'eye-off' : 'eye'} size={18} color="#fff" />
            </TouchableOpacity>
          </View>
          <Text style={styles.heroAmount}>{hideBal ? '₦ ••••••' : fmt(customer?.walletBalanceNgn)}</Text>
          <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
            <View style={styles.moniePill}><Text style={styles.moniePillTxt}>Cashback: {fmt(customer?.cashbackEarnedNgn || 0)}</Text></View>
            <View style={styles.moniePill}><Text style={styles.moniePillTxt}>Points: {customer?.loyaltyPoints || 0} pts</Text></View>
          </View>
          {renderAccountOrKycGate(true)}
        </View>
      ) : tpl === 'CARDTONIC' ? (
        /* CARDTONIC VIBRANT CARD-FIRST STYLE */
        <View style={[styles.heroCard, { backgroundColor: theme.primaryColor, borderRadius: 24 }]}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <View>
              <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 11.5, fontWeight: '700' }}>{theme.brandName.toUpperCase()} WALLET</Text>
              <Text style={styles.heroAmount}>{hideBal ? '₦ ••••••' : fmt(customer?.walletBalanceNgn)}</Text>
            </View>
            <TouchableOpacity onPress={() => onNavigate('cards')} style={[styles.cardMiniBadge, { backgroundColor: theme.accentColor }]}>
              <Ionicons name="card" size={18} color="#fff" />
              <Text style={{ color: '#fff', fontSize: 11, fontWeight: '800' }}>Cards</Text>
            </TouchableOpacity>
          </View>
          {renderAccountOrKycGate(true)}
        </View>
      ) : (
        /* OPAY MODERN & REVOLUT EXECUTIVE DARK HERO */
        <View style={[styles.heroCard, { backgroundColor: isDark ? '#162038' : theme.primaryColor, borderWidth: isDark ? 1 : 0, borderColor: '#243252' }]}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Ionicons name="shield-checkmark" size={14} color="rgba(255,255,255,0.85)" />
              <Text style={{ color: 'rgba(255,255,255,0.85)', fontSize: 12.5, fontWeight: '600' }}>Available Balance</Text>
              <TouchableOpacity onPress={() => setHideBal(!hideBal)}>
                <Ionicons name={hideBal ? 'eye-off-outline' : 'eye-outline'} size={16} color="rgba(255,255,255,0.9)" />
              </TouchableOpacity>
            </View>
            <TouchableOpacity onPress={() => onNavigate('transfer')} style={[styles.addMoneyPill, { backgroundColor: theme.accentColor }]}>
              <Text style={{ color: '#fff', fontWeight: '800', fontSize: 11.5 }}>Send →</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.heroAmount}>{hideBal ? '₦ ••••••' : fmt(customer?.walletBalanceNgn)}</Text>
          {renderAccountOrKycGate(true)}
        </View>
      )}

      {/* MODERN QUICK ACTIONS GRID */}
      <View style={[styles.sectionCard, { backgroundColor: cardBg, borderColor: borderCol }]}>
        <View style={styles.actionGrid}>
          {quickActions.map((a, idx) => (
            <TouchableOpacity key={`${a.label}-${idx}`} onPress={() => onNavigate(a.key as any)} style={styles.actionItem}>
              <View style={[styles.actionCircle, { backgroundColor: isDark ? `${a.tint}32` : `${a.tint}1A`, borderWidth: 1, borderColor: `${a.tint}33` }]}>
                <Ionicons name={a.icon as any} size={23} color={a.tint} />
              </View>
              <Text style={[styles.actionLabel, { color: titleColor }]} numberOfLines={1}>{a.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* RECENT TRANSACTIONS */}
      <View style={[styles.sectionCard, { backgroundColor: cardBg, borderColor: borderCol }]}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <Text style={[styles.sectionTitle, { color: titleColor }]}>Recent Activity</Text>
          <TouchableOpacity onPress={handlePullRefresh}>
            <Text style={{ color: theme.accentColor, fontWeight: '700', fontSize: 12.5 }}>↻ Refresh</Text>
          </TouchableOpacity>
        </View>
        {txs.length === 0 ? (
          <View style={{ alignItems: 'center', paddingVertical: 22 }}>
            <Ionicons name="receipt-outline" size={32} color={mutedColor} />
            <Text style={{ color: mutedColor, fontSize: 13, marginTop: 8, textAlign: 'center' }}>
              {isKycVerified
                ? 'No transactions yet. Fund your NGN account to start transacting.'
                : 'Complete KYC verification above to unlock your bank account.'}
            </Text>
          </View>
        ) : (
          txs.slice(0, 12).map((tx: any) => {
            const isCredit = Number(tx.amountNgn || 0) >= 0;
            return (
              <TouchableOpacity key={tx.id || tx.reference} onPress={() => setReceiptTx(tx)} style={[styles.txRow, { borderBottomColor: borderCol }]}>
                <View style={[styles.txIcon, { backgroundColor: isCredit ? '#DCFCE7' : '#FEE2E2' }]}>
                  <Ionicons name={isCredit ? 'arrow-down' : 'arrow-up'} size={16} color={isCredit ? '#15803D' : '#DC2626'} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontWeight: '700', fontSize: 13.5, color: titleColor }} numberOfLines={1}>{tx.description || tx.type}</Text>
                  <Text style={{ fontSize: 11.5, color: mutedColor, marginTop: 2 }}>{new Date(tx.createdAt).toLocaleString()}</Text>
                </View>
                <Text style={{ fontWeight: '800', fontSize: 14, color: isCredit ? '#15803D' : '#DC2626' }}>
                  {isCredit ? '+' : '-'}{fmt(Math.abs(tx.amountNgn))}
                </Text>
              </TouchableOpacity>
            );
          })
        )}
      </View>

      {/* NOTIFICATIONS MODAL */}
      <Modal visible={showNotifs} transparent animationType="slide" onRequestClose={() => setShowNotifs(false)}>
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalSheet, { backgroundColor: cardBg }]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <Text style={{ fontSize: 17, fontWeight: '900', color: titleColor }}>Notifications</Text>
              <TouchableOpacity onPress={() => setShowNotifs(false)}>
                <Ionicons name="close-circle" size={24} color={mutedColor} />
              </TouchableOpacity>
            </View>
            <ScrollView style={{ maxHeight: 360 }}>
              {notifs.length === 0 ? (
                <Text style={{ color: mutedColor, textAlign: 'center', paddingVertical: 24 }}>No notifications yet.</Text>
              ) : (
                notifs.map((n) => (
                  <View key={n.id} style={[styles.notifItem, { borderBottomColor: borderCol }]}>
                    <View style={[styles.txIcon, { backgroundColor: `${theme.accentColor}20` }]}>
                      <Ionicons name={n.type === 'KYC' ? 'shield-checkmark' : n.type === 'TRANSACTION' ? 'cash' : 'megaphone'} size={16} color={theme.accentColor} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontWeight: '800', fontSize: 13, color: titleColor }}>{n.title}</Text>
                      <Text style={{ fontSize: 12, color: mutedColor, marginTop: 2 }}>{n.body}</Text>
                    </View>
                  </View>
                ))
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* MANDATORY KYC / KYB VERIFICATION MODAL */}
      <Modal visible={showKycModal} transparent animationType="slide" onRequestClose={() => setShowKycModal(false)}>
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalSheet, { backgroundColor: cardBg }]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <Text style={{ fontSize: 17, fontWeight: '900', color: titleColor }}>Identity Verification (KYC / KYB)</Text>
              <TouchableOpacity onPress={() => setShowKycModal(false)}>
                <Ionicons name="close-circle" size={24} color={mutedColor} />
              </TouchableOpacity>
            </View>
            <Text style={{ fontSize: 12.5, color: mutedColor, marginBottom: 14 }}>
              Complete verification to unlock your dedicated NGN bank account, transfers, and virtual cards.
            </Text>
            <View style={[styles.kycTabs, { backgroundColor: isDark ? '#1E293B' : '#EEF2F8' }]}>
              <TouchableOpacity onPress={() => setKycMode('PERSONAL')} style={[styles.kycTabBtn, kycMode === 'PERSONAL' && { backgroundColor: theme.primaryColor }]}>
                <Text style={[styles.kycTabTxt, kycMode === 'PERSONAL' && { color: '#fff' }]}>Personal KYC</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setKycMode('BUSINESS')} style={[styles.kycTabBtn, kycMode === 'BUSINESS' && { backgroundColor: theme.primaryColor }]}>
                <Text style={[styles.kycTabTxt, kycMode === 'BUSINESS' && { color: '#fff' }]}>Business KYB</Text>
              </TouchableOpacity>
            </View>
            <Field label="11-Digit BVN" value={bvn} onChangeText={setBvn} keyboardType="number-pad" maxLength={11} placeholder="22123456789" />
            <Field label="11-Digit NIN (Optional if BVN entered)" value={nin} onChangeText={setNin} keyboardType="number-pad" maxLength={11} placeholder="12345678901" />
            {kycMode === 'BUSINESS' && (
              <Field label="CAC RC / BN Number" value={rcNumber} onChangeText={setRcNumber} autoCapitalize="characters" placeholder="RC1234567" />
            )}
            <PrimaryButton title="Verify & Unlock Bank Account →" onPress={handleSubmitKyc} loading={kycLoading} color={theme.accentColor} />
          </View>
        </View>
      </Modal>

      {/* SHAREABLE RECEIPT MODAL */}
      <Modal visible={Boolean(receiptTx)} transparent animationType="fade" onRequestClose={() => setReceiptTx(null)}>
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalSheet, { backgroundColor: cardBg }]}>
            <Text style={{ fontSize: 17, fontWeight: '900', color: titleColor, marginBottom: 10 }}>Transaction Receipt</Text>
            {receiptTx && (
              <>
                <Text style={{ fontSize: 26, fontWeight: '900', color: theme.accentColor, marginBottom: 12 }}>
                  {fmt(Math.abs(receiptTx.amountNgn))}
                </Text>
                <Text style={{ fontSize: 13, color: mutedColor, marginBottom: 4 }}>Details: {receiptTx.description}</Text>
                <Text style={{ fontSize: 12, color: mutedColor, marginBottom: 4 }}>Ref: {receiptTx.reference}</Text>
                <Text style={{ fontSize: 12, color: mutedColor, marginBottom: 16 }}>Date: {new Date(receiptTx.createdAt).toLocaleString()}</Text>
                <PrimaryButton title="Share Receipt" onPress={() => shareReceipt(receiptTx)} color={theme.primaryColor} />
                <TouchableOpacity onPress={() => setReceiptTx(null)} style={{ marginTop: 12, alignItems: 'center' }}>
                  <Text style={{ color: mutedColor, fontWeight: '700' }}>Close</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, paddingBottom: 32 },
  topBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  userRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  avatarImg: { width: 42, height: 42, borderRadius: 21 },
  avatarCircle: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
  avatarTxt: { color: '#fff', fontWeight: '900', fontSize: 15 },
  greeting: { fontSize: 16, fontWeight: '800' },
  kycPill: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999, marginTop: 3, alignSelf: 'flex-start' },
  iconBtn: { width: 40, height: 40, borderRadius: 20, borderWidth: 1, alignItems: 'center', justifyContent: 'center', position: 'relative' },
  notifDot: { position: 'absolute', top: 8, right: 9, width: 8, height: 8, borderRadius: 4, backgroundColor: '#EF4444' },
  heroCard: { borderRadius: 20, padding: 18, marginBottom: 14, shadowColor: '#0f172a', shadowOpacity: 0.14, shadowRadius: 16, elevation: 5 },
  heroAmount: { fontSize: 30, fontWeight: '900', color: '#fff', marginVertical: 10, letterSpacing: -0.5 },
  addMoneyPill: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999 },
  vaBar: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 14, gap: 10 },
  copyPill: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999 },
  kycGateCard: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: 14, borderWidth: 1 },
  kycIconWrap: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  kudaHero: { borderRadius: 22, padding: 18, borderWidth: 1, alignItems: 'center', marginBottom: 14 },
  currPillRow: { flexDirection: 'row', gap: 8 },
  currPill: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, backgroundColor: '#F1F5F9' },
  currPillTxt: { fontSize: 12, fontWeight: '800', color: '#475569' },
  kudaBalance: { fontSize: 32, fontWeight: '900', marginTop: 6, letterSpacing: -0.5 },
  pillCta: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12, borderRadius: 14 },
  pillCtaTxt: { color: '#fff', fontWeight: '800', fontSize: 13 },
  greyCard: { width: 250, borderRadius: 20, padding: 18 },
  greyBadge: { backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
  moniePill: { backgroundColor: 'rgba(255,255,255,0.16)', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999 },
  moniePillTxt: { color: '#fff', fontSize: 11.5, fontWeight: '700' },
  cardMiniBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 14 },
  sectionCard: { borderRadius: 20, padding: 16, borderWidth: 1, marginBottom: 14 },
  actionGrid: { flexDirection: 'row', flexWrap: 'wrap', rowGap: 14 },
  actionItem: { width: '25%', alignItems: 'center' },
  actionCircle: { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
  actionLabel: { fontSize: 11.5, fontWeight: '700' },
  sectionTitle: { fontSize: 15.5, fontWeight: '800' },
  txRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderBottomWidth: 1 },
  txIcon: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(15,23,42,0.55)', justifyContent: 'flex-end' },
  modalSheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 32 },
  notifItem: { flexDirection: 'row', gap: 10, paddingVertical: 12, borderBottomWidth: 1 },
  kycTabs: { flexDirection: 'row', borderRadius: 12, padding: 4, marginBottom: 14 },
  kycTabBtn: { flex: 1, paddingVertical: 9, borderRadius: 10, alignItems: 'center' },
  kycTabTxt: { fontSize: 13, fontWeight: '700', color: '#64748B' },
});
