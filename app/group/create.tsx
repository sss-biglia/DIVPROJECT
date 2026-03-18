import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import {
  Badge,
  Field,
  KeyboardScreen,
  PrimaryButton,
  SectionTitle,
} from '../../components/ui';
import { MemberAvatar } from '../../components/MemberAvatar';
import { memberPalette, theme } from '../../constants/theme';
import { useApp } from '../../context/AppProvider';
import { Group, Member } from '../../types';
import { createId, generateInviteCode } from '../../utils/id';
import { getProfileDisplayName, isCurrentUserName } from '../../utils/profile';

const emojis = ['✈️', '🏠', '🍕', '🎉', '🚗', '🏖️', '🎮', '💼', '🏋️', '🎸', '🐶', '☕', '🛒', '💊', '📚', '🎁'];

export default function CreateGroupScreen() {
  const router = useRouter();
  const { createGroup, profile } = useApp();
  const [name, setName] = useState('');
  const [emoji, setEmoji] = useState('✈️');
  const [memberName, setMemberName] = useState('');
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(false);
  const memberInputRef = useRef<TextInput | null>(null);

  useEffect(() => {
    if (!profile) {
      return;
    }

    const profileName = getProfileDisplayName(profile);

    if (!profileName || members.some((member) => isCurrentUserName(profile, member.name))) {
      return;
    }

    setMembers((current) => [
      {
        id: createId(),
        name: profileName,
        color: profile.avatarColor,
      },
      ...current,
    ]);
  }, [members, profile]);

  const addMember = () => {
    const trimmed = memberName.trim();

    if (!trimmed) {
      return;
    }

    setMembers((current) => [
      ...current,
      {
        id: createId(),
        name: trimmed,
        color: memberPalette[current.length % memberPalette.length],
      },
    ]);
    setMemberName('');
    memberInputRef.current?.focus();
  };

  const removeMember = (memberId: string) => {
    setMembers((current) => {
      const target = current.find((member) => member.id === memberId);

      if (target && isCurrentUserName(profile, target.name)) {
        return current;
      }

      return current.filter((member) => member.id !== memberId);
    });
  };

  const onCreate = async () => {
    if (!name.trim()) {
      Alert.alert('Nombre requerido', 'Poné un nombre antes de crear el grupo.');
      return;
    }

    if (members.length === 0) {
      Alert.alert('Falta gente', 'Necesitás al menos una persona para empezar a dividir.');
      return;
    }

    const group: Group = {
      id: createId(),
      name: name.trim(),
      emoji,
      createdAt: new Date().toISOString(),
      inviteCode: generateInviteCode(),
      members,
      expenses: [],
      settlements: [],
    };

    try {
      setLoading(true);
      await createGroup(group);
      router.replace('/');
    } catch (error) {
      Alert.alert('No pudimos crear el grupo', 'Probá de nuevo en un momento.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardScreen contentContainerStyle={styles.content}>
      <SectionTitle
        title="Nuevo grupo"
        subtitle="Elegí una identidad simple, sumá integrantes y empezá a dividir."
      />

      <Field
        autoCorrect={false}
        label="Nombre del grupo"
        onChangeText={setName}
        placeholder="Viaje a París"
        returnKeyType="next"
        value={name}
        onSubmitEditing={() => memberInputRef.current?.focus()}
      />

      <View style={styles.card}>
        <Text style={styles.blockLabel}>EMOJI</Text>
        <View style={styles.emojiGrid}>
          {emojis.map((entry) => {
            const selected = emoji === entry;

            return (
              <Pressable
                key={entry}
                onPress={() => setEmoji(entry)}
                style={[styles.emojiButton, selected && styles.emojiButtonSelected]}
              >
                <Text style={styles.emojiLabel}>{entry}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.blockLabel}>INTEGRANTES</Text>
        <Field
          ref={memberInputRef}
          autoCorrect={false}
          label="Agregar persona"
          onChangeText={setMemberName}
          onSubmitEditing={addMember}
          placeholder="María"
          returnKeyType="done"
          value={memberName}
        />
        <PrimaryButton label="Agregar" variant="neutral" onPress={addMember} />

        <View style={styles.membersWrap}>
          {members.map((member) => {
            const isYou = isCurrentUserName(profile, member.name);

            return (
              <View key={member.id} style={styles.memberRow}>
                <MemberAvatar
                  name={member.name}
                  color={member.color}
                  size="sm"
                  isCurrentUser={isYou}
                />
                <Text style={styles.memberName}>{member.name}</Text>
                {isYou ? <Badge label="You" tone="accent" /> : null}
                {!isYou ? (
                  <Pressable onPress={() => removeMember(member.id)} style={styles.removeButton}>
                    <Ionicons color={theme.colors.textSecondary} name="close" size={16} />
                  </Pressable>
                ) : null}
              </View>
            );
          })}
        </View>
      </View>

      <PrimaryButton label="Crear grupo" loading={loading} onPress={() => void onCreate()} />
    </KeyboardScreen>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: theme.spacing.md,
    paddingBottom: theme.spacing.xl,
  },
  card: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.borderDefault,
    padding: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  blockLabel: {
    color: theme.colors.textSecondary,
    textTransform: 'uppercase',
    ...theme.typography.caption,
    fontWeight: '500',
  },
  emojiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  emojiButton: {
    width: '22%',
    minHeight: 58,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.borderDefault,
    backgroundColor: theme.colors.cardSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emojiButtonSelected: {
    borderColor: 'rgba(245,245,240,0.16)',
    backgroundColor: 'rgba(245,245,240,0.04)',
  },
  emojiLabel: {
    fontSize: 28,
  },
  membersWrap: {
    gap: theme.spacing.sm,
  },
  memberRow: {
    minHeight: 48,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.borderDefault,
    backgroundColor: theme.colors.cardSecondary,
    paddingHorizontal: theme.spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  memberName: {
    flex: 1,
    color: theme.colors.textPrimary,
    ...theme.typography.subhead,
    fontWeight: '600',
  },
  removeButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
});
