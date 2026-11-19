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
        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 14 }}>
          <View style={{ flex: 1 }}>
            <PrimaryButton title="+ USD Visa" onPress={() => issueCard('VISA', 'USD')} color={theme.accentColor} disabled={loading} />
          </View>
          <View style={{ flex: 1 }}>
            <PrimaryButton title="+ NGN Verve" onPress={() => issueCard('VERVE', 'NGN')} color={theme.primaryColor} disabled={loading} />
          </View>
        </View>

        {vCards.length === 0 ? (
          <Text style={{ color: '#64748b', fontSize: 13 }}>No virtual cards issued yet.</Text>
        ) : (
          vCards.map((vc: any) => {
            const cardBg = vc.currency === 'USD' ? theme.primaryColor : '#065f46';
            return (
              <View key={vc.id} style={[styles.visualCard, { backgroundColor: cardBg }]}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={styles.cardBrand}>{theme.brandName} • {vc.cardScheme}</Text>
                  <TouchableOpacity onPress={() => toggleCard(vc.id, vc.status)} style={styles.freezePill}>
                    <Text style={{ color: '#fff', fontSize: 11, fontWeight: '800' }}>
                      {vc.status === 'ACTIVE' ? 'Freeze' : 'Unfreeze'}
                    </Text>
                  </TouchableOpacity>
                </View>
                <Text style={styles.cardPan}>{vc.maskedPan}</Text>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                  <View>
                    <Text style={styles.cardMeta}>EXP {vc.expiryMonth}/{vc.expiryYear}</Text>
                    <Text style={styles.cardHolder}>{customer?.fullName?.toUpperCase()}</Text>
                  </View>
                  <Text style={styles.cardBal}>{vc.currency === 'USD' ? '$' : '₦'}{Number(vc.balance || 0).toLocaleString()}</Text>
                </View>
              </View>
            );
          })
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
  visualCard: { borderRadius: 16, padding: 18, marginBottom: 12 },
  cardBrand: { color: 'rgba(255,255,255,0.85)', fontSize: 12, fontWeight: '800', letterSpacing: 1 },
  freezePill: { backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 99 },
  cardPan: { color: '#ffffff', fontSize: 20, fontWeight: '900', letterSpacing: 2, marginVertical: 18 },
  cardMeta: { color: 'rgba(255,255,255,0.75)', fontSize: 11 },
  cardHolder: { color: '#ffffff', fontSize: 13, fontWeight: '700', marginTop: 2 },
  cardBal: { color: '#ffffff', fontSize: 20, fontWeight: '900' },
});
