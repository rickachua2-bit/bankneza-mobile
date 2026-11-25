import React, { useEffect, useState } from 'react';
import { Alert, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { Ionicons } from '@expo/vector-icons';
import { useTenantTheme } from '../theme/ThemeProvider';
import { clearToken, portalApi } from '../services/api';
import { Field, PrimaryButton } from '../components/Ui';

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
  const isDark = theme.isDark;
  const pageBg = isDark ? '#0B0F1A' : '#F3F6FB';
  const cardBg = isDark ? '#141B2D' : '#FFFFFF';
  const titleColor = isDark ? '#F8FAFC' : '#0F172A';
  const mutedColor = isDark ? '#94A3B8' : '#64748B';
  const borderCol = isDark ? '#1E293B' : '#E2E8F0';

  const [bvn, setBvn] = useState('');
  const [nin, setNin] = useState('');
  const [rcNumber, setRcNumber] = useState('');
  const [totpSecret, setTotpSecret] = useState('');
  const [totpCode, setTotpCode] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [tickets, setTickets] = useState<any[]>([]);
  const [activeChatTicket, setActiveChatTicket] = useState<any>(null);
  const [chatInput, setChatInput] = useState('');
  const [curPass, setCurPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [newPin, setNewPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeModal, setActiveModal] = useState<null | 'kyc' | '2fa' | 'password' | 'pin' | 'support' | 'legal' | 'accounts'>(null);

  const isKycVerified = customer?.kycStatus === 'VERIFIED' || Number(customer?.kycTier || 0) >= 2;
  const provisionedAccounts: Array<{ currency: string; accountNumber: string; bankName: string; routingNumber?: string }> =
    Array.isArray(customer?.provisionedAccounts) ? customer.provisionedAccounts : [];
  const initials = String(customer?.fullName || 'U')
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0] || '')
    .join('')
    .toUpperCase();

  useEffect(() => {
    portalApi.getSupportTickets().then((r) => {
      if (r.success && Array.isArray(r.data)) setTickets(r.data);
    }).catch(() => {});
  }, []);

  const copyText = async (label: string, val: string) => {
    await Clipboard.setStringAsync(val);
    Alert.alert('Copied ✓', `${label} copied to clipboard.`);
  };

  const handleKyc = async () => {
    if (!/^\d{11}$/.test(bvn.trim()) && !/^\d{11}$/.test(nin.trim())) {
      return Alert.alert('Required', 'Enter a valid 11-digit BVN or NIN.');
    }
    setLoading(true);
    try {
      const res = await portalApi.submitKyc({
        bvn: bvn.trim() || undefined,
        nin: nin.trim() || undefined,
        rcNumber: rcNumber.trim().toUpperCase() || undefined,
      });
      if (!res.success) return Alert.alert('Verification Failed', res.error?.message || 'Could not verify.');
      setActiveModal(null);
      Alert.alert('Verified ✓', res.data?.message || 'KYC approved & multi-currency accounts unlocked!');
      onRefresh();
    } finally {
      setLoading(false);
    }
  };

  const handleSetup2fa = async () => {
    setLoading(true);
    try {
      const res = await portalApi.setup2fa();
      if (!res.success) return Alert.alert('2FA Setup', res.error?.message || 'Could not initialize 2FA.');
      setTotpSecret(res.data?.secret || '');
    } finally {
      setLoading(false);
    }
  };

  const handleVerify2fa = async () => {
    if (!/^\d{6}$/.test(totpCode.trim())) return Alert.alert('Invalid Code', 'Enter the 6-digit Authenticator code.');
    setLoading(true);
    try {
      const res = await portalApi.verify2fa(totpCode.trim());
      if (!res.success) return Alert.alert('2FA Failed', res.error?.message || 'Invalid code.');
      setTotpSecret('');
      setTotpCode('');
      setActiveModal(null);
      Alert.alert('2FA Enabled ✓', 'Two-Factor Authenticator protection is now active.');
      onRefresh();
    } finally {
      setLoading(false);
    }
  };

  const handleSavePin = async () => {
    if (!/^\d{4}$/.test(newPin.trim())) return Alert.alert('Invalid PIN', 'Enter a 4-digit numeric Transfer PIN.');
    setLoading(true);
    try {
      const res = await portalApi.setTransferPin(newPin.trim());
      if (!res.success) return Alert.alert('Error', res.error?.message || 'Could not save Transfer PIN.');
      setNewPin('');
      setActiveModal(null);
      Alert.alert('Transfer PIN Saved ?', 'Your 4-digit Transfer PIN is now active for all transfers.');
      onRefresh();
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async () => {
    if (!curPass || newPass.length < 8) return Alert.alert('Required', 'Enter current password and a new password (min 8 chars).');
    setLoading(true);
    try {
      const res = await portalApi.changePassword({ currentPassword: curPass, newPassword: newPass });
      if (!res.success) return Alert.alert('Error', res.error?.message || 'Could not update password.');
      setCurPass('');
      setNewPass('');
      setActiveModal(null);
      Alert.alert('Password Updated ✓', 'Your password has been changed.');
    } finally {
      setLoading(false);
    }
  };

  const handleTicket = async () => {
    if (!subject.trim() || !message.trim()) return Alert.alert('Required', 'Enter subject and message.');
    setLoading(true);
    try {
      const res = await portalApi.createSupportTicket({ subject: subject.trim(), category: 'GENERAL', message: message.trim() });
      if (!res.success) return Alert.alert('Error', res.error?.message || 'Could not submit ticket.');
      setSubject('');
      setMessage('');
      Alert.alert('Ticket Sent ✓', 'Our support team will respond shortly.');
      const r = await portalApi.getSupportTickets();
      if (r.success && Array.isArray(r.data)) setTickets(r.data);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'Are you sure you want to permanently deactivate and schedule your account for deletion? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Permanently',
          style: 'destructive',
          onPress: async () => {
            const res = await portalApi.deleteAccount();
            if (!res.success) return Alert.alert('Error', res.error?.message || 'Could not delete account.');
            await clearToken();
            Alert.alert('Account Deactivated', res.data?.message || 'Your account has been scheduled for deletion.');
            onSignOut();
          },
        },
      ]
    );
  };

  const handleSignOut = async () => {
    await clearToken();
    onSignOut();
  };

  const RowItem = ({
    icon,
    iconBg,
    iconColor,
    title,
    subtitle,
    badge,
    onPress,
    danger,
  }: {
    icon: any;
    iconBg: string;
    iconColor: string;
    title: string;
    subtitle?: string;
    badge?: string;
    onPress: () => void;
    danger?: boolean;
  }) => (
    <TouchableOpacity onPress={onPress} style={[styles.row, { borderBottomColor: borderCol }]}>
      <View style={[styles.rowIcon, { backgroundColor: iconBg }]}>
        <Ionicons name={icon} size={20} color={iconColor} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontWeight: '700', fontSize: 14, color: danger ? '#DC2626' : titleColor }}>{title}</Text>
        {subtitle ? <Text style={{ fontSize: 12, color: mutedColor, marginTop: 2 }}>{subtitle}</Text> : null}
      </View>
      {badge ? (
        <View style={{ backgroundColor: '#DCFCE7', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999, marginRight: 6 }}>
          <Text style={{ fontSize: 10.5, fontWeight: '800', color: '#15803D' }}>{badge}</Text>
        </View>
      ) : null}
      <Ionicons name="chevron-forward" size={18} color={mutedColor} />
    </TouchableOpacity>
  );

  return (
    <ScrollView style={{ flex: 1, backgroundColor: pageBg }} contentContainerStyle={styles.container}>
      {/* PROFILE HERO */}
      <View style={[styles.heroCard, { backgroundColor: theme.primaryColor }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
          <View style={styles.avatar}>
            <Text style={{ color: theme.primaryColor, fontWeight: '900', fontSize: 20 }}>{initials}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ color: '#fff', fontSize: 18, fontWeight: '900' }}>{customer?.fullName || 'Customer'}</Text>
            <Text style={{ color: 'rgba(255,255,255,0.82)', fontSize: 12.5, marginTop: 2 }}>{customer?.email}</Text>
            <Text style={{ color: 'rgba(255,255,255,0.75)', fontSize: 12, marginTop: 1 }}>{customer?.phone}</Text>
          </View>
        </View>
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 14, flexWrap: 'wrap' }}>
          <View style={styles.heroPill}>
            <Ionicons name={isKycVerified ? 'checkmark-circle' : 'alert-circle'} size={14} color="#fff" />
            <Text style={styles.heroPillTxt}>{isKycVerified ? `KYC Tier ${customer?.kycTier || 2} Verified` : 'KYC Pending'}</Text>
          </View>
          {customer?.referralCode ? (
            <TouchableOpacity onPress={() => copyText('Referral Code', customer.referralCode)} style={styles.heroPill}>
              <Ionicons name="gift" size={13} color="#fff" />
              <Text style={styles.heroPillTxt}>Ref: {customer.referralCode}</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      {/* ACCOUNT & VERIFICATION */}
      <Text style={[styles.groupLabel, { color: mutedColor }]}>ACCOUNT &amp; VERIFICATION</Text>
      <View style={[styles.groupCard, { backgroundColor: cardBg, borderColor: borderCol }]}>
        <RowItem
          icon="wallet"
          iconBg="#EFF6FF"
          iconColor={theme.accentColor}
          title="Multi-Currency Bank Accounts"
          subtitle={`${provisionedAccounts.length || (customer?.virtualAccountNumber ? 1 : 0)} active account(s) — NGN, USD, GBP, EUR`}
          onPress={() => setActiveModal('accounts')}
        />
        <RowItem
          icon="shield-checkmark"
          iconBg="#ECFDF5"
          iconColor="#10B981"
          title="Identity Verification (KYC / KYB)"
          subtitle={isKycVerified ? `Verified (Tier ${customer?.kycTier || 2})` : 'Verify BVN, NIN, or Business RC'}
          badge={isKycVerified ? 'VERIFIED' : undefined}
          onPress={() => setActiveModal('kyc')}
        />
      </View>

      {/* SECURITY & PRIVACY */}
      <Text style={[styles.groupLabel, { color: mutedColor }]}>SECURITY &amp; PRIVACY</Text>
      <View style={[styles.groupCard, { backgroundColor: cardBg, borderColor: borderCol }]}>
        <RowItem
          icon="key"
          iconBg="#F5F3FF"
          iconColor="#7C3AED"
          title="2FA Authenticator App"
          subtitle={customer?.totpEnabled ? 'Active — protects transfers & login' : 'Free on all plans — tap to enable'}
          badge={customer?.totpEnabled ? 'ON' : undefined}
          onPress={() => setActiveModal('2fa')}
        />
        <RowItem
          icon="shield-checkmark"
          iconBg="#ECFDF5"
          iconColor="#059669"
          title="4-Digit Transfer PIN"
          subtitle={customer?.hasTransferPin ? 'PIN active ? tap to update' : 'Not set ? tap to create Transfer PIN'}
          badge={customer?.hasTransferPin ? 'SET' : 'NEW'}
          onPress={() => setActiveModal('pin')}
        />
        <RowItem
          icon="lock-closed"
          iconBg="#FEF3C7"
          iconColor="#D97706"
          title="Change Password"
          subtitle="Update your account login password"
          onPress={() => setActiveModal('password')}
        />
      </View>

      {/* SUPPORT & LEGAL (PLAY STORE / APP STORE REQUIRED) */}
      <Text style={[styles.groupLabel, { color: mutedColor }]}>SUPPORT &amp; LEGAL</Text>
      <View style={[styles.groupCard, { backgroundColor: cardBg, borderColor: borderCol }]}>
        <RowItem
          icon="headset"
          iconBg="#E0F2FE"
          iconColor="#0284C7"
          title="Help &amp; Support Center"
          subtitle={`${tickets.length} ticket(s) • ${theme.supportEmail || '24/7 Support'}`}
          onPress={() => setActiveModal('support')}
        />
        <RowItem
          icon="document-text"
          iconBg="#F1F5F9"
          iconColor="#475569"
          title="Privacy Policy &amp; Terms of Service"
          subtitle="Data safety, NDPR/GDPR &amp; regulatory disclosures"
          onPress={() => setActiveModal('legal')}
        />
        <RowItem
          icon="trash"
          iconBg="#FEE2E2"
          iconColor="#DC2626"
          title="Delete Account"
          subtitle="Permanently close account &amp; request data deletion"
          danger
          onPress={handleDeleteAccount}
        />
      </View>

      <TouchableOpacity onPress={handleSignOut} style={[styles.signOutBtn, { backgroundColor: cardBg, borderColor: borderCol }]}>
        <Ionicons name="log-out-outline" size={20} color="#DC2626" />
        <Text style={{ color: '#DC2626', fontWeight: '800', fontSize: 14.5 }}>Sign Out</Text>
      </TouchableOpacity>
      <Text style={{ textAlign: 'center', color: mutedColor, fontSize: 11.5, marginTop: 12 }}>
        {theme.brandName} Mobile • Version 1.0.0
      </Text>

      {/* MULTI-CURRENCY ACCOUNTS MODAL */}
      <Modal visible={activeModal === 'accounts'} transparent animationType="slide" onRequestClose={() => setActiveModal(null)}>
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalSheet, { backgroundColor: cardBg }]}>
            <View style={styles.modalHdr}>
              <Text style={[styles.modalTitle, { color: titleColor }]}>Your Multi-Currency Accounts</Text>
              <TouchableOpacity onPress={() => setActiveModal(null)}><Ionicons name="close-circle" size={24} color={mutedColor} /></TouchableOpacity>
            </View>
            <ScrollView style={{ maxHeight: 380 }}>
              {provisionedAccounts.length === 0 && customer?.virtualAccountNumber ? (
                <View style={[styles.accBox, { borderColor: borderCol }]}>
                  <Text style={{ fontWeight: '800', color: titleColor }}>NGN • {customer.virtualAccountBank}</Text>
                  <Text style={{ fontSize: 17, fontWeight: '900', color: theme.accentColor, marginVertical: 4 }}>{customer.virtualAccountNumber}</Text>
                  <TouchableOpacity onPress={() => copyText('Account Number', customer.virtualAccountNumber)}>
                    <Text style={{ color: theme.primaryColor, fontWeight: '700', fontSize: 12.5 }}>Copy Account Number</Text>
                  </TouchableOpacity>
                </View>
              ) : provisionedAccounts.length === 0 ? (
                <Text style={{ color: mutedColor, textAlign: 'center', paddingVertical: 20 }}>Complete KYC verification to unlock your NGN, USD, GBP &amp; EUR accounts.</Text>
              ) : (
                provisionedAccounts.map((a, idx) => (
                  <View key={`${a.currency}-${idx}`} style={[styles.accBox, { borderColor: borderCol }]}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Text style={{ fontWeight: '800', color: titleColor }}>{a.currency} • {a.bankName}</Text>
                      <TouchableOpacity onPress={() => copyText(`${a.currency} Account`, a.accountNumber)}>
                        <Ionicons name="copy" size={18} color={theme.accentColor} />
                      </TouchableOpacity>
                    </View>
                    <Text style={{ fontSize: 15.5, fontWeight: '900', color: theme.accentColor, marginTop: 4 }}>{a.accountNumber}</Text>
                    {a.routingNumber ? <Text style={{ fontSize: 11.5, color: mutedColor, marginTop: 2 }}>Routing / Sort: {a.routingNumber}</Text> : null}
                  </View>
                ))
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* KYC MODAL */}
      <Modal visible={activeModal === 'kyc'} transparent animationType="slide" onRequestClose={() => setActiveModal(null)}>
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalSheet, { backgroundColor: cardBg }]}>
            <View style={styles.modalHdr}>
              <Text style={[styles.modalTitle, { color: titleColor }]}>Identity Verification (KYC / KYB)</Text>
              <TouchableOpacity onPress={() => setActiveModal(null)}><Ionicons name="close-circle" size={24} color={mutedColor} /></TouchableOpacity>
            </View>
            <Field label="11-Digit BVN" value={bvn} onChangeText={setBvn} keyboardType="number-pad" maxLength={11} placeholder="22123456789" />
            <Field label="11-Digit NIN (Optional)" value={nin} onChangeText={setNin} keyboardType="number-pad" maxLength={11} placeholder="12345678901" />
            <Field label="CAC RC Number (For Tier 3 Business KYB)" value={rcNumber} onChangeText={setRcNumber} autoCapitalize="characters" placeholder="Optional — RC1234567" />
            <PrimaryButton title="Submit Verification →" onPress={handleKyc} loading={loading} color={theme.accentColor} />
          </View>
        </View>
      </Modal>

      {/* 2FA MODAL */}
      <Modal visible={activeModal === '2fa'} transparent animationType="slide" onRequestClose={() => setActiveModal(null)}>
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalSheet, { backgroundColor: cardBg }]}>
            <View style={styles.modalHdr}>
              <Text style={[styles.modalTitle, { color: titleColor }]}>2FA Authenticator Setup</Text>
              <TouchableOpacity onPress={() => setActiveModal(null)}><Ionicons name="close-circle" size={24} color={mutedColor} /></TouchableOpacity>
            </View>
            {!totpSecret ? (
              <PrimaryButton title="Generate 2FA Secret Key" onPress={handleSetup2fa} loading={loading} color={theme.primaryColor} />
            ) : (
              <>
                <Text style={{ fontSize: 12.5, color: mutedColor, marginBottom: 8 }}>Copy this secret into Google Authenticator or Authy:</Text>
                <TouchableOpacity onPress={() => copyText('2FA Secret', totpSecret)} style={[styles.accBox, { borderColor: borderCol }]}>
                  <Text style={{ fontWeight: '900', fontSize: 15, color: theme.accentColor }}>{totpSecret}</Text>
                </TouchableOpacity>
                <Field label="Enter 6-Digit Authenticator Code" value={totpCode} onChangeText={setTotpCode} keyboardType="number-pad" maxLength={6} placeholder="123456" />
                <PrimaryButton title="Confirm & Enable 2FA →" onPress={handleVerify2fa} loading={loading} color={theme.accentColor} />
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* TRANSFER PIN MODAL */}
      <Modal visible={activeModal === 'pin'} transparent animationType="slide" onRequestClose={() => setActiveModal(null)}>
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalSheet, { backgroundColor: cardBg }]}>
            <View style={styles.modalHdr}>
              <Text style={[styles.modalTitle, { color: titleColor }]}>4-Digit Transfer PIN</Text>
              <TouchableOpacity onPress={() => setActiveModal(null)}><Ionicons name="close-circle" size={24} color={mutedColor} /></TouchableOpacity>
            </View>
            <Field label="Enter 4-Digit Transfer PIN" value={newPin} onChangeText={setNewPin} keyboardType="number-pad" maxLength={4} secureTextEntry placeholder="1234" />
            <PrimaryButton title="Save Transfer PIN ?" onPress={handleSavePin} loading={loading} color={theme.accentColor} />
          </View>
        </View>
      </Modal>

      {/* CHANGE PASSWORD MODAL */}
      <Modal visible={activeModal === 'password'} transparent animationType="slide" onRequestClose={() => setActiveModal(null)}>
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalSheet, { backgroundColor: cardBg }]}>
            <View style={styles.modalHdr}>
              <Text style={[styles.modalTitle, { color: titleColor }]}>Change Password</Text>
              <TouchableOpacity onPress={() => setActiveModal(null)}><Ionicons name="close-circle" size={24} color={mutedColor} /></TouchableOpacity>
            </View>
            <Field label="Current Password" value={curPass} onChangeText={setCurPass} secureTextEntry placeholder="••••••••" />
            <Field label="New Password (min 8 chars)" value={newPass} onChangeText={setNewPass} secureTextEntry placeholder="••••••••" />
            <PrimaryButton title="Update Password →" onPress={handleChangePassword} loading={loading} color={theme.primaryColor} />
          </View>
        </View>
      </Modal>

      {/* SUPPORT & LIVE CHAT MODAL */}
      <Modal visible={activeModal === 'support'} transparent animationType="slide" onRequestClose={() => { setActiveChatTicket(null); setActiveModal(null); }}>
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalSheet, { backgroundColor: cardBg }]}>
            <View style={styles.modalHdr}>
              <Text style={[styles.modalTitle, { color: titleColor }]}>
                {activeChatTicket ? `Chat: ${activeChatTicket.subject}` : 'Help, Support & Live Chat'}
              </Text>
              <TouchableOpacity onPress={() => { if (activeChatTicket) setActiveChatTicket(null); else setActiveModal(null); }}>
                <Ionicons name={activeChatTicket ? 'arrow-back-circle' : 'close-circle'} size={25} color={mutedColor} />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              onPress={() => copyText('Support Email', theme.supportEmail || 'support@bankneza.com')}
              style={[styles.accBox, { borderColor: borderCol, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }]}
            >
              <View>
                <Text style={{ fontSize: 10.5, fontWeight: '800', color: mutedColor }}>DIRECT SUPPORT EMAIL</Text>
                <Text style={{ fontSize: 13.5, fontWeight: '900', color: theme.accentColor, marginTop: 2 }}>
                  {theme.supportEmail || 'support@bankneza.com'}
                </Text>
              </View>
              <Ionicons name="copy" size={18} color={theme.accentColor} />
            </TouchableOpacity>

            {activeChatTicket ? (
              <View>
                <ScrollView style={{ maxHeight: 240, marginBottom: 12 }}>
                  {(Array.isArray(activeChatTicket.chatMessages) && activeChatTicket.chatMessages.length > 0
                    ? activeChatTicket.chatMessages
                    : [{ senderName: customer?.fullName || 'You', senderRole: 'CUSTOMER', text: activeChatTicket.message, createdAt: activeChatTicket.createdAt }]
                  ).map((m: any, idx: number) => {
                    const isCustomer = m.senderRole === 'CUSTOMER';
                    return (
                      <View
                        key={idx}
                        style={{
                          alignSelf: isCustomer ? 'flex-end' : 'flex-start',
                          maxWidth: '82%',
                          backgroundColor: isCustomer ? `${theme.accentColor}1E` : isDark ? '#1E293B' : '#F1F5F9',
                          padding: 10,
                          borderRadius: 12,
                          marginBottom: 8,
                        }}
                      >
                        <Text style={{ fontSize: 10.5, fontWeight: '800', color: isCustomer ? theme.accentColor : titleColor }}>
                          {isCustomer ? 'You' : m.senderName || `${theme.brandName} Support`}
                        </Text>
                        <Text style={{ fontSize: 13, color: titleColor, marginTop: 2 }}>{m.text}</Text>
                      </View>
                    );
                  })}
                </ScrollView>
                <Field label="Reply Message" value={chatInput} onChangeText={setChatInput} placeholder="Type your message to support..." />
                <PrimaryButton
                  title="Send Chat Message →"
                  loading={loading}
                  color={theme.accentColor}
                  onPress={async () => {
                    if (!chatInput.trim()) return;
                    setLoading(true);
                    try {
                      const res = await portalApi.sendSupportChat(activeChatTicket.id, chatInput.trim());
                      if (res.success) {
                        setChatInput('');
                        setActiveChatTicket(res.data);
                        const r = await portalApi.getSupportTickets();
                        if (r.success && Array.isArray(r.data)) setTickets(r.data);
                      } else {
                        Alert.alert('Error', res.error?.message || 'Could not send message.');
                      }
                    } finally {
                      setLoading(false);
                    }
                  }}
                />
              </View>
            ) : (
              <ScrollView style={{ maxHeight: 360 }}>
                <Field label="Subject" value={subject} onChangeText={setSubject} placeholder="e.g. Transfer or card inquiry" />
                <Field label="Message" value={message} onChangeText={setMessage} placeholder="Describe how we can help..." multiline />
                <PrimaryButton title="Open New Support Ticket →" onPress={handleTicket} loading={loading} color={theme.accentColor} />

                {tickets.length > 0 && (
                  <View style={{ marginTop: 14 }}>
                    <Text style={{ fontSize: 12.5, fontWeight: '900', color: titleColor, marginBottom: 8 }}>
                      My Support Tickets (Tap to Chat)
                    </Text>
                    {tickets.map((t) => (
                      <TouchableOpacity
                        key={t.id}
                        onPress={() => setActiveChatTicket(t)}
                        style={[styles.accBox, { borderColor: borderCol }]}
                      >
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Text style={{ fontWeight: '800', fontSize: 13, color: titleColor }}>{t.subject}</Text>
                          <Text style={{ fontSize: 10.5, fontWeight: '900', color: t.status === 'RESOLVED' ? '#15803D' : '#D97706' }}>
                            {t.status}
                          </Text>
                        </View>
                        <Text style={{ fontSize: 12, color: mutedColor, marginTop: 3 }} numberOfLines={2}>
                          {t.adminReply ? `Support: ${t.adminReply}` : t.message}
                        </Text>
                        <Text style={{ fontSize: 11, fontWeight: '800', color: theme.accentColor, marginTop: 4 }}>
                          Open Live Chat ({Array.isArray(t.chatMessages) ? t.chatMessages.length : 1}) →
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* LEGAL & PRIVACY MODAL */}
      <Modal visible={activeModal === 'legal'} transparent animationType="slide" onRequestClose={() => setActiveModal(null)}>
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalSheet, { backgroundColor: cardBg }]}>
            <View style={styles.modalHdr}>
              <Text style={[styles.modalTitle, { color: titleColor }]}>Privacy Policy &amp; Terms</Text>
              <TouchableOpacity onPress={() => setActiveModal(null)}><Ionicons name="close-circle" size={24} color={mutedColor} /></TouchableOpacity>
            </View>
            <ScrollView style={{ maxHeight: 320 }}>
              <Text style={{ fontSize: 13, color: mutedColor, lineHeight: 20 }}>
                {theme.brandName} protects your personal and financial data using bank-grade AES-256 encryption, TLS 1.3 transport security, and strict KYC/AML compliance standards.{"\n\n"}
                • Identity Data (BVN, NIN, CAC) is used strictly for regulatory verification and virtual account issuance.{"\n"}
                • You may request permanent account and data deletion at any time from Profile → Delete Account.{"\n"}
                • Support contact: {theme.supportEmail || 'support@slikpay.online'}.
              </Text>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, paddingBottom: 36 },
  heroCard: { borderRadius: 22, padding: 18, marginBottom: 18 },
  avatar: { width: 54, height: 54, borderRadius: 27, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  heroPill: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: 'rgba(255,255,255,0.18)', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999 },
  heroPillTxt: { color: '#fff', fontSize: 11.5, fontWeight: '700' },
  groupLabel: { fontSize: 11, fontWeight: '800', letterSpacing: 0.7, marginBottom: 8, marginLeft: 4 },
  groupCard: { borderRadius: 18, borderWidth: 1, marginBottom: 16, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderBottomWidth: 1 },
  rowIcon: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  signOutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 14, borderRadius: 16, borderWidth: 1 },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(15,23,42,0.55)', justifyContent: 'flex-end' },
  modalSheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 32 },
  modalHdr: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  modalTitle: { fontSize: 17, fontWeight: '900' },
  accBox: { borderWidth: 1, borderRadius: 12, padding: 12, marginBottom: 10 },
});
