import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import * as SecureStore from 'expo-secure-store';
import * as LocalAuthentication from 'expo-local-authentication';
import { Ionicons } from '@expo/vector-icons';
import { ThemeProvider, useTenantTheme } from './src/theme/ThemeProvider';
import { clearToken, getToken, portalApi } from './src/services/api';
import { OnboardingScreen } from './src/screens/OnboardingScreen';
import { AuthScreen } from './src/screens/AuthScreen';
import { HomeScreen } from './src/screens/HomeScreen';
import { TransferScreen } from './src/screens/TransferScreen';
import { BillsScreen } from './src/screens/BillsScreen';
import { CardsScreen } from './src/screens/CardsScreen';
import { ProfileSupportScreen } from './src/screens/ProfileSupportScreen';
import { PrimaryButton } from './src/components/Ui';

type TabKey = 'home' | 'transfer' | 'bills' | 'cards' | 'profile';

function MainShell() {
  const theme = useTenantTheme();
  const [booting, setBooting] = useState(true);
  const [seenOnboarding, setSeenOnboarding] = useState(true);
  const [biometricLocked, setBiometricLocked] = useState(false);
  const [customer, setCustomer] = useState<any>(null);
  const [tab, setTab] = useState<TabKey>('home');

  const loadCustomer = async (skipBiometric = false) => {
    const onb = await SecureStore.getItemAsync('bankneza_seen_onboarding');
    setSeenOnboarding(Boolean(onb));

    const tok = await getToken();
    if (!tok) {
      setCustomer(null);
      setBooting(false);
      return;
    }

    if (!skipBiometric) {
      const hasBio = await LocalAuthentication.hasHardwareAsync();
      const enrolled = hasBio ? await LocalAuthentication.isEnrolledAsync() : false;
      if (enrolled) {
        setBiometricLocked(true);
      }
    }

    const res = await portalApi.getMe().catch(() => ({ success: false, data: null }));
    setCustomer(res.success ? res.data : null);
    setBooting(false);
  };

  useEffect(() => {
    loadCustomer();
  }, []);

  const unlockBiometrics = async () => {
    const res = await LocalAuthentication.authenticateAsync({ promptMessage: `Unlock ${theme.brandName}` });
    if (res.success) setBiometricLocked(false);
  };

  if (booting) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={theme.accentColor} />
      </View>
    );
  }

  if (!seenOnboarding && !customer) {
    return (
      <OnboardingScreen
        onDone={async () => {
          await SecureStore.setItemAsync('bankneza_seen_onboarding', '1');
          setSeenOnboarding(true);
        }}
      />
    );
  }

  if (!customer) {
    return (
      <SafeAreaView style={styles.safe}>
        <AuthScreen onAuthenticated={() => loadCustomer(true)} />
      </SafeAreaView>
    );
  }

  if (biometricLocked) {
    return (
      <View style={[styles.center, { padding: 24, backgroundColor: theme.primaryColor }]}>
        <Ionicons name="finger-print" size={64} color="#ffffff" style={{ marginBottom: 16 }} />
        <Text style={{ color: '#fff', fontSize: 22, fontWeight: '900', marginBottom: 8 }}>{theme.brandName}</Text>
        <Text style={{ color: 'rgba(255,255,255,0.8)', marginBottom: 24, textAlign: 'center' }}>
          Verify with Face ID or Fingerprint to access {customer.fullName}&apos;s wallet.
        </Text>
        <View style={{ width: '100%', gap: 10 }}>
          <PrimaryButton title="Unlock with Biometrics" onPress={unlockBiometrics} color={theme.accentColor} />
          <PrimaryButton
            title="Sign Out"
            onPress={async () => { await clearToken(); setBiometricLocked(false); setCustomer(null); }}
            color="#475569"
          />
        </View>
      </View>
    );
  }

  const tabs: Array<{ key: TabKey; label: string; icon: any }> = [
    { key: 'home', label: 'Home', icon: 'home' },
    { key: 'transfer', label: 'Transfer', icon: 'send' },
    { key: 'bills', label: 'Bills', icon: 'flash' },
    { key: 'cards', label: 'Cards', icon: 'card' },
    { key: 'profile', label: 'More', icon: 'person' },
  ];

  return (
    <SafeAreaView style={styles.safe}>
      <View style={[styles.header, { backgroundColor: theme.primaryColor }]}>
        <Text style={styles.headerBrand}>{theme.brandName}</Text>
        <Text style={styles.headerSub}>Tier {customer.kycTier}</Text>
      </View>

      <View style={{ flex: 1 }}>
        {tab === 'home' && <HomeScreen customer={customer} onNavigate={setTab} onRefresh={() => loadCustomer(true)} />}
        {tab === 'transfer' && <TransferScreen customer={customer} onSuccess={() => { loadCustomer(true); setTab('home'); }} />}
        {tab === 'bills' && <BillsScreen onSuccess={() => { loadCustomer(true); setTab('home'); }} />}
        {tab === 'cards' && <CardsScreen customer={customer} onRefresh={() => loadCustomer(true)} />}
        {tab === 'profile' && <ProfileSupportScreen customer={customer} onRefresh={() => loadCustomer(true)} onSignOut={() => setCustomer(null)} />}
      </View>

      <View style={styles.bottomNav}>
        {tabs.map((t) => {
          const active = tab === t.key;
          return (
            <TouchableOpacity key={t.key} onPress={() => setTab(t.key)} style={styles.navItem}>
              <Ionicons name={t.icon} size={20} color={active ? theme.accentColor : '#64748b'} />
              <Text style={{ fontSize: 11, fontWeight: '700', color: active ? theme.accentColor : '#64748b', marginTop: 2 }}>
                {t.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </SafeAreaView>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <StatusBar style="light" />
        <MainShell />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f1f5f9' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f1f5f9' },
  header: { paddingHorizontal: 16, paddingVertical: 14, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerBrand: { color: '#ffffff', fontSize: 18, fontWeight: '900' },
  headerSub: { color: 'rgba(255,255,255,0.85)', fontSize: 12, fontWeight: '700' },
  bottomNav: { flexDirection: 'row', backgroundColor: '#ffffff', borderTopWidth: 1, borderTopColor: '#e2e8f0', paddingVertical: 8 },
  navItem: { flex: 1, alignItems: 'center' },
});
