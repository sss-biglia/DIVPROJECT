import * as Clipboard from 'expo-clipboard';
import * as Linking from 'expo-linking';
import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef, useState } from 'react';
import { Animated, Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { darkColors, metallicStyles } from '../constants/metallicTheme';
import { formatARS, formatUSD } from '../services/dolarService';
import { GhostButton, PrimaryButton } from './ui';

interface MPPaymentSheetProps {
  visible: boolean;
  onClose: () => void;
  onSettle: () => void;
  memberName: string;
  amount: number;
  currency: 'ARS' | 'USD';
  mpAlias?: string;
  mpPaymentLink?: string;
  originalAmountUSD?: number;
}

export function MPPaymentSheet({
  visible,
  onClose,
  onSettle,
  memberName,
  amount,
  currency,
  mpAlias,
  mpPaymentLink,
  originalAmountUSD,
}: MPPaymentSheetProps) {
  const translateY = useRef(new Animated.Value(360)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const [copiedMessage, setCopiedMessage] = useState('');

  useEffect(() => {
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: visible ? 0 : 360,
        duration: 220,
        useNativeDriver: true,
      }),
      Animated.timing(backdropOpacity, {
        toValue: visible ? 1 : 0,
        duration: 220,
        useNativeDriver: true,
      }),
    ]).start();
  }, [backdropOpacity, translateY, visible]);

  const openMercadoPago = async (alias?: string, paymentLink?: string) => {
    try {
      if (paymentLink) {
        const can = await Linking.canOpenURL(paymentLink);
        if (can) {
          await Linking.openURL(paymentLink);
          return;
        }
      }

      if (alias) {
        const deepLink = `mercadopago://send?alias=${alias}`;
        const can = await Linking.canOpenURL(deepLink);
        if (can) {
          await Linking.openURL(deepLink);
          return;
        }
        await Clipboard.setStringAsync(alias);
      }

      const canApp = await Linking.canOpenURL('mercadopago://');
      await Linking.openURL(canApp ? 'mercadopago://' : 'https://www.mercadopago.com.ar');
    } catch {
      await Linking.openURL('https://www.mercadopago.com.ar');
    }
  };

  const displayAmount =
    currency === 'USD' && !originalAmountUSD ? formatUSD(amount) : formatARS(amount);

  return (
    <Modal transparent visible={visible} animationType="none" onRequestClose={onClose}>
      <Animated.View style={[styles.backdrop, { opacity: backdropOpacity }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <Animated.View
          style={[
            styles.sheet,
            {
              transform: [{ translateY }],
            },
          ]}
        >
          <View style={styles.handle} />
          <Text style={metallicStyles.title2}>Pagarle a {memberName}</Text>
          <Text style={[metallicStyles.title1, { fontSize: 34 }]}>{displayAmount}</Text>
          {originalAmountUSD ? (
            <Text style={[metallicStyles.footnote, { marginTop: -8 }]}>
              ({formatUSD(originalAmountUSD)} al tipo de cambio del momento)
            </Text>
          ) : null}
          <View style={styles.divider} />

          {mpPaymentLink || mpAlias ? (
            <PrimaryButton
              label="Pagar con MercadoPago ðŸ’¸"
              onPress={() => void openMercadoPago(mpAlias, mpPaymentLink)}
            />
          ) : (
            <>
              <Text style={metallicStyles.subhead}>El integrante no configuró MercadoPago</Text>
              <PrimaryButton
                label="Abrir MercadoPago"
                onPress={() => void openMercadoPago(mpAlias, mpPaymentLink)}
                variant="neutral"
              />
            </>
          )}

          {copiedMessage ? (
            <View style={styles.infoRow}>
              <Ionicons color={darkColors.textPrimary} name="checkmark-circle" size={16} />
              <Text style={[metallicStyles.footnote, { fontWeight: '600' }]}>{copiedMessage}</Text>
            </View>
          ) : null}

          <GhostButton
            label="Marcar como saldado âœ“"
            onPress={() => {
              onSettle();
              onClose();
            }}
          />
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: darkColors.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 24,
    paddingTop: 14,
    paddingBottom: 28,
    gap: 16,
    borderTopWidth: 1,
    borderColor: darkColors.borderDefault,
  },
  handle: {
    alignSelf: 'center',
    width: 48,
    height: 5,
    borderRadius: 999,
    backgroundColor: '#3A3A3A',
  },
  divider: {
    height: 1,
    backgroundColor: darkColors.borderDefault,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
});
