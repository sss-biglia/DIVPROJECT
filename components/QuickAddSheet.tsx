import { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { darkColors, metallicStyles } from '../constants/metallicTheme';
import { Group } from '../types';

interface QuickAddSheetProps {
  visible: boolean;
  groups: Group[];
  selectedGroupId?: string;
  onClose: () => void;
  onSelectAction: (groupId: string, action: 'scan' | 'manual') => void;
}

export function QuickAddSheet({
  visible,
  groups,
  selectedGroupId,
  onClose,
  onSelectAction,
}: QuickAddSheetProps) {
  const translateY = useRef(new Animated.Value(420)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const [isMounted, setIsMounted] = useState(visible);
  const initialGroupId = useMemo(
    () => selectedGroupId ?? (groups.length === 1 ? groups[0].id : undefined),
    [groups, selectedGroupId]
  );
  const [activeGroupId, setActiveGroupId] = useState<string | undefined>(initialGroupId);

  useEffect(() => {
    setActiveGroupId(initialGroupId);
  }, [initialGroupId, visible]);

  useEffect(() => {
    backdropOpacity.stopAnimation();
    translateY.stopAnimation();

    if (visible) {
      if (!isMounted) {
        backdropOpacity.setValue(0);
        translateY.setValue(420);
        setIsMounted(true);
        return;
      }

      const animationFrame = requestAnimationFrame(() => {
        Animated.parallel([
          Animated.timing(backdropOpacity, {
            toValue: 1,
            duration: 220,
            useNativeDriver: true,
          }),
          Animated.spring(translateY, {
            toValue: 0,
            useNativeDriver: true,
            damping: 18,
            stiffness: 180,
            mass: 0.9,
          }),
        ]).start();
      });

      return () => cancelAnimationFrame(animationFrame);
    }

    if (!isMounted) {
      return;
    }

    Animated.parallel([
      Animated.timing(backdropOpacity, {
        toValue: 0,
        duration: 220,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 420,
        duration: 220,
        useNativeDriver: true,
      }),
    ]).start(({ finished }) => {
      if (finished) {
        setIsMounted(false);
      }
    });
  }, [backdropOpacity, isMounted, translateY, visible]);

  if (!isMounted) {
    return null;
  }

  return (
    <Modal transparent visible={isMounted} animationType="none" onRequestClose={onClose}>
      <Animated.View style={[styles.backdrop, { opacity: backdropOpacity }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <Animated.View style={[styles.sheet, { transform: [{ translateY }] }]}>
          <View style={styles.handle} />
          <Text style={metallicStyles.headline}>Nuevo gasto</Text>

          {!selectedGroupId ? (
            <View style={styles.groupList}>
              {groups.map((group) => {
                const selected = activeGroupId === group.id;

                return (
                  <Pressable
                    key={group.id}
                    onPress={() => setActiveGroupId(group.id)}
                    style={[styles.groupRow, selected && styles.groupRowSelected]}
                  >
                    <Text style={[metallicStyles.callout, { fontWeight: '600' }]}>
                      {group.emoji} {group.name}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          ) : null}

          <Pressable
            disabled={!activeGroupId}
            onPress={() => activeGroupId && onSelectAction(activeGroupId, 'scan')}
            style={[styles.actionButton, !activeGroupId && styles.actionButtonDisabled]}
          >
            <Text style={[metallicStyles.callout, { fontWeight: '600' }]}>📷 Escanear ticket</Text>
          </Pressable>

          <Pressable
            disabled={!activeGroupId}
            onPress={() => activeGroupId && onSelectAction(activeGroupId, 'manual')}
            style={[styles.actionButton, !activeGroupId && styles.actionButtonDisabled]}
          >
            <Text style={[metallicStyles.callout, { fontWeight: '600' }]}>✏️ Ingresar manual</Text>
          </Pressable>
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
  groupList: {
    gap: 12,
    marginBottom: 12,
  },
  groupRow: {
    minHeight: 52,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: darkColors.borderDefault,
    backgroundColor: darkColors.cardSecondary,
    paddingHorizontal: 16,
    justifyContent: 'center',
  },
  groupRowSelected: {
    borderColor: 'rgba(245,245,240,0.12)',
    backgroundColor: 'rgba(245,245,240,0.05)',
  },
  actionButton: {
    minHeight: 56,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    backgroundColor: darkColors.cardSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionButtonDisabled: {
    opacity: 0.45,
  },
});
