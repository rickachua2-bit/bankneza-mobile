import React, { useState } from 'react';
import { Alert, Image, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTenantTheme } from '../theme/ThemeProvider';
import { portalApi, setToken } from '../services/api';
import { Card, Field, PrimaryButton } from '../components/Ui';

export function AuthScreen({ onAuthenticated }: { onAuthenticated: () => void }) {
  const theme = useTenantTheme();
  const [mode, setMode] = useState<'login' | 'register' | 'verify_email'>('login');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [referralCode, setReferralCode] = useState('');
  const [totpCode, setTotpCode] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [needs2fa, setNeeds2fa] = useState(false);
  const [loading, setLoading] = useState(false);

  const submitLogin = async () => {
    if (!email.trim() || !password) return Alert.alert('Required', 'Enter your email and password.');
    setLoading(true);
    try {
      const res = await portalApi.login({
        email: email.trim().toLowerCase(),
        password,
        ...(totpCode.trim() ? { totpCode: totpCode.trim() } : {}),
      });
      if (res.success && res.data?.requiresEmailVerification) {
        setMode('verify_email');
        return Alert.alert('Verify Email', res.data.message || 'Enter the 6-digit code sent to your email.');
      }
      if (!res.success) {
        if (res.error?.requires2fa || res.error?.code === '2FA_REQUIRED') {
          setNeeds2fa(true);
          return Alert.alert('2FA Required', 'Enter the 6-digit code from your Authenticator app.');
        }
        return Alert.alert('Sign In Failed', res.error?.message || 'Invalid credentials.');
      }
      if (res.data?.token) {
        await setToken(res.data.token);
        onAuthenticated();
      }
    } catch (e: any) {
      Alert.alert('Connection Error', e?.message || 'Unable to reach server.');
    } finally {
      setLoading(false);
    }
  };

  const submitRegister = async () => {
    if (!fullName.trim() || !email.trim() || !phone.trim() || password.length < 8) {
      return Alert.alert('Required', 'Fill in full name, email, phone, and a password (min 8 chars).');
    }
    setLoading(true);
    try {
      const res = await portalApi.register({
        fullName: fullName.trim(),
        email: email.trim().toLowerCase(),
        phone: phone.trim(),
        password,
        referralCode: referralCode.trim() || undefined,
      });
      if (!res.success) return Alert.alert('Registration Failed', res.error?.message || 'Could not create account.');
      if (res.data?.requiresEmailVerification) {
        setMode('verify_email');
        Alert.alert('Verify Your Email', 'We sent a 6-digit verification code to your email. Verify your email, then complete KYC to unlock your bank account.');
        return;
      }
      if (res.data?.token) {
        await setToken(res.data.token);
        onAuthenticated();
      }
    } catch (e: any) {
      Alert.alert('Connection Error', e?.message || 'Unable to reach server.');
    } finally {
      setLoading(false);
    }
  };

  const submitVerifyEmail = async () => {
    if (!/^\d{6}$/.test(otpCode.trim())) {
      return Alert.alert('Invalid Code', 'Enter the 6-digit verification code sent to your email.');
    }
    setLoading(true);
    try {
      const res = await portalApi.verifyEmail({ email: email.trim().toLowerCase(), code: otpCode.trim() });
      if (!res.success) return Alert.alert('Verification Failed', res.error?.message || 'Invalid or expired OTP.');
      if (res.data?.token) {
        await setToken(res.data.token);
        Alert.alert('Email Verified ✓', 'Next step: complete your KYC/KYB inside the app to unlock your dedicated bank account.');
        onAuthenticated();
      }
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Could not verify code.');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setLoading(true);
    try {
      const res = await portalApi.resendOtp(email.trim().toLowerCase());
      Alert.alert('Code Sent', res.data?.message || 'A new 6-digit code was sent to your email.');
    } finally {
      setLoading(false);
    }
  };

  const bg = theme.isDark ? '#0B0F1A' : '#F4F7FC';
  const cardBg = theme.isDark ? '#141B2D' : '#FFFFFF';
  const textColor = theme.isDark ? '#F8FAFC' : theme.primaryColor;
  const mutedColor = theme.isDark ? '#94A3B8' : '#64748B';

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <View style={styles.brandHeader}>
          {theme.logoUrl ? (
            <Image source={{ uri: theme.logoUrl }} style={styles.logoImg} />
          ) : (
            <View style={[styles.logoFallback, { backgroundColor: theme.primaryColor }]}>
              <Ionicons name="wallet" size={30} color="#fff" />
            </View>
          )}
          <Text style={[styles.brandName, { color: textColor }]}>{theme.brandName}</Text>
          <Text style={[styles.tagline, { color: mutedColor }]}>
            {mode === 'verify_email' ? 'Verify your email address to continue' : 'Secure Digital Banking & Payments'}
          </Text>
        </View>

        <View style={[styles.authCard, { backgroundColor: cardBg }]}>
          {mode !== 'verify_email' && (
            <View style={[styles.switchRow, { backgroundColor: theme.isDark ? '#1E293B' : '#EEF2F8' }]}>
              <TouchableOpacity
                onPress={() => setMode('login')}
                style={[styles.switchBtn, mode === 'login' && { backgroundColor: theme.primaryColor }]}
              >
                <Text style={[styles.switchTxt, mode === 'login' && { color: '#fff' }]}>Sign In</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setMode('register')}
                style={[styles.switchBtn, mode === 'register' && { backgroundColor: theme.primaryColor }]}
              >
                <Text style={[styles.switchTxt, mode === 'register' && { color: '#fff' }]}>Create Account</Text>
              </TouchableOpacity>
            </View>
          )}

          {mode === 'verify_email' ? (
            <>
              <View style={{ alignItems: 'center', marginBottom: 14 }}>
                <View style={[styles.otpBadge, { backgroundColor: `${theme.accentColor}20` }]}>
                  <Ionicons name="mail-open-outline" size={28} color={theme.accentColor} />
                </View>
                <Text style={{ fontSize: 16, fontWeight: '800', color: textColor, marginTop: 8 }}>Check Your Inbox</Text>
                <Text style={{ fontSize: 12.5, color: mutedColor, textAlign: 'center', marginTop: 4 }}>
                  Enter the 6-digit code sent to {email}
                </Text>
              </View>
              <Field label="6-Digit Verification Code" value={otpCode} onChangeText={setOtpCode} keyboardType="number-pad" maxLength={6} placeholder="123456" />
              <PrimaryButton title="Verify Email & Continue →" onPress={submitVerifyEmail} loading={loading} color={theme.accentColor} />
              <TouchableOpacity onPress={handleResend} style={{ marginTop: 14, alignItems: 'center' }}>
                <Text style={{ color: theme.accentColor, fontWeight: '700', fontSize: 13 }}>Resend Verification Code</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setMode('login')} style={{ marginTop: 10, alignItems: 'center' }}>
                <Text style={{ color: mutedColor, fontSize: 12.5 }}>← Back to Sign In</Text>
              </TouchableOpacity>
            </>
          ) : mode === 'login' ? (
            <>
              <Field label="Email Address" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" placeholder="you@example.com" />
              <Field label="Password" value={password} onChangeText={setPassword} secureTextEntry placeholder="••••••••" />
              {needs2fa && (
                <Field label="2FA Authenticator Code" value={totpCode} onChangeText={setTotpCode} keyboardType="number-pad" maxLength={6} placeholder="6-digit code" />
              )}
              <PrimaryButton title="Sign In Securely →" onPress={submitLogin} loading={loading} color={theme.primaryColor} />
            </>
          ) : (
            <>
              <Field label="Full Name (as on BVN/NIN)" value={fullName} onChangeText={setFullName} placeholder="Jane Doe" />
              <Field label="Email Address" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" placeholder="you@example.com" />
              <Field label="Phone Number" value={phone} onChangeText={setPhone} keyboardType="phone-pad" placeholder="08012345678" />
              <Field label="Password (min 8 chars)" value={password} onChangeText={setPassword} secureTextEntry placeholder="••••••••" />
              <Field label="Referral Code (Optional)" value={referralCode} onChangeText={setReferralCode} autoCapitalize="characters" placeholder="Optional" />
              <View style={{ backgroundColor: '#EFF6FF', padding: 10, borderRadius: 10, marginBottom: 12 }}>
                <Text style={{ fontSize: 11.5, color: '#1E40AF', lineHeight: 17 }}>
                  Security Notice: Email verification and KYC/KYB verification are required before your dedicated bank account is issued.
                </Text>
              </View>
              <PrimaryButton title="Create Account →" onPress={submitRegister} loading={loading} color={theme.accentColor} />
            </>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, justifyContent: 'center', padding: 20 },
  brandHeader: { alignItems: 'center', marginBottom: 22 },
  logoImg: { width: 64, height: 64, borderRadius: 18, marginBottom: 10 },
  logoFallback: { width: 64, height: 64, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  brandName: { fontSize: 24, fontWeight: '900', letterSpacing: -0.5 },
  tagline: { fontSize: 13, marginTop: 4 },
  authCard: { borderRadius: 20, padding: 20, shadowColor: '#0f172a', shadowOpacity: 0.08, shadowRadius: 16, elevation: 4 },
  switchRow: { flexDirection: 'row', borderRadius: 12, padding: 4, marginBottom: 18 },
  switchBtn: { flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center' },
  switchTxt: { fontSize: 13.5, fontWeight: '700', color: '#64748B' },
  otpBadge: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
});
