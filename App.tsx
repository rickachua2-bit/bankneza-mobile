import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import * as SecureStore from 'expo-secure-store';
import * as LocalAuthentication from 'expo-local-authentication';
import { Ionicons } from './src/components/AppIcons';
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
const ONBOARDING_KEY = 'bankneza_seen_onboarding_v3';

function MainShell() {
  const theme = useTenantTheme();
  const [showSplash, setShowSplash] = useState(true);
  const [fontsReady, setFontsReady] = useState(false);
  const [booting, setBooting] = useState(true);
  const [seenOnboarding, setSeenOnboarding] = useState(false);
  const [biometricLocked, setBiometricLocked] = useState(false);
  const [customer, setCustomer] = useState<any>(null);
  const [tab, setTab] = useState<TabKey>('home');

  const loadCustomer = async (skipBiometric = false) => {
    try {
      const onb = await SecureStore.getItemAsync(ONBOARDING_KEY).catch(() => null);
      setSeenOnboarding(Boolean(onb));

      const tok = await getToken();
      if (!tok) {
        setCustomer(null);
        return;
      }

      if (!skipBiometric) {
        try {
          const hasBio = await LocalAuthentication.hasHardwareAsync();
          const enrolled = hasBio ? await LocalAuthentication.isEnrolledAsync() : false;
          if (enrolled) {
            setBiometricLocked(true);
          }
        } catch {}
      }

      const res = await portalApi.getMe().catch(() => ({ success: false, data: null }));
      if (res.success && res.data) {
        setCustomer(res.data);
      } else {
        setCustomer(null);
      }
    } catch {
      setCustomer(null);
    } finally {
      setBooting(false);
    }
  };

  useEffect(() => {
    // Load vector icon font non-blockingly (native Android APK also has Ionicons.ttf in assets/fonts/)
    setFontsReady(true);

    // Show branded splash screen for 1.8s and enforce a hard 2.4s boot safety timer so app can NEVER hang
    const splashTimer = setTimeout(() => setShowSplash(false), 1800);
    const safetyTimer = setTimeout(() => {
      setBooting(false);
      setShowSplash(false);
    }, 2400);

    loadCustomer();

    return () => {
      clearTimeout(splashTimer);
      clearTimeout(safetyTimer);
    };
  }, []);

  const unlockBiometrics = async () => {
    try {
      const res = await LocalAuthentication.authenticateAsync({ promptMessage: `Unlock ${theme.brandName}` });
      if (res.success) setBiometricLocked(false);
    } catch {
      setBiometricLocked(false);
    }
  };

  // 1. FULL-SCREEN BRANDED SPLASH SCREEN ON LAUNCH
  if (showSplash || booting) {
    const splashImg = theme.splashImageUrl || theme.logoUrl;
    return (
      <View style={[styles.splashContainer, { backgroundColor: theme.splashBgColor || theme.primaryColor }]}>
        <StatusBar style="light" />
        <View style={styles.splashCenter}>
          {splashImg ? (
            <Image source={{ uri: splashImg }} style={styles.splashLogoImg} resizeMode="contain" />
          ) : (
            <View style={[styles.splashIconCircle, { backgroundColor: theme.accentColor }]}>
              <Ionicons name="wallet" size={50} color="#ffffff" />
            </View>
          )}
          <Text style={styles.splashBrand}>{theme.brandName}</Text>
          <Text style={styles.splashTagline}>{theme.tagline}</Text>
          <ActivityIndicator size="large" color="#ffffff" style={{ marginTop: 28 }} />
        </View>
        <View style={styles.splashFooter}>
          <Ionicons name="shield-checkmark" size={15} color="rgba(255,255,255,0.85)" />
          <Text style={styles.splashFooterTxt}>256-Bit Encrypted Digital Banking Engine</Text>
        </View>
      </View>
    );
  }

  // 2. BRANDED 3-SLIDE ONBOARDING SCREEN
  if (!seenOnboarding && !customer) {
    return (
      <OnboardingScreen
        onDone={async () => {
          try {
            await SecureStore.setItemAsync(ONBOARDING_KEY, '1');
          } catch {}
          setSeenOnboarding(true);
        }}
      />
    );
  }

  // 3. AUTHENTICATION SCREEN (LOGIN / REGISTER / EMAIL OTP / FORGOT PASSWORD)
  if (!customer) {
    return (
      <SafeAreaView style={styles.safe}>
        <StatusBar style={theme.isDark ? 'light' : 'dark'} />
        <AuthScreen onAuthenticated={() => loadCustomer(true)} />
      </SafeAreaView>
    );
  }

  // 4. BIOMETRIC LOCK SCREEN
  if (biometricLocked) {
    return (
      <View style={[styles.center, { padding: 24, backgroundColor: theme.primaryColor }]}>
        <StatusBar style="light" />
        <Ionicons name="finger-print" size={64} color="#ffffff" style={{ marginBottom: 16 }} />
        <Text style={{ color: '#fff', fontSize: 22, fontWeight: '900', marginBottom: 8 }}>{theme.brandName}</Text>
        <Text style={{ color: 'rgba(255,255,255,0.8)', marginBottom: 24, textAlign: 'center' }}>
          Verify with Face ID or Fingerprint to access {customer.fullName}&apos;s wallet.
        </Text>
        <View style={{ width: '100%', gap: 10 }}>
          <PrimaryButton title="Unlock with Biometrics" onPress={unlockBiometrics} color={theme.accentColor} />
          <PrimaryButton
            title="Skip & Continue to Wallet"
            onPress={() => setBiometricLocked(false)}
            color="rgba(255,255,255,0.22)"
          />
          <PrimaryButton
            title="Sign Out"
            onPress={async () => {
              await clearToken();
              setBiometricLocked(false);
              setCustomer(null);
            }}
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
  const inactiveTint = theme.isDark ? '#94A3B8' : '#475569';
  const tabTitleMap: Record<TabKey, string> = {
    home: theme.brandName,
    transfer: 'Send & Withdraw Money',
    bills: 'Bills & Utilities Hub',
    cards: 'Virtual & Physical Cards',
    services: 'Global FX, Crypto & Flights',
    profile: 'Profile, KYC & Security',
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: bg }]} edges={['top', 'bottom']}>
      <StatusBar style={theme.isDark ? 'light' : 'dark'} />
      {tab !== 'home' && (
        <View style={[styles.subHeader, { backgroundColor: navBg, borderBottomColor: navBorder }]}>
          <TouchableOpacity onPress={() => setTab('home')} style={[styles.backBtn, { backgroundColor: theme.isDark ? '#1E293B' : '#F1F5F9' }]}>
            <Ionicons name="arrow-back" size={20} color={theme.isDark ? '#F8FAFC' : theme.primaryColor} />
          </TouchableOpacity>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            {theme.logoUrl ? <Image source={{ uri: theme.logoUrl }} style={styles.subLogo} /> : null}
            <View style={{ alignItems: 'center' }}>
              <Text style={{ fontSize: 10, fontWeight: '900', color: theme.accentColor, letterSpacing: 0.7 }}>
                {theme.brandName.toUpperCase()}
              </Text>
              <Text style={[styles.subHeaderTitle, { color: theme.isDark ? '#F8FAFC' : theme.primaryColor }]}>
                {tabTitleMap[tab]}
              </Text>
            </View>
          </View>
          <View style={{ width: 36 }} />
        </View>
      )}

      <View style={{ flex: 1 }}>
        {tab === 'home' && <HomeScreen customer={customer} onNavigate={setTab} onRefresh={() => loadCustomer(true)} />}
        {tab === 'transfer' && (
          <TransferScreen
            customer={customer}
            onSuccess={() => {
              loadCustomer(true);
              setTab('home');
            }}
          />
        )}
        {tab === 'bills' && (
          <BillsScreen
            onSuccess={() => {
              loadCustomer(true);
              setTab('home');
            }}
          />
        )}
        {tab === 'cards' && <CardsScreen customer={customer} onRefresh={() => loadCustomer(true)} />}
        {tab === 'services' && (
          <ServicesScreen
            customer={customer}
            onSuccess={() => {
              loadCustomer(true);
              setTab('home');
            }}
          />
        )}
        {tab === 'profile' && (
          <ProfileSupportScreen customer={customer} onRefresh={() => loadCustomer(true)} onSignOut={() => setCustomer(null)} />
        )}
      </View>

      {/* BOLD, MODERN FOOTER BOTTOM NAVIGATION BAR */}
      <View style={[styles.bottomNav, { backgroundColor: navBg, borderTopColor: navBorder }]}>
        {tabs.map((t) => {
          const active = tab === t.key || (t.key === 'bills' && tab === 'services');
          return (
            <TouchableOpacity key={t.key} onPress={() => setTab(t.key)} activeOpacity={0.85} style={styles.navItem}>
              <View
                style={[
                  styles.navPill,
                  active && {
                    backgroundColor: theme.accentColor,
                    shadowColor: theme.accentColor,
                    shadowOpacity: 0.35,
                    shadowRadius: 6,
                    elevation: 4,
                  },
                ]}
              >
                <Ionicons name={active ? t.icon : t.iconOutline} size={23} color={active ? '#FFFFFF' : inactiveTint} />
              </View>
              <Text
                style={{
                  fontSize: 11.5,
                  fontWeight: active ? '900' : '700',
                  color: active ? theme.accentColor : inactiveTint,
                  marginTop: 4,
                }}
              >
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
  splashContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 54,
    paddingHorizontal: 28,
  },
  splashCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  splashLogoImg: {
    width: 112,
    height: 112,
    borderRadius: 28,
    marginBottom: 20,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  splashIconCircle: {
    width: 104,
    height: 104,
    borderRadius: 52,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  splashBrand: {
    color: '#ffffff',
    fontSize: 30,
    fontWeight: '900',
    letterSpacing: -0.5,
    textAlign: 'center',
  },
  splashTagline: {
    color: 'rgba(255,255,255,0.82)',
    fontSize: 14,
    fontWeight: '600',
    marginTop: 8,
    textAlign: 'center',
  },
  splashFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  splashFooterTxt: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 12,
    fontWeight: '700',
  },
  subHeader: {
    paddingHorizontal: 14,
    paddingVertical: 11,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
  },
  backBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  subLogo: { width: 26, height: 26, borderRadius: 13 },
  subHeaderTitle: { fontSize: 15, fontWeight: '900' },
  bottomNav: {
    flexDirection: 'row',
    borderTopWidth: 1,
    paddingTop: 8,
    paddingBottom: 8,
    shadowColor: '#0f172a',
    shadowOpacity: 0.1,
    shadowRadius: 14,
    elevation: 12,
  },
  navItem: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  navPill: {
    width: 48,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
