import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { ThemeProvider, useTenantTheme } from './src/theme/ThemeProvider';
import { getToken, portalApi } from './src/services/api';
import { AuthScreen } from './src/screens/AuthScreen';
import { HomeScreen } from './src/screens/HomeScreen';
import { TransferScreen } from './src/screens/TransferScreen';
import { BillsScreen } from './src/screens/BillsScreen';
import { CardsScreen } from './src/screens/CardsScreen';
import { ProfileSupportScreen } from './src/screens/ProfileSupportScreen';

type TabKey = 'home' | 'transfer' | 'bills' | 'cards' | 'profile';

function MainShell() {
  const theme = useTenantTheme();
  const [booting, setBooting] = useState(true);
  const [customer, setCustomer] = useState<any>(null);
  const [tab, setTab] = useState<TabKey>('home');

  const loadCustomer = async () => {
    const tok = await getToken();
    if (!tok) {
      setCustomer(null);
      setBooting(false);
      return;
    }
    const res = await portalApi.getMe().catch(() => ({ success: false, data: null }));
    setCustomer(res.success ? res.data : null);
    setBooting(false);
  };

  useEffect(() => {
    loadCustomer();
  }, []);

  if (booting) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={theme.accentColor} />
      </View>
    );
  }

  if (!customer) {
    return (
      <SafeAreaView style={styles.safe}>
        <AuthScreen onAuthenticated={loadCustomer} />
      </SafeAreaView>
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
        {tab === 'home' && <HomeScreen customer={customer} onNavigate={setTab} onRefresh={loadCustomer} />}
        {tab === 'transfer' && <TransferScreen customer={customer} onSuccess={() => { loadCustomer(); setTab('home'); }} />}
        {tab === 'bills' && <BillsScreen onSuccess={() => { loadCustomer(); setTab('home'); }} />}
        {tab === 'cards' && <CardsScreen customer={customer} onRefresh={loadCustomer} />}
        {tab === 'profile' && <ProfileSupportScreen customer={customer} onRefresh={loadCustomer} onSignOut={() => setCustomer(null)} />}
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
