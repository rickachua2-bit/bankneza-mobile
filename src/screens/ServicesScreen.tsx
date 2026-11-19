import React, { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { portalApi } from '../services/api';
import { isFeatureEnabled, useTenantTheme } from '../theme/ThemeProvider';
import { Card, Field, PrimaryButton } from '../components/Ui';

export function ServicesScreen({ onSuccess }: { onSuccess: () => void }) {
  const theme = useTenantTheme();
  const [betOp, setBetOp] = useState('SPORTYBET');
  const [betId, setBetId] = useState('');
  const [betAmt, setBetAmt] = useState('');

  const [fxFrom, setFxFrom] = useState('NGN');
  const [fxTo, setFxTo] = useState('USD');
  const [fxAmt, setFxAmt] = useState('');

  const [remCurr, setRemCurr] = useState('USD');
  const [remName, setRemName] = useState('');
  const [remAcc, setRemAcc] = useState('');
  const [remAmt, setRemAmt] = useState('');

  const [fltFrom, setFltFrom] = useState('LOS');
  const [fltTo, setFltTo] = useState('ABV');
  const [fltDate, setFltDate] = useState('2026-12-01');

  const [cryptoAsset, setCryptoAsset] = useState('USDT_TRC20');
  const [cryptoAddr, setCryptoAddr] = useState('');

  return (
    <ScrollView contentContainerStyle={{ padding: 16 }}>
      {isFeatureEnabled(theme, 'FLIGHTS') && (
        <Card>
          <Text style={[styles.title, { color: theme.primaryColor }]}>Flight Search (NDC API)</Text>
          <Field label="Origin IATA" value={fltFrom} onChangeText={setFltFrom} autoCapitalize="characters" />
          <Field label="Destination IATA" value={fltTo} onChangeText={setFltTo} autoCapitalize="characters" />
          <Field label="Departure Date (YYYY-MM-DD)" value={fltDate} onChangeText={setFltDate} />
          <PrimaryButton
            title="Search Live Flights →"
            color={theme.accentColor}
            onPress={async () => {
              const r = await portalApi.searchFlights({ origin: fltFrom.trim(), destination: fltTo.trim(), departureDate: fltDate.trim(), cabinClass: 'economy' });
              const cnt = (r.data?.offers || r.data?.flights || []).length;
              Alert.alert('Flights', r.success ? `Found ${cnt} live flight offers for ${fltFrom} → ${fltTo}.` : r.error?.message || 'Search failed.');
            }}
          />
        </Card>
      )}

      {isFeatureEnabled(theme, 'BETTING_VAS') && (
        <Card>
          <Text style={[styles.title, { color: theme.primaryColor }]}>Betting Wallet Top-Up</Text>
          <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
            {['SPORTYBET', 'BET9JA', '1XBET', 'BETKING'].map((op) => (
              <TouchableOpacity key={op} onPress={() => setBetOp(op)} style={[styles.chip, betOp === op && { backgroundColor: theme.accentColor }]}>
                <Text style={{ fontSize: 11, fontWeight: '700', color: betOp === op ? '#fff' : '#334155' }}>{op}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <Field label="User / Account ID" value={betId} onChangeText={setBetId} />
          <Field label="Amount (₦)" value={betAmt} onChangeText={setBetAmt} keyboardType="numeric" />
          <PrimaryButton
            title="Fund Betting Wallet →"
            color={theme.accentColor}
            onPress={async () => {
              const r = await portalApi.fundBetting({ operator: betOp, customerId: betId.trim(), amount: Number(betAmt) });
              Alert.alert('Betting', r.success ? `Funded! Ref: ${r.data?.reference}` : r.error?.message || 'Failed.');
              if (r.success) { setBetId(''); setBetAmt(''); onSuccess(); }
            }}
          />
        </Card>
      )}

      {isFeatureEnabled(theme, 'FX') && (
        <Card>
          <Text style={[styles.title, { color: theme.primaryColor }]}>Currency FX Swap</Text>
          <Field label="From (NGN / USD / GBP / EUR)" value={fxFrom} onChangeText={setFxFrom} autoCapitalize="characters" />
          <Field label="To (USD / NGN / GBP / EUR)" value={fxTo} onChangeText={setFxTo} autoCapitalize="characters" />
          <Field label="Amount" value={fxAmt} onChangeText={setFxAmt} keyboardType="numeric" />
          <PrimaryButton
            title="Swap Currency →"
            color={theme.primaryColor}
            onPress={async () => {
              const r = await portalApi.fxSwap({ sourceCurrency: fxFrom.trim(), targetCurrency: fxTo.trim(), amount: Number(fxAmt) });
              Alert.alert('FX Swap', r.success ? 'FX conversion completed!' : r.error?.message || 'Failed.');
              if (r.success) onSuccess();
            }}
          />
        </Card>
      )}

      {isFeatureEnabled(theme, 'GLOBAL_PAYOUTS') && (
        <Card>
          <Text style={[styles.title, { color: theme.primaryColor }]}>Cross-Border Remittance</Text>
          <Field label="Currency (USD / GBP / EUR)" value={remCurr} onChangeText={setRemCurr} autoCapitalize="characters" />
          <Field label="Beneficiary Name" value={remName} onChangeText={setRemName} />
          <Field label="IBAN / Account" value={remAcc} onChangeText={setRemAcc} />
          <Field label="Amount" value={remAmt} onChangeText={setRemAmt} keyboardType="numeric" />
          <PrimaryButton
            title="Send Global Payout →"
            color={theme.accentColor}
            onPress={async () => {
              const r = await portalApi.sendRemittance({ type: 'REMITTANCE', currency: remCurr.trim(), beneficiaryName: remName.trim(), accountNumber: remAcc.trim(), amount: Number(remAmt) });
              Alert.alert('Remittance', r.success ? 'Global payout submitted!' : r.error?.message || 'Failed.');
              if (r.success) onSuccess();
            }}
          />
        </Card>
      )}

      {isFeatureEnabled(theme, 'CRYPTO') && (
        <Card>
          <Text style={[styles.title, { color: theme.primaryColor }]}>Crypto Deposit Address</Text>
          <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
            {['USDT_TRC20', 'USDT_ERC20', 'USDC', 'BTC'].map((c) => (
              <TouchableOpacity key={c} onPress={() => setCryptoAsset(c)} style={[styles.chip, cryptoAsset === c && { backgroundColor: theme.primaryColor }]}>
                <Text style={{ fontSize: 11, fontWeight: '700', color: cryptoAsset === c ? '#fff' : '#334155' }}>{c}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <PrimaryButton
            title="+ Generate Address"
            color={theme.primaryColor}
            onPress={async () => {
              const r = await portalApi.generateCryptoAddress({ currency: cryptoAsset });
              if (r.success && r.data?.address) setCryptoAddr(r.data.address);
              else Alert.alert('Crypto', r.error?.message || 'Could not generate address.');
            }}
          />
          {cryptoAddr ? <Text style={{ marginTop: 10, fontWeight: '700', color: '#059669' }}>{cryptoAddr}</Text> : null}
        </Card>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 16, fontWeight: '800', marginBottom: 10 },
  chip: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: '#cbd5e1', backgroundColor: '#f8fafc' },
});
