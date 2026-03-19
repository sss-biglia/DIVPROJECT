import * as Clipboard from 'expo-clipboard';
import { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  Modal,
  Pressable,
  Share,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { memberPalette, theme } from '../constants/theme';
import { Field, PrimaryButton } from './ui';

interface AddMemberSheetProps {
  visible: boolean;
  inviteCode: string;
  onClose: () => void;
  onAddMember: (name: string, color: string) => void;
}

export function AddMemberSheet({
  visible,
  inviteCode,
  onClose,
  onAddMember,
}: AddMemberSheetProps) {
  const translateY = useRef(new Animated.Value(420)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const [name, setName] = useState('');
  const [color, setColor] = useState(memberPalette[0]);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(backdropOpacity, {
        toValue: visible ? 1 : 0,
        duration: 220,
        useNativeDriver: true,
      }),
      Animated.spring(translateY, {
        toValue: visible ? 0 : 420,
        useNativeDriver: true,
        damping: 18,
        stiffness: 180,
        mass: 0.9,
      }),
    ]).start();
  }, [backdropOpacity, translateY, visible]);

  const onSubmit = () => {
    const trimmed = name.trim();

    if (!trimmed) {
      Alert.alert('Nombre requerido', 'Sumá un nombre para agregar a esta persona.');
      return;
    }

    onAddMember(trimmed, color);
    setName('');
    setColor(memberPalette[0]);
  };

  return (
    <Modal transparent visible={visible} animationType="none" onRequestClose={onClose}>
      <Animated.View style={[styles.backdrop, { opacity: backdropOpacity }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <Animated.View style={[styles.sheet, { transform: [{ translateY }] }]}>
          <View style={styles.handle} />

          <Text style={styles.sectionLabel}>AGREGAR MANUALMENTE</Text>
          <Field
            label="Nombre"
            placeholder="Nombre del integrante"
            value={name}
            onChangeText={setName}
            autoCorrect={false}
          />
          <View style={styles.colorsRow}>
            {memberPalette.map((entry) => (
              <Pressable
                key={entry}
                onPress={() => setColor(entry)}
                style={[
                  styles.colorDot,
                  { backgroundColor: entry },
                  color === entry && styles.colorDotSelected,
                ]}
              />
            ))}
          </View>
          <PrimaryButton label="Agregar" onPress={onSubmit} />

          <Text style={styles.sectionLabel}>INVITAR AL GRUPO</Text>
          <View style={styles.codeCard}>
            <Text style={styles.codeValue}>{inviteCode}</Text>
          </View>
          <PrimaryButton
            label="Copiar código"
            onPress={() => void Clipboard.setStringAsync(inviteCode)}
          />
          <PrimaryButton
            label="Compartir"
            variant="neutral"
            onPress={() =>
              void Share.share({
                message: `Unite a mi grupo en SplitSnap con el código: ${inviteCode}`,
              })
            }
          />
          <Text style={styles.note}>
            Próximamente tus amigos podrán unirse desde su app
          </Text>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: theme.colors.overlay,
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: theme.colors.card,
    borderTopLeftRadius: theme.radius.xl,
    borderTopRightRadius: theme.radius.xl,
    borderWidth: 1,
    borderColor: theme.colors.borderDefault,
    paddingHorizontal: theme.spacing.md,
    paddingTop: 14,
    paddingBottom: theme.spacing.xl,
    gap: theme.spacing.sm,
  },
  handle: {
    alignSelf: 'center',
    width: 36,
    height: 4,
    borderRadius: theme.radius.full,
    backgroundColor: 'rgba(255,255,255,0.12)',
    marginBottom: 6,
  },
  sectionLabel: {
    color: theme.colors.textSecondary,
    textTransform: 'uppercase',
    ...theme.typography.caption,
    fontWeight: '500',
  },
  colorsRow: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  colorDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  colorDotSelected: {
    borderColor: theme.colors.textPrimary,
  },
  codeCard: {
    minHeight: 72,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.borderDefault,
    backgroundColor: theme.colors.cardSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  codeValue: {
    color: theme.colors.textPrimary,
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: 8,
    fontVariant: ['tabular-nums'],
  },
  note: {
    color: theme.colors.textSecondary,
    ...theme.typography.footnote,
  },
});
