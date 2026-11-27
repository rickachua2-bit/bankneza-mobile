import React, { useEffect, useState } from 'react';
import { Alert, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { Ionicons } from '../components/AppIcons';
import { portalApi } from '../services/api';
import { useTenantTheme } from '../theme/ThemeProvider';
import { Card, Field, PrimaryButton } from '../components/Ui';

export function CardsScreen({ customer, onRefresh }: { customer: any; onRefresh: () => void }) {
  const theme = useTenantTheme();
  const isDark = theme.isDark;
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState(customer?.phone || '');
  const [loading, setLoading] = useState(false);
  const [revealedDetails, setRevealedDetails] = useState<Record<string, { fullPan: string; cvv: string; billingAddress?: string } | null>>({});
  const [revealingId, setRevealingId] = useState<string | null>(null);
  const [cardHistoryTarget, setCardHistoryTarget] = useState<{ card: any; loading: boolean; transactions: any[] } | null>(null);

  const openCardHistory = async (vc: any) => {
    setCardHistoryTarget({ card: vc, loading: true, transactions: [] });
    try {
      const res = await portalApi.getVirtualCardTransactions(vc.id);
      setCardHistoryTarget({
        card: vc,
        loading: false,
        transactions: Array.isArray(res?.data?.transactions) ? res.data.transactions : [],
      });
    } catch {
      setCardHistoryTarget({ card: vc, loading: false, transactions: [] });
    }
  };

  const toggleReveal = async (vc: any) => {
    if (revealedDetails[vc.id]) {
      setRevealedDetails((prev) => ({ ...prev, [vc.id]: null }));
      return;
    }
    setRevealingId(vc.id);
    try {
      const res = await portalApi.getVirtualCardDetails(vc.id);
      if (!res.success || !res.data) {
        return Alert.alert('Card Details', res.error?.message || 'Unable to fetch live card details from issuer.');
      }
      setRevealedDetails((prev) => ({ ...prev, [vc.id]: res.data }));
    } finally {
      setRevealingId(null);
    }
  };
  const [fundTarget, setFundTarget] = useState<any>(null);
  const [withdrawTarget, setWithdrawTarget] = useState<any>(null);
  const [withdrawAmt, setWithdrawAmt] = useState('');
  const [withdrawDest, setWithdrawDest] = useState<'USD' | 'NGN'>('USD');

  const submitWithdraw = async () => {
    if (!withdrawTarget) return;
    const amt = Number(withdrawAmt);
    if (!amt || amt <= 0) return Alert.alert('Invalid Amount', 'Enter a valid amount to withdraw from your card.');
    setLoading(true);
    try {
      const res = await portalApi.withdrawVirtualCard(withdrawTarget.id, {
        amount: amt,
        destinationCurrency: withdrawTarget.currency === 'USD' ? withdrawDest : 'NGN',
      });
      if (!res.success) return Alert.alert('Withdrawal Failed', res.error?.message || 'Unable to unload card.');
      const sym = withdrawTarget.currency === 'USD' ? '$' : '\u20a6';
      Alert.alert('Card Unloaded', `${sym}${amt.toFixed(2)} withdrawn from your card into your ${res.data?.creditedCurrency || withdrawDest} wallet.`);
      setWithdrawTarget(null);
      setWithdrawAmt('');
      onRefresh();
    } finally {
      setLoading(false);
    }
  };
  const [fundAmt, setFundAmt] = useState('');
  const [liveUsdRate, setLiveUsdRate] = useState<number>(0);

  useEffect(() => {
    portalApi.getFxRates().then((res: any) => {
      const r = Number(res?.data?.rates?.NGN_USD_PRICE || res?.rates?.NGN_USD_PRICE || 0);
      if (r > 0) setLiveUsdRate(r);
    }).catch(() => {});
  }, []);
  const [pinTarget, setPinTarget] = useState<{ kind: 'virtual' | 'physical'; id: string; hasPin: boolean; label: string } | null>(null);
  const [newCardPin, setNewCardPin] = useState('');
  const [oldCardPin, setOldCardPin] = useState('');
  const [orderPin, setOrderPin] = useState('');
  const physFee = Number(customer?.physicalCardFeeNgn || 1500);

  const vCards = Array.isArray(customer?.virtualCards) ? customer.virtualCards : [];
  const pOrders = Array.isArray(customer?.physicalOrders) ? customer.physicalOrders : [];
  const titleColor = isDark ? '#F8FAFC' : '#0F172A';
  const mutedColor = isDark ? '#94A3B8' : '#64748B';
  const cardBg = isDark ? '#141B2D' : '#FFFFFF';
  const borderCol = isDark ? '#1E293B' : '#E2E8F0';

  const issueCard = async (cardScheme: string, currency: string) => {
    setLoading(true);
    try {
      const res = await portalApi.issueVirtualCard({ cardScheme, currency });
      if (!res.success) return Alert.alert('Card Issuance', res.error?.message || 'Unable to issue card.');
      Alert.alert('Card Issued ✓', `${currency} ${cardScheme} (${res.data?.maskedPan}) is now active!`);
      onRefresh();
    } finally {
      setLoading(false);
    }
  };

  const toggleBlock = async (kind: 'virtual' | 'physical', id: string, isBlocked: boolean) => {
    setLoading(true);
    try {
      const res = await portalApi.toggleCardBlock(kind, id, isBlocked);
      if (!res.success) return Alert.alert('Card Control', res.error?.message || 'Unable to update card block status.');
      Alert.alert('Updated ???', `Card ${isBlocked ? 'blocked' : 'unblocked'} successfully.`);
      onRefresh();
    } finally {
      setLoading(false);
    }
  };

  const handleSaveCardPin = async () => {
    if (!pinTarget) return;
    if (!/^\d{4}$/.test(newCardPin.trim())) {
      return Alert.alert('Invalid PIN', 'Enter a valid 4-digit Card PIN.');
    }
    if (pinTarget.hasPin && !/^\d{4}$/.test(oldCardPin.trim())) {
      return Alert.alert('Current PIN Required', 'Enter your current 4-digit Card PIN to change it.');
    }
    setLoading(true);
    try {
      const res = await portalApi.setCardPin(pinTarget.kind, pinTarget.id, {
        pin: newCardPin.trim(),
        oldPin: pinTarget.hasPin ? oldCardPin.trim() : undefined,
      });
      if (!res.success) return Alert.alert('Card PIN', res.error?.message || 'Could not save Card PIN.');
      Alert.alert('PIN Saved ???', 'Your 4-digit Card PIN has been updated.');
      setPinTarget(null);
      setNewCardPin('');
      setOldCardPin('');
      onRefresh();
    } finally {
      setLoading(false);
    }
  };

  const handleFundCard = async () => {
    if (!fundTarget || !fundAmt || Number(fundAmt) <= 0) {
      return Alert.alert('Invalid Amount', 'Enter a valid amount to fund this card.');
    }
    setLoading(true);
    try {
      const res = await portalApi.fundVirtualCard(fundTarget.id, Number(fundAmt));
      if (!res.success) return Alert.alert('Funding Failed', res.error?.message || 'Could not fund card.');
      setFundTarget(null);
      setFundAmt('');
      Alert.alert('Card Funded ✓', `Your ${fundTarget.currency} ${fundTarget.cardScheme} card has been topped up!`);
      onRefresh();
    } finally {
      setLoading(false);
    }
  };

  const orderPhysical = async () => {
    if (!address.trim()) return Alert.alert('Address Required', 'Enter your delivery address.');
    if (orderPin.trim() && !/^\d{4}$/.test(orderPin.trim())) {
      return Alert.alert('Invalid PIN', 'Optional Card PIN must be exactly 4 digits.');
    }
    setLoading(true);
    try {
      const res = await portalApi.orderPhysicalCard({
        cardScheme: 'VERVE',
        deliveryAddress: address.trim(),
        phone: phone.trim(),
        pin: orderPin.trim() || undefined,
      });
      if (!res.success) return Alert.alert('Order Failed', res.error?.message || 'Could not order physical card.');
      Alert.alert('Ordered ???', `Physical ATM Card ordered (???${Number(res.data?.feeNgn || physFee).toLocaleString()} deducted)! Tracking: ${res.data?.trackingNumber}`);
      setAddress('');
      setOrderPin('');
      onRefresh();
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 32 }}>
      <Card>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <Text style={[styles.title, { color: titleColor, marginBottom: 0 }]}>3D-Secure Virtual Cards</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Ionicons name="shield-checkmark" size={15} color={theme.accentColor} />
            <Text style={{ fontSize: 11, fontWeight: '800', color: theme.accentColor }}>Apple & Google Pay Ready</Text>
          </View>
        </View>

        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 14 }}>
          <View style={{ flex: 1 }}>
            <PrimaryButton title="+ USD Visa Card" onPress={() => issueCard('VISA', 'USD')} color={theme.accentColor} disabled={loading} />
          </View>
          <View style={{ flex: 1 }}>
            <PrimaryButton title="+ NGN Verve Card" onPress={() => issueCard('VERVE', 'NGN')} color={theme.primaryColor} disabled={loading} />
          </View>
        </View>

        {vCards.length === 0 ? (
          <View style={{ alignItems: 'center', paddingVertical: 18 }}>
            <Ionicons name="card-outline" size={36} color={mutedColor} />
            <Text style={{ color: mutedColor, fontSize: 13, marginTop: 6, textAlign: 'center' }}>
              No virtual cards issued yet. Tap + USD Visa or + NGN Verve above to create one instantly.
            </Text>
          </View>
        ) : (
          vCards.map((vc: any) => {
            const cardColor = vc.status === 'FROZEN' ? '#475569' : vc.currency === 'USD' ? theme.primaryColor : '#065F46';
            const details = revealedDetails[vc.id];
            const revealed = Boolean(details);
            const fullPan = details?.fullPan || vc.maskedPan;
            const cvv = details?.cvv || '';
            const billingAddress = details?.billingAddress || '';
            return (
              <View key={vc.id} style={[styles.visualCard, { backgroundColor: cardColor }]}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Ionicons name="wifi" size={16} color="rgba(255,255,255,0.85)" />
                    <Text style={styles.cardBrand}>
                      {theme.brandName.toUpperCase()} • {vc.currency} {vc.cardScheme}
                    </Text>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: vc.status === 'ACTIVE' ? '#10B981' : '#EF4444' }]}>
                    <Text style={{ color: '#fff', fontSize: 10, fontWeight: '900' }}>{vc.status}</Text>
                  </View>
                </View>

                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginVertical: 16 }}>
                  <Text style={styles.cardPan}>{revealed ? fullPan : vc.maskedPan}</Text>
                  <TouchableOpacity
                    onPress={async () => {
                      if (!revealed) return Alert.alert('Reveal First', 'Tap Show PAN/CVV to fetch the live card number first.');
                      await Clipboard.setStringAsync(String(fullPan).replace(/\s+/g, ''));
                      Alert.alert('Copied ✓', '16-digit card number copied to clipboard.');
                    }}
                    style={styles.copyIconBtn}
                  >
                    <Ionicons name="copy" size={15} color="#fff" />
                  </TouchableOpacity>
                </View>

                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                  <View>
                    <Text style={styles.cardMeta}>
                      EXP {vc.expiryMonth}/{vc.expiryYear} • CVV: {revealed ? cvv : '•••'}
                    </Text>
                    <Text style={styles.cardHolder}>{customer?.fullName?.toUpperCase()}</Text>
                  </View>
                  <Text style={styles.cardBal}>
                    {vc.currency === 'USD' ? '$' : '₦'}
                    {Number(vc.balance || 0).toLocaleString()}
                  </Text>
                </View>

                {revealed && (
                  <View style={styles.billingBox}>
                    <Text style={{ color: 'rgba(255,255,255,0.75)', fontSize: 10.5, fontWeight: '700' }}>BILLING ADDRESS</Text>
                    <Text style={{ color: '#fff', fontSize: 11.5, fontWeight: '700', marginTop: 2 }}>{billingAddress}</Text>
                  </View>
                )}

                {/* CARD ACTION BAR: SHOW DETAILS • + FUND CARD • FREEZE */}
                {/* CARD ACTION GRID: 2 NEAT ROWS x 3 COLUMNS */}
                <View style={styles.cardActionRow}>
                  <TouchableOpacity
                    onPress={() => toggleReveal(vc)}
                    style={styles.cardActionBtn}
                  >
                    <Ionicons name={revealed ? 'eye-off' : 'eye'} size={17} color="#fff" />
                    <Text style={styles.cardActionTxt} numberOfLines={1}>
                      {revealingId === vc.id ? 'Loading...' : revealed ? 'Hide Info' : 'Details'}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => setFundTarget(vc)}
                    style={[styles.cardActionBtn, { backgroundColor: theme.accentColor }]}
                  >
                    <Ionicons name="add-circle" size={17} color="#fff" />
                    <Text style={styles.cardActionTxt} numberOfLines={1}>Fund</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => { setWithdrawTarget(vc); setWithdrawAmt(''); setWithdrawDest(vc.currency === 'USD' ? 'USD' : 'NGN'); }}
                    style={styles.cardActionBtn}
                  >
                    <Ionicons name="arrow-down-circle" size={17} color="#fff" />
                    <Text style={styles.cardActionTxt} numberOfLines={1}>Withdraw</Text>
                  </TouchableOpacity>
                </View>

                <View style={[styles.cardActionRow, { marginTop: 8 }]}>
                  <TouchableOpacity
                    onPress={() => toggleBlock('virtual', vc.id, !(vc.isBlocked || vc.status === 'BLOCKED' || vc.status === 'FROZEN'))}
                    style={styles.cardActionBtn}
                  >
                    <Ionicons name={(vc.isBlocked || vc.status === 'BLOCKED' || vc.status === 'FROZEN') ? 'lock-open' : 'lock-closed'} size={17} color="#fff" />
                    <Text style={styles.cardActionTxt} numberOfLines={1}>
                      {(vc.isBlocked || vc.status === 'BLOCKED' || vc.status === 'FROZEN') ? 'Unblock' : 'Block'}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => setPinTarget({ kind: 'virtual', id: vc.id, hasPin: Boolean(vc.hasPin), label: `${vc.currency} ${vc.cardScheme} Virtual Card` })}
                    style={styles.cardActionBtn}
                  >
                    <Ionicons name="key" size={17} color="#fff" />
                    <Text style={styles.cardActionTxt} numberOfLines={1}>{vc.hasPin ? 'Change PIN' : 'Set PIN'}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => openCardHistory(vc)}
                    style={styles.cardActionBtn}
                  >
                    <Ionicons name="time" size={17} color="#fff" />
                    <Text style={styles.cardActionTxt} numberOfLines={1}>History</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })
        )}
      </Card>

      <Card>
        <Text style={[styles.title, { color: titleColor }]}>Order Physical Chip & PIN ATM Card</Text>
        <Text style={{ fontSize: 12, color: mutedColor, marginBottom: 10 }}>
          Card fee ({'\u20a6'}{physFee.toLocaleString()}) is deducted automatically from your NGN wallet balance.
        </Text>
        <Field label="Nationwide Delivery Address" value={address} onChangeText={setAddress} placeholder="12 Admiralty Way, Lekki Phase 1, Lagos" />
        <Field label="Contact Phone" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
        <Field label="Set 4-Digit Card PIN (Optional)" value={orderPin} onChangeText={setOrderPin} keyboardType="number-pad" maxLength={4} secureTextEntry placeholder="****" />
        <PrimaryButton title={loading ? 'Processing...' : `Order Physical ATM Card (\u20a6${physFee.toLocaleString()})`} onPress={orderPhysical} color={theme.primaryColor} disabled={loading} />

        {pOrders.length > 0 && (
          <View style={{ marginTop: 14 }}>
            <Text style={{ fontSize: 12.5, fontWeight: '800', color: titleColor, marginBottom: 8 }}>My Physical Card Orders</Text>
            {pOrders.map((po: any) => {
              const blocked = Boolean(po.isBlocked);
              const isDone = po.status === 'SHIPPED' || po.status === 'DELIVERED';
              const isProc = po.status === 'PROCESSED';
              return (
                <View key={po.id} style={[styles.orderRow, { borderColor: borderCol, flexDirection: 'column', alignItems: 'stretch', gap: 8 }]}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontWeight: '800', fontSize: 13, color: titleColor }}>
                        {theme.brandName} {po.cardScheme} Physical Card
                      </Text>
                      <Text style={{ fontSize: 11.5, color: mutedColor, marginTop: 2 }}>
                        Tracking: {po.trackingNumber} ??? {po.deliveryAddress}
                      </Text>
                      <Text style={{ fontSize: 11, color: mutedColor, marginTop: 2 }}>
                        Fee Paid: ???{Number(po.feeNgn || 0).toLocaleString()} {po.hasPin ? '??? PIN Set ???' : '??? PIN Not Set'}
                      </Text>
                    </View>
                    <View style={{ alignItems: 'flex-end', gap: 4 }}>
                      <View style={{ backgroundColor: isDone ? '#DCFCE7' : isProc ? '#DBEAFE' : '#FEF3C7', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999 }}>
                        <Text style={{ fontSize: 10.5, fontWeight: '900', color: isDone ? '#15803D' : isProc ? '#1D4ED8' : '#B45309' }}>{po.status}</Text>
                      </View>
                      {blocked && (
                        <View style={{ backgroundColor: '#FEE2E2', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 }}>
                          <Text style={{ fontSize: 9.5, fontWeight: '900', color: '#B91C1C' }}>BLOCKED ({po.blockedBy || 'USER'})</Text>
                        </View>
                      )}
                    </View>
                  </View>
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    <TouchableOpacity
                      onPress={() => toggleBlock('physical', po.id, !blocked)}
                      style={{ flex: 1, backgroundColor: blocked ? '#059669' : '#DC2626', paddingVertical: 8, borderRadius: 10, alignItems: 'center' }}
                    >
                      <Text style={{ color: '#fff', fontSize: 11.5, fontWeight: '800' }}>{blocked ? 'Unblock Card' : 'Block Card'}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => setPinTarget({ kind: 'physical', id: po.id, hasPin: Boolean(po.hasPin), label: `${po.cardScheme} Physical Card` })}
                      style={{ flex: 1, backgroundColor: theme.primaryColor, paddingVertical: 8, borderRadius: 10, alignItems: 'center' }}
                    >
                      <Text style={{ color: '#fff', fontSize: 11.5, fontWeight: '800' }}>{po.hasPin ? 'Change Card PIN' : 'Set Card PIN'}</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </Card>

      {/* SET / CHANGE CARD PIN MODAL */}
      <Modal visible={Boolean(pinTarget)} transparent animationType="slide" onRequestClose={() => setPinTarget(null)}>
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalSheet, { backgroundColor: cardBg }]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <Text style={{ fontSize: 17, fontWeight: '900', color: titleColor }}>
                {pinTarget?.hasPin ? 'Change 4-Digit Card PIN' : 'Set 4-Digit Card PIN'}
              </Text>
              <TouchableOpacity onPress={() => setPinTarget(null)}>
                <Ionicons name="close-circle" size={26} color={mutedColor} />
              </TouchableOpacity>
            </View>
            <Text style={{ fontSize: 12.5, color: mutedColor, marginBottom: 12 }}>{pinTarget?.label}</Text>
            {pinTarget?.hasPin && (
              <Field label="Current 4-Digit Card PIN" value={oldCardPin} onChangeText={setOldCardPin} keyboardType="number-pad" maxLength={4} secureTextEntry placeholder="****" />
            )}
            <Field label="New 4-Digit Card PIN" value={newCardPin} onChangeText={setNewCardPin} keyboardType="number-pad" maxLength={4} secureTextEntry placeholder="****" />
            <PrimaryButton title={loading ? 'Saving PIN...' : 'Save Card PIN ???'} onPress={handleSaveCardPin} color={theme.accentColor} disabled={loading} />
          </View>
        </View>
      </Modal>

      {/* FUND VIRTUAL CARD MODAL */}
      <Modal visible={Boolean(cardHistoryTarget)} transparent animationType="slide" onRequestClose={() => setCardHistoryTarget(null)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(15,23,42,0.55)', justifyContent: 'flex-end' }}>
          <View style={{ backgroundColor: isDark ? '#0F172A' : '#FFFFFF', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 18, maxHeight: '72%' }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <View>
                <Text style={{ fontSize: 16, fontWeight: '900', color: titleColor }}>Card Transaction History</Text>
                <Text style={{ fontSize: 12, color: mutedColor }}>
                  {cardHistoryTarget?.card?.currency} {cardHistoryTarget?.card?.cardScheme} ? {cardHistoryTarget?.card?.maskedPan}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setCardHistoryTarget(null)} style={{ padding: 6 }}>
                <Text style={{ fontWeight: '800', color: theme.primaryColor }}>Close</Text>
              </TouchableOpacity>
            </View>
            {cardHistoryTarget?.loading ? (
              <Text style={{ color: mutedColor, paddingVertical: 20, textAlign: 'center' }}>Loading live card transactions...</Text>
            ) : (cardHistoryTarget?.transactions || []).length === 0 ? (
              <Text style={{ color: mutedColor, paddingVertical: 20, textAlign: 'center' }}>No transactions recorded on this card yet.</Text>
            ) : (
              <ScrollView>
                {(cardHistoryTarget?.transactions || []).map((t: any, idx: number) => {
                  const sym = String(t.currency || cardHistoryTarget?.card?.currency || 'USD').toUpperCase() === 'USD' ? '$' : '\u20a6';
                  const isCredit = t.direction === 'CREDIT';
                  return (
                    <View key={t.id || idx} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: borderCol }}>
                      <View style={{ flex: 1, paddingRight: 10 }}>
                        <Text style={{ fontWeight: '800', fontSize: 13, color: titleColor }}>{t.narrative || t.type}</Text>
                        <Text style={{ fontSize: 11, color: mutedColor, marginTop: 2 }}>{t.type} ? {t.status} ? {new Date(t.createdAt).toLocaleString()}</Text>
                      </View>
                      <Text style={{ fontWeight: '900', fontSize: 13.5, color: isCredit ? '#10B981' : '#EF4444' }}>
                        {isCredit ? '+' : '-'}{sym}{Number(t.amount || 0).toFixed(2)}
                      </Text>
                    </View>
                  );
                })}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

            <Modal visible={Boolean(withdrawTarget)} transparent animationType="slide" onRequestClose={() => setWithdrawTarget(null)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(15,23,42,0.55)', justifyContent: 'flex-end' }}>
          <View style={{ backgroundColor: isDark ? '#0F172A' : '#FFFFFF', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 18 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <Text style={{ fontSize: 16, fontWeight: '900', color: titleColor }}>Withdraw / Unload {withdrawTarget?.currency} Card</Text>
              <TouchableOpacity onPress={() => setWithdrawTarget(null)} style={{ padding: 4 }}>
                <Text style={{ fontWeight: '800', color: theme.primaryColor }}>Close</Text>
              </TouchableOpacity>
            </View>
            <Text style={{ fontSize: 12, color: mutedColor, marginBottom: 12 }}>
              Available on card: {withdrawTarget?.currency === 'USD' ? '$' : '\u20a6'}{Number(withdrawTarget?.balance || 0).toFixed(2)} ({withdrawTarget?.maskedPan})
            </Text>
            <Field
              label={`Amount to Withdraw (${withdrawTarget?.currency || 'USD'})`}
              value={withdrawAmt}
              onChangeText={setWithdrawAmt}
              keyboardType="decimal-pad"
              placeholder="e.g. 2"
            />
            {withdrawTarget?.currency === 'USD' && (
              <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
                <TouchableOpacity
                  onPress={() => setWithdrawDest('USD')}
                  style={{ flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center', backgroundColor: withdrawDest === 'USD' ? theme.primaryColor : (isDark ? '#1E293B' : '#F1F5F9') }}
                >
                  <Text style={{ fontWeight: '800', fontSize: 12, color: withdrawDest === 'USD' ? '#fff' : titleColor }}>Credit USD Wallet</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setWithdrawDest('NGN')}
                  style={{ flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center', backgroundColor: withdrawDest === 'NGN' ? theme.primaryColor : (isDark ? '#1E293B' : '#F1F5F9') }}
                >
                  <Text style={{ fontWeight: '800', fontSize: 12, color: withdrawDest === 'NGN' ? '#fff' : titleColor }}>Credit NGN Wallet</Text>
                </TouchableOpacity>
              </View>
            )}
            <PrimaryButton title={loading ? 'Processing...' : 'Confirm Card Withdrawal'} onPress={submitWithdraw} color={theme.primaryColor} disabled={loading} />
          </View>
        </View>
      </Modal>

            <Modal visible={Boolean(fundTarget)} transparent animationType="slide" onRequestClose={() => setFundTarget(null)}>
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalSheet, { backgroundColor: cardBg }]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <Text style={{ fontSize: 17, fontWeight: '900', color: titleColor }}>
                Fund {fundTarget?.currency} {fundTarget?.cardScheme} Card
              </Text>
              <TouchableOpacity onPress={() => setFundTarget(null)}>
                <Ionicons name="close-circle" size={26} color={mutedColor} />
              </TouchableOpacity>
            </View>
            <Text style={{ fontSize: 12.5, color: mutedColor, marginBottom: 12 }}>
              {fundTarget?.currency === 'USD'
                ? (liveUsdRate > 0 ? `Top up your USD card from your USD, USDT, or NGN wallet (Live rate: $1 = \u20a6${liveUsdRate.toLocaleString('en-NG')}).` : 'Top up your USD card at the live real-time FX rate.')
                : 'Top up your NGN card instantly from your NGN wallet balance.'}
            </Text>
            <Field
              label={`Amount to Add (${fundTarget?.currency || 'USD'})`}
              value={fundAmt}
              onChangeText={setFundAmt}
              keyboardType="numeric"
              placeholder={fundTarget?.currency === 'USD' ? '25' : '5000'}
            />
            {fundTarget?.currency === 'USD' && Number(fundAmt) > 0 && (
              <Text style={{ fontSize: 12, fontWeight: '800', color: theme.accentColor, marginBottom: 12 }}>
                Wallet Debit: {liveUsdRate > 0 ? `\u20a6${Math.ceil(Number(fundAmt) * liveUsdRate).toLocaleString('en-NG')}` : `$${Number(fundAmt).toFixed(2)} USD`}
              </Text>
            )}
            <PrimaryButton
              title={loading ? 'Funding Card...' : `Confirm Top-Up →`}
              onPress={handleFundCard}
              color={theme.accentColor}
              disabled={loading}
            />
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 16, fontWeight: '900', marginBottom: 12 },
  visualCard: { borderRadius: 20, padding: 18, marginBottom: 14, shadowColor: '#0f172a', shadowOpacity: 0.18, shadowRadius: 12, elevation: 5 },
  cardBrand: { color: 'rgba(255,255,255,0.9)', fontSize: 11.5, fontWeight: '900', letterSpacing: 0.8 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
  cardPan: { color: '#ffffff', fontSize: 19, fontWeight: '900', letterSpacing: 1.8 },
  copyIconBtn: { backgroundColor: 'rgba(255,255,255,0.2)', padding: 7, borderRadius: 999 },
  cardMeta: { color: 'rgba(255,255,255,0.8)', fontSize: 11.5, fontWeight: '700' },
  cardHolder: { color: '#ffffff', fontSize: 13.5, fontWeight: '800', marginTop: 3 },
  cardBal: { color: '#ffffff', fontSize: 22, fontWeight: '900' },
  billingBox: { marginTop: 12, padding: 10, borderRadius: 12, backgroundColor: 'rgba(0,0,0,0.22)' },
  cardActionRow: { flexDirection: 'row', gap: 8, marginTop: 14 },
  cardActionBtn: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.16)',
    paddingVertical: 10,
    paddingHorizontal: 6,
    borderRadius: 12,
  },
  cardActionTxt: { color: '#fff', fontSize: 11.5, fontWeight: '800', letterSpacing: 0.2 },
  orderRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderTopWidth: 1, gap: 10 },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(15,23,42,0.58)', justifyContent: 'flex-end' },
  modalSheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 32 },
});
