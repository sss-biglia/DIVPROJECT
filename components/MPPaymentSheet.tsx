import * as Clipboard from 'expo-clipboard';
import * as Linking from 'expo-linking';
import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef, useState } from 'react';
import { Animated, Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { theme } from '../constants/theme';
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
    if (paymentLink) {
      const canOpen = await Linking.canOpenURL(paymentLink);
      if (canOpen) {
        await Linking.openURL(paymentLink);
        return;
      }
    }

    if (alias) {
      const deepLink = `mercadopago://send?alias=${alias}`;
      const canOpenNative = await Linking.canOpenURL(deepLink);
      if (canOpenNative) {
        await Linking.openURL(deepLink);
        return;
      }

      await Clipboard.setStringAsync(alias);
      setCopiedMessage('¡Alias copiado! Abriendo MercadoPago...');
      await Linking.openURL('https://www.mercadopago.com.ar');
      return;
    }

    const nativeMP = 'mercadopago://';
    const canOpenApp = await Linking.canOpenURL(nativeMP);
    await Linking.openURL(canOpenApp ? nativeMP : 'https://www.mercadopago.com.ar');
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
          <Text style={styles.title}>Pagarle a {memberName}</Text>
          <Text style={styles.amount}>{displayAmount}</Text>
          {originalAmountUSD ? (
            <Text style={styles.secondaryAmount}>
              ({formatUSD(originalAmountUSD)} al tipo de cambio del momento)
            </Text>
          ) : null}
          <View style={styles.divider} />

          {mpPaymentLink || mpAlias ? (
            <PrimaryButton
              label="Pagar con MercadoPago 💸"
              onPress={() => void openMercadoPago(mpAlias, mpPaymentLink)}
            />
          ) : (
            <>
              <Text style={styles.muted}>El integrante no configuró MercadoPago</Text>
              <PrimaryButton
                label="Abrir MercadoPago"
                onPress={() => void openMercadoPago(mpAlias, mpPaymentLink)}
                variant="neutral"
              />
            </>
          )}

          {copiedMessage ? (
            <View style={styles.infoRow}>
              <Ionicons color={theme.colors.textPrimary} name="checkmark-circle" size={16} />
              <Text style={styles.infoText}>{copiedMessage}</Text>
            </View>
          ) : null}

          <GhostButton
            label="Marcar como saldado ✓"
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
    backgroundColor: theme.colors.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: theme.spacing.lg,
    paddingTop: 14,
    paddingBottom: 28,
    gap: theme.spacing.md,
    borderTopWidth: 1,
    borderColor: theme.colors.borderDefault,
  },
  handle: {
    alignSelf: 'center',
    width: 48,
    height: 5,
    borderRadius: 999,
    backgroundColor: '#3A3A3A',
  },
  title: {
    color: theme.colors.textPrimary,
    fontSize: 24,
    fontWeight: '700',
  },
  amount: {
    color: theme.colors.textPrimary,
    fontSize: 34,
    fontWeight: '800',
  },
  secondaryAmount: {
    color: theme.colors.textSecondary,
    fontSize: 13,
    lineHeight: 20,
    marginTop: -8,
  },
  divider: {
    height: 1,
    backgroundColor: theme.colors.borderDefault,
  },
  muted: {
    color: theme.colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  infoText: {
    color: theme.colors.textPrimary,
    fontSize: 13,
    fontWeight: '600',
  },
});
