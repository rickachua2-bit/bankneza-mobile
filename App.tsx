import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import * as SecureStore from 'expo-secure-store';
import * as LocalAuthentication from 'expo-local-authentication';
import { Ionicons } from '@expo/vector-icons';
import { isFeatureEnabled, ThemeProvider, useTenantTheme } from './src/theme/ThemeProvider';
import { clearToken, getToken, portalApi } from './src/services/api';
import { OnboardingScreen } from './src/screens/OnboardingScreen';
import { AuthScreen } from './src/screens/AuthScreen';
import { HomeScreen } from './src/screens/HomeScreen';
import { TransferScreen } from './src/screens/TransferScreen';
import { BillsScreen } from './src/screens/BillsScreen';
import { CardsScreen } from './src/screens/CardsScreen';
import { ServicesScreen } from './src/screens/ServicesScreen';
import { ProfileSupportScreen } from './src/screens/ProfileSupportScreen';
import { PrimaryButton } from './src/components/Ui';

type TabKey = 'home' | 'transfer' | 'bills' | 'cards' | 'services' | 'profile';

function MainShell() {
  const [fontsLoaded] = useFonts(Ionicons.font);
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

  if (booting || !fontsLoaded) {
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

  const allTabs: Array<{ key: TabKey; label: string; icon: any; iconOutline: any; show: boolean }> = [
    { key: 'home', label: 'Home', icon: 'home', iconOutline: 'home-outline', show: true },
    { key: 'transfer', label: 'Send', icon: 'paper-plane', iconOutline: 'paper-plane-outline', show: isFeatureEnabled(theme, 'TRANSFERS') },
    { key: 'bills', label: 'Bills', icon: 'flash', iconOutline: 'flash-outline', show: isFeatureEnabled(theme, 'BILLS') },
    { key: 'cards', label: 'Cards', icon: 'card', iconOutline: 'card-outline', show: isFeatureEnabled(theme, 'VIRTUAL_CARDS') || isFeatureEnabled(theme, 'PHYSICAL_CARDS') },
    { key: 'profile', label: 'Profile', icon: 'person', iconOutline: 'person-outline', show: true },
  ];
  const tabs = allTabs.filter((t) => t.show);
  const bg = theme.isDark ? '#0B0F1A' : '#F3F6FB';
  const navBg = theme.isDark ? '#141B2D' : '#FFFFFF';
  const navBorder = theme.isDark ? '#1E293B' : '#E2E8F0';
  const tabTitleMap: Record<TabKey, string> = {
    home: theme.brandName,
    transfer: 'Send Money',
    bills: 'Bills & Utilities',
    cards: 'Virtual & Physical Cards',
    services: 'Global FX, Flights & More',
    profile: 'Profile, KYC & Security',
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: bg }]} edges={['top', 'bottom']}>
      <StatusBar style={theme.isDark ? 'light' : 'dark'} />
      {tab !== 'home' && (
        <View style={[styles.subHeader, { backgroundColor: navBg, borderBottomColor: navBorder }]}>
          <TouchableOpacity onPress={() => setTab('home')} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={20} color={theme.isDark ? '#F8FAFC' : theme.primaryColor} />
          </TouchableOpacity>
          <Text style={[styles.subHeaderTitle, { color: theme.isDark ? '#F8FAFC' : theme.primaryColor }]}>
            {tabTitleMap[tab]}
          </Text>
          <View style={{ width: 32 }} />
        </View>
      )}

      <View style={{ flex: 1 }}>
        {tab === 'home' && <HomeScreen customer={customer} onNavigate={setTab} onRefresh={() => loadCustomer(true)} />}
        {tab === 'transfer' && <TransferScreen customer={customer} onSuccess={() => { loadCustomer(true); setTab('home'); }} />}
        {tab === 'bills' && <BillsScreen onSuccess={() => { loadCustomer(true); setTab('home'); }} />}
        {tab === 'cards' && <CardsScreen customer={customer} onRefresh={() => loadCustomer(true)} />}
        {tab === 'services' && <ServicesScreen onSuccess={() => { loadCustomer(true); setTab('home'); }} />}
        {tab === 'profile' && <ProfileSupportScreen customer={customer} onRefresh={() => loadCustomer(true)} onSignOut={() => setCustomer(null)} />}
      </View>

      <View style={[styles.bottomNav, { backgroundColor: navBg, borderTopColor: navBorder }]}>
        {tabs.map((t) => {
          const active = tab === t.key || (t.key === 'bills' && tab === 'services');
          return (
            <TouchableOpacity key={t.key} onPress={() => setTab(t.key)} style={styles.navItem}>
              <View style={[styles.navPill, active && { backgroundColor: `${theme.accentColor}1E` }]}>
                <Ionicons name={active ? t.icon : t.iconOutline} size={21} color={active ? theme.accentColor : '#64748B'} />
              </View>
              <Text style={{ fontSize: 10.5, fontWeight: active ? '800' : '600', color: active ? theme.accentColor : '#64748B', marginTop: 2 }}>
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
        <MainShell />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F3F6FB' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F3F6FB' },
  subHeader: { paddingHorizontal: 14, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1 },
  backBtn: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  subHeaderTitle: { fontSize: 16, fontWeight: '800' },
  bottomNav: { flexDirection: 'row', borderTopWidth: 1, paddingTop: 8, paddingBottom: 6, shadowColor: '#0f172a', shadowOpacity: 0.06, shadowRadius: 10, elevation: 8 },
  navItem: { flex: 1, alignItems: 'center' },
  navPill: { paddingHorizontal: 14, paddingVertical: 4, borderRadius: 999 },
});
