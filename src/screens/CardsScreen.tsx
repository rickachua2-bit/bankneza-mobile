import React, { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { portalApi } from '../services/api';
import { useTenantTheme } from '../theme/ThemeProvider';
import { Card, Field, PrimaryButton } from '../components/Ui';

export function CardsScreen({ customer, onRefresh }: { customer: any; onRefresh: () => void }) {
  const theme = useTenantTheme();
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState(customer?.phone || '');
  const [loading, setLoading] = useState(false);

  const vCards = Array.isArray(customer?.virtualCards) ? customer.virtualCards : [];

  const issueCard = async (cardScheme: string, currency: string) => {
    setLoading(true);
    try {
      const res = await portalApi.issueVirtualCard({ cardScheme, currency });
      if (!res.success) return Alert.alert('Card Issuance', res.error?.message || 'Unable to issue card.');
      Alert.alert('Card Issued', `${currency} ${cardScheme} (${res.data?.maskedPan}) ready!`);
      onRefresh();
    } finally {
      setLoading(false);
    }
  };

  const toggleCard = async (id: string, current: string) => {
    const next = current === 'ACTIVE' ? 'FROZEN' : 'ACTIVE';
    const res = await portalApi.toggleVirtualCard(id, next);
    if (res.success) onRefresh();
  };

  const orderPhysical = async () => {
    if (!address.trim()) return Alert.alert('Address Required', 'Enter your delivery address.');
    setLoading(true);
    try {
      const res = await portalApi.orderPhysicalCard({ cardScheme: 'VERVE', deliveryAddress: address.trim(), phone: phone.trim() });
      if (!res.success) return Alert.alert('Order Failed', res.error?.message || 'Could not order physical card.');
      Alert.alert('Ordered', `Physical ATM Card ordered! Tracking: ${res.data?.trackingNumber}`);
      setAddress('');
      onRefresh();
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={{ padding: 16 }}>
      <Card>
        <Text style={[styles.title, { color: theme.primaryColor }]}>My Virtual Cards</Text>
        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
          <PrimaryButton title="+ USD Visa" onPress={() => issueCard('VISA', 'USD')} color={theme.accentColor} disabled={loading} />
          <PrimaryButton title="+ NGN Verve" onPress={() => issueCard('VERVE', 'NGN')} color={theme.primaryColor} disabled={loading} />
        </View>
        {vCards.length === 0 ? (
          <Text style={{ color: '#64748b', fontSize: 13 }}>No virtual cards issued yet.</Text>
        ) : (
          vCards.map((vc: any) => (
            <View key={vc.id} style={styles.cardRow}>
              <View>
                <Text style={{ fontWeight: '800', color: '#0f172a' }}>{vc.cardScheme} • {vc.maskedPan}</Text>
                <Text style={{ fontSize: 12, color: '#64748b' }}>Exp: {vc.expiryMonth}/{vc.expiryYear} • {vc.currency} {vc.balance} • {vc.status}</Text>
              </View>
              <TouchableOpacity onPress={() => toggleCard(vc.id, vc.status)} style={styles.freezeBtn}>
                <Text style={{ fontSize: 12, fontWeight: '700', color: theme.primaryColor }}>
                  {vc.status === 'ACTIVE' ? 'Freeze' : 'Unfreeze'}
                </Text>
              </TouchableOpacity>
            </View>
          ))
        )}
      </Card>

      <Card>
        <Text style={[styles.title, { color: theme.primaryColor }]}>Order Physical ATM Card</Text>
        <Field label="Delivery Address" value={address} onChangeText={setAddress} placeholder="12 Admiralty Way, Lekki" />
        <Field label="Contact Phone" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
        <PrimaryButton title="Order Physical Verve Card →" onPress={orderPhysical} color={theme.primaryColor} disabled={loading} />
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 16, fontWeight: '800', marginBottom: 12 },
  cardRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  freezeBtn: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, backgroundColor: '#eff6ff' },
});
