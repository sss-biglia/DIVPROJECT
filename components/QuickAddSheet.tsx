import { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { theme } from '../constants/theme';
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
  const initialGroupId = useMemo(
    () => selectedGroupId ?? (groups.length === 1 ? groups[0].id : undefined),
    [groups, selectedGroupId]
  );
  const [activeGroupId, setActiveGroupId] = useState<string | undefined>(initialGroupId);

  useEffect(() => {
    setActiveGroupId(initialGroupId);
  }, [initialGroupId, visible]);

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

  return (
    <Modal transparent visible={visible} animationType="none" onRequestClose={onClose}>
      <Animated.View style={[styles.backdrop, { opacity: backdropOpacity }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <Animated.View style={[styles.sheet, { transform: [{ translateY }] }]}>
          <View style={styles.handle} />
          <Text style={styles.title}>Nuevo gasto</Text>

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
                    <Text style={styles.groupRowLabel}>
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
            <Text style={styles.actionLabel}>📷 Escanear ticket</Text>
          </Pressable>

          <Pressable
            disabled={!activeGroupId}
            onPress={() => activeGroupId && onSelectAction(activeGroupId, 'manual')}
            style={[styles.actionButton, !activeGroupId && styles.actionButtonDisabled]}
          >
            <Text style={styles.actionLabel}>✏️ Ingresar manual</Text>
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
  title: {
    color: theme.colors.textPrimary,
    ...theme.typography.headline,
  },
  groupList: {
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.sm,
  },
  groupRow: {
    minHeight: 52,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.borderDefault,
    backgroundColor: theme.colors.cardSecondary,
    paddingHorizontal: theme.spacing.md,
    justifyContent: 'center',
  },
  groupRowSelected: {
    borderColor: 'rgba(245,245,240,0.12)',
    backgroundColor: 'rgba(245,245,240,0.05)',
  },
  groupRowLabel: {
    color: theme.colors.textPrimary,
    ...theme.typography.callout,
    fontWeight: '600',
  },
  actionButton: {
    minHeight: 56,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    backgroundColor: theme.colors.cardSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionButtonDisabled: {
    opacity: 0.45,
  },
  actionLabel: {
    color: theme.colors.textPrimary,
    ...theme.typography.callout,
    fontWeight: '600',
  },
});
