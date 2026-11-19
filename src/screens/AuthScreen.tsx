import React, { useState } from 'react';
import { Alert, Image, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTenantTheme } from '../theme/ThemeProvider';
import { portalApi, setToken } from '../services/api';
import { Field, PrimaryButton } from '../components/Ui';

export function AuthScreen({ onAuthenticated }: { onAuthenticated: () => void }) {
  const theme = useTenantTheme();
  const [mode, setMode] = useState<'login' | 'register' | 'verify_email' | 'forgot_password' | 'reset_password'>('login');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [referralCode, setReferralCode] = useState('');
  const [totpCode, setTotpCode] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
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
        Alert.alert(
          'Verify Your Email',
          'We sent a 6-digit verification code to your email. Verify your email, then complete KYC to unlock your multi-currency bank accounts.'
        );
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
        Alert.alert('Email Verified ✓', 'Next step: complete your KYC/KYB inside the app to unlock your dedicated bank accounts.');
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

  const submitForgotPassword = async () => {
    if (!email.trim()) return Alert.alert('Email Required', 'Enter your registered email address.');
    setLoading(true);
    try {
      const res = await portalApi.forgotPassword(email.trim().toLowerCase());
      if (!res.success) return Alert.alert('Error', res.error?.message || 'Unable to send reset code.');
      setMode('reset_password');
      Alert.alert('Reset Code Sent ✓', res.data?.message || 'Enter the 6-digit code sent to your email.');
    } finally {
      setLoading(false);
    }
  };

  const submitResetPassword = async () => {
    if (!/^\d{6}$/.test(otpCode.trim()) || newPassword.length < 8) {
      return Alert.alert('Invalid Input', 'Enter the 6-digit OTP code and a new password (min 8 characters).');
    }
    setLoading(true);
    try {
      const res = await portalApi.resetPassword({
        email: email.trim().toLowerCase(),
        code: otpCode.trim(),
        newPassword,
      });
      if (!res.success) return Alert.alert('Reset Failed', res.error?.message || 'Invalid or expired code.');
      setPassword(newPassword);
      setOtpCode('');
      setNewPassword('');
      setMode('login');
      Alert.alert('Password Updated ✓', 'Sign in with your new password.');
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
              <Ionicons name="wallet" size={32} color="#fff" />
            </View>
          )}
          <Text style={[styles.brandName, { color: textColor }]}>{theme.brandName}</Text>
          <Text style={[styles.tagline, { color: mutedColor }]}>
            {mode === 'verify_email'
              ? 'Verify your email address to continue'
              : mode === 'forgot_password' || mode === 'reset_password'
              ? 'Instant Account Password Recovery'
              : 'Multi-Currency Digital Banking & Payments'}
          </Text>
        </View>

        <View style={[styles.authCard, { backgroundColor: cardBg }]}>
          {(mode === 'login' || mode === 'register') && (
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
                  <Ionicons name="mail-open" size={28} color={theme.accentColor} />
                </View>
                <Text style={{ fontSize: 16, fontWeight: '900', color: textColor, marginTop: 8 }}>Check Your Inbox</Text>
                <Text style={{ fontSize: 12.5, color: mutedColor, textAlign: 'center', marginTop: 4 }}>
                  Enter the 6-digit code sent to {email}
                </Text>
              </View>
              <Field
                label="6-Digit Email OTP"
                value={otpCode}
                onChangeText={setOtpCode}
                keyboardType="number-pad"
                maxLength={6}
                placeholder="123456"
              />
              <PrimaryButton title="Verify Email & Continue →" onPress={submitVerifyEmail} loading={loading} color={theme.accentColor} />
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 14 }}>
                <TouchableOpacity onPress={handleResend}>
                  <Text style={{ color: theme.accentColor, fontWeight: '800', fontSize: 13 }}>Resend Code</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setMode('login')}>
                  <Text style={{ color: mutedColor, fontWeight: '700', fontSize: 13 }}>← Back to Login</Text>
                </TouchableOpacity>
              </View>
            </>
          ) : mode === 'forgot_password' ? (
            <>
              <Field
                label="Registered Email Address"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                placeholder="you@domain.com"
              />
              <PrimaryButton title="Send 6-Digit Reset Code →" onPress={submitForgotPassword} loading={loading} color={theme.accentColor} />
              <TouchableOpacity onPress={() => setMode('login')} style={{ marginTop: 14, alignItems: 'center' }}>
                <Text style={{ color: mutedColor, fontWeight: '700', fontSize: 13 }}>← Back to Sign In</Text>
              </TouchableOpacity>
            </>
          ) : mode === 'reset_password' ? (
            <>
              <Field
                label="6-Digit OTP Code"
                value={otpCode}
                onChangeText={setOtpCode}
                keyboardType="number-pad"
                maxLength={6}
                placeholder="123456"
              />
              <Field
                label="New Password (Min 8 chars)"
                value={newPassword}
                onChangeText={setNewPassword}
                secureTextEntry={!showPass}
                placeholder="••••••••"
              />
              <PrimaryButton title="Reset Password Now →" onPress={submitResetPassword} loading={loading} color={theme.accentColor} />
              <TouchableOpacity onPress={() => setMode('login')} style={{ marginTop: 14, alignItems: 'center' }}>
                <Text style={{ color: mutedColor, fontWeight: '700', fontSize: 13 }}>← Back to Sign In</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              {mode === 'register' && (
                <>
                  <Field label="Full Legal Name" value={fullName} onChangeText={setFullName} placeholder="Chinedu Okafor" />
                  <Field label="Phone Number" value={phone} onChangeText={setPhone} keyboardType="phone-pad" placeholder="08012345678" />
                </>
              )}
              <Field
                label="Email Address"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                placeholder="you@domain.com"
              />
              <View style={{ position: 'relative' }}>
                <Field
                  label="Password"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPass}
                  placeholder="••••••••"
                />
                <TouchableOpacity onPress={() => setShowPass(!showPass)} style={styles.eyeToggle}>
                  <Ionicons name={showPass ? 'eye-off' : 'eye'} size={20} color={mutedColor} />
                </TouchableOpacity>
              </View>
              {mode === 'login' && (
                <TouchableOpacity onPress={() => setMode('forgot_password')} style={{ alignSelf: 'flex-end', marginBottom: 12, marginTop: -4 }}>
                  <Text style={{ fontSize: 12.5, fontWeight: '800', color: theme.accentColor }}>Forgot Password?</Text>
                </TouchableOpacity>
              )}
              {mode === 'register' && (
                <Field
                  label="Referral Code (Optional)"
                  value={referralCode}
                  onChangeText={setReferralCode}
                  autoCapitalize="characters"
                  placeholder="FIN-1A2B3C"
                />
              )}
              {needs2fa && (
                <Field
                  label="6-Digit Authenticator 2FA Code"
                  value={totpCode}
                  onChangeText={setTotpCode}
                  keyboardType="number-pad"
                  maxLength={6}
                  placeholder="123456"
                />
              )}
              <PrimaryButton
                title={mode === 'login' ? 'Sign In to Wallet →' : 'Create Account →'}
                onPress={mode === 'login' ? submitLogin : submitRegister}
                loading={loading}
                color={theme.accentColor}
              />
            </>
          )}
        </View>

        <View style={styles.footerRow}>
          <Ionicons name="lock-closed" size={13} color={mutedColor} />
          <Text style={[styles.footerTxt, { color: mutedColor }]}>
            256-Bit Encrypted • Powered by {theme.brandName}
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, justifyContent: 'center', padding: 20 },
  brandHeader: { alignItems: 'center', marginBottom: 22 },
  logoImg: { width: 68, height: 68, borderRadius: 20, marginBottom: 10 },
  logoFallback: { width: 68, height: 68, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  brandName: { fontSize: 25, fontWeight: '900', letterSpacing: -0.3 },
  tagline: { fontSize: 13, marginTop: 4, textAlign: 'center' },
  authCard: {
    borderRadius: 22,
    padding: 20,
    shadowColor: '#0f172a',
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
  },
  switchRow: { flexDirection: 'row', borderRadius: 12, padding: 4, marginBottom: 16 },
  switchBtn: { flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center' },
  switchTxt: { fontSize: 13, fontWeight: '800', color: '#64748B' },
  otpBadge: { width: 58, height: 58, borderRadius: 29, alignItems: 'center', justifyContent: 'center' },
  eyeToggle: { position: 'absolute', right: 12, top: 32, padding: 4 },
  footerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 22 },
  footerTxt: { fontSize: 12, fontWeight: '700' },
});
