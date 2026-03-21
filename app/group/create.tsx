import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Modal,
  ScrollView,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import {
  Badge,
  Field,
  KeyboardScreen,
  PrimaryButton,
  SectionTitle,
} from '../../components/ui';
import { MetallicCard } from '../../components/metallic/MetallicCard';
import { MemberAvatar } from '../../components/MemberAvatar';
import { memberPalette } from '../../constants/theme';
import { darkColors, metallicStyles } from '../../constants/metallicTheme';
import { useApp } from '../../context/AppProvider';
import { Group, Member } from '../../types';
import { createId, generateInviteCode } from '../../utils/id';
import { getProfileDisplayName, isCurrentUserName } from '../../utils/profile';

const EMOJIS = [
  // Food & drinks
  '🍕', '👨‍🍳', '🍺', '🥂', '🍷', '🥑', '🍔', '🍣',
  // Travel & outdoors
  '✈️', '🗻', '🏕️', '🏝️', '🚗', '🚢', '🚂', '🌍',
  // Celebrations & parties
  '🎉', '🥳', '🎈', '🎆', '🎃', '🎶', '💃', '🥺',
  // Money & expenses
  '💰', '💳', '💸', '🤑', '🛒', '🏦', '📊', '📝',
  // Sports & activities
  '⚽', '🎾', '🏊', '🧗', '🏆', '🎯', '🎸', '💎',
  // Nature & outdoors
  '🌿', '🌲', '🌊', '🌅', '☀️', '🌙', '⛰️', '🏖️',
  // Friends & people
  '👫', '👯', '🤝', '👋', '🤗', '👑', '💪', '🤩',
];

export default function CreateGroupScreen() {
  const router = useRouter();
  const { createGroup, profile } = useApp();
  const [name, setName] = useState('');
  const [memberName, setMemberName] = useState('');
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(false);
  const memberInputRef = useRef<TextInput | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [selectedEmoji, setSelectedEmoji] = useState<string | null>(null);

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

    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
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
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
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
      emoji: selectedEmoji ?? '🙂',
      createdAt: new Date().toISOString(),
      inviteCode: generateInviteCode(),
      members,
      expenses: [],
      settlements: [],
    };

    try {
      setLoading(true);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
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

      <View style={styles.nameRow}>
        <View style={{ flex: 1 }}>
          <Field
            autoCorrect={false}
            label="Nombre del grupo"
            onChangeText={setName}
            placeholder="Viaje a París"
            returnKeyType="next"
            value={name}
            onSubmitEditing={() => memberInputRef.current?.focus()}
          />
        </View>
        <TouchableOpacity
          onPress={() => setShowEmojiPicker(true)}
          style={styles.emojiPickerButton}
        >
          <Text style={{ fontSize: 24 }}>{selectedEmoji ?? '🙂'}</Text>
        </TouchableOpacity>
      </View>

      <MetallicCard>
        <Text style={metallicStyles.caption}>INTEGRANTES</Text>
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
                <Text style={[metallicStyles.subhead, styles.memberName]}>{member.name}</Text>
                {isYou ? <Badge label="Vos" tone="accent" /> : null}
                {!isYou ? (
                  <Pressable onPress={() => removeMember(member.id)} style={styles.removeButton}>
                    <Ionicons color={darkColors.textSecondary} name="close" size={16} />
                  </Pressable>
                ) : null}
              </View>
            );
          })}
        </View>
      </MetallicCard>

      <PrimaryButton label="Crear grupo" loading={loading} onPress={() => void onCreate()} />

      <Modal
        visible={showEmojiPicker}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowEmojiPicker(false)}
      >
        <View style={{
          flex: 1,
          backgroundColor: 'rgba(0,0,0,0.5)',
          justifyContent: 'center', // centered vertically
          alignItems: 'center',     // centered horizontally
          paddingHorizontal: 40,
        }}>
          <View style={{
            borderRadius: 20,
            padding: 16,
            width: '100%',
            maxHeight: 280, // fixed small height
            backgroundColor: darkColors.card,
          }}>
            <Text
              style={[metallicStyles.headline, { marginBottom: 10, textAlign: 'center' }]}
            >
              Elegir emoji
            </Text>
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8 }}>
                {EMOJIS.map((emoji) => (
                  <TouchableOpacity
                    key={emoji}
                    onPress={() => {
                      setSelectedEmoji(emoji);
                      setShowEmojiPicker(false);
                    }}
                    style={{
                      width: 40,
                      height: 40,
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderRadius: 8,
                      backgroundColor: selectedEmoji === emoji ? 'rgba(150,150,150,0.2)' : 'transparent',
                    }}
                  >
                    <Text style={{ fontSize: 24 }}>{emoji}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
            <TouchableOpacity
              onPress={() => setShowEmojiPicker(false)}
              style={{ marginTop: 10, alignItems: 'center' }}
            >
              <Text style={metallicStyles.footnote}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </KeyboardScreen>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: 16,
    paddingBottom: 24,
  },
  membersWrap: {
    gap: 12,
  },
  memberRow: {
    minHeight: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: darkColors.borderDefault,
    backgroundColor: darkColors.cardSecondary,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  memberName: {
    flex: 1,
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
  nameRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
  },
  emojiPickerButton: {
    width: 52,
    height: 52,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    backgroundColor: 'rgba(0,0,0,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
