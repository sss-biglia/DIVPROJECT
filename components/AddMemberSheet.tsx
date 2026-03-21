import { useEffect, useRef, useState } from 'react';
import { Alert, Animated, Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { memberPalette } from '../constants/theme';
import { darkColors, metallicStyles } from '../constants/metallicTheme';
import { Field, PrimaryButton } from './ui';

interface AddMemberSheetProps {
  visible: boolean;
  onClose: () => void;
  onAddMember: (name: string, color: string) => void;
}

export function AddMemberSheet({
  visible,
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

  useEffect(() => {
    if (visible) {
      return;
    }

    setName('');
    setColor(memberPalette[0]);
  }, [visible]);

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

          <Text style={metallicStyles.caption}>AGREGAR MANUALMENTE</Text>
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
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: darkColors.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderColor: darkColors.borderDefault,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 32,
    gap: 12,
  },
  handle: {
    alignSelf: 'center',
    width: 36,
    height: 4,
    borderRadius: 99,
    backgroundColor: 'rgba(255,255,255,0.12)',
    marginBottom: 6,
  },
  colorsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  colorDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  colorDotSelected: {
    borderColor: darkColors.textPrimary,
  },
});
