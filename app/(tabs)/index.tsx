import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { ComponentProps, useRef, useState } from 'react';
import {
  Modal,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { MetallicCard } from '../../components/metallic/MetallicCard';
import { MemberAvatar } from '../../components/MemberAvatar';
import { EmptyState, Field, PrimaryButton, Screen, SectionTitle } from '../../components/ui';
import { accentColor, darkColors, metallicStyles } from '../../constants/metallicTheme';
import { useApp } from '../../context/AppProvider';
import { getGroupTotalSpent } from '../../services/balanceService';
import { formatARS } from '../../services/dolarService';
import { isCurrentUserName } from '../../utils/profile';

const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) {
    return 'Buenos dias';
  }
  if (hour < 19) {
    return 'Buenas tardes';
  }
  return 'Buenas noches';
};

function GroupCard({
  emoji,
  title,
  subtitle,
  amount,
  members,
  currentUserName,
  onPress,
}: {
  emoji: string;
  title: string;
  subtitle: string;
  amount: string;
  members: Array<{ id: string; name: string; color: string }>;
  currentUserName: string | null;
  onPress: () => void;
}) {
  const visibleMembers = members.slice(0, 4);
  const remaining = members.length - visibleMembers.length;

  return (
    <MetallicCard onPress={onPress}>
      <>
          <View style={styles.groupTop}>
            <Text style={{ fontSize: 36 }}>{emoji}</Text>
            <View style={styles.groupMeta}>
              <Text style={metallicStyles.headline}>{title}</Text>
              <Text style={metallicStyles.footnote}>{subtitle}</Text>
            </View>
          </View>

          <View style={styles.groupBottom}>
            <View style={styles.avatarStack}>
              {visibleMembers.map((member, index) => (
                <View key={member.id} style={{ marginLeft: index === 0 ? 0 : -10 }}>
                  <MemberAvatar
                    name={member.name}
                    color={member.color}
                    size="sm"
                    isCurrentUser={currentUserName ? member.name === currentUserName : false}
                  />
                </View>
              ))}
              {remaining > 0 ? (
                <View style={[styles.moreAvatar, { marginLeft: visibleMembers.length ? -10 : 0 }]}>
                  <Text style={styles.moreAvatarLabel}>+{remaining}</Text>
                </View>
              ) : null}
            </View>

            <View style={styles.amountRow}>
              <Text style={[metallicStyles.headline, { fontVariant: ['tabular-nums'] }]}>{amount}</Text>
              <Ionicons color={darkColors.textSecondary} name="chevron-forward" size={18} />
            </View>
          </View>
        </>
    </MetallicCard>
  );
}

function ActionCard({
  onPress,
  iconName,
  title,
  subtitle,
}: {
  onPress: () => void;
  iconName: ComponentProps<typeof Ionicons>['name'];
  title: string;
  subtitle: string;
}) {
  return (
    <View style={{ flex: 1 }}>
      <MetallicCard onPress={onPress} accent style={styles.actionCard}>
        <View style={styles.createGroupRow}>
          <View style={styles.createGroupIcon}>
            <Ionicons color={accentColor} name={iconName} size={24} />
          </View>
          <View style={styles.groupMeta}>
            <Text style={[metallicStyles.headline, { fontSize: 15 }]}>{title}</Text>
            <Text style={metallicStyles.footnote}>{subtitle}</Text>
          </View>
        </View>
      </MetallicCard>
    </View>
  );
}

export default function GroupsScreen() {
  const router = useRouter();
  const { groups, isReady, profile, refreshGroups, joinGroupByCode } = useApp();
  const [refreshing, setRefreshing] = useState(false);
  const currentUserName = profile ? `${profile.name} ${profile.lastName}`.trim() : null;
  const [joinModalVisible, setJoinModalVisible] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [joinLoading, setJoinLoading] = useState(false);
  const [joinError, setJoinError] = useState('');

  const handleCreateGroup = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push('/group/create');
  };

  const handleRefresh = async () => {
    try {
      setRefreshing(true);
      await refreshGroups();
    } finally {
      setRefreshing(false);
    }
  };

  const handleOpenJoinGroup = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setJoinModalVisible(true);
    setJoinCode('');
    setJoinError('');
  };

  const handleJoinGroup = async () => {
    if (!joinCode.trim()) {
      setJoinError('Ingresá un código.');
      return;
    }
    setJoinLoading(true);
    setJoinError('');
    try {
      const result = await joinGroupByCode(joinCode);
      setJoinLoading(false);

      if (result.status === 'joined') {
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setJoinModalVisible(false);
        if (result.group?.id) {
          router.push(`/group/${result.group.id}`);
        }
      } else if (result.status === 'already-member') {
        setJoinError('Ya sos parte de este grupo.');
      } else {
        setJoinError('El código de invitación no es válido.');
      }
    } catch (e) {
      setJoinLoading(false);
      setJoinError('No pudimos unir al grupo. Probá de nuevo.');
    }
  };

  if (!isReady) {
    return (
      <Screen contentContainerStyle={styles.centered}>
        <Text style={styles.loadingText}>Cargando grupos...</Text>
      </Screen>
    );
  }

  return (
    <Screen
      scrollable
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => void handleRefresh()}
          tintColor={darkColors.textPrimary}
        />
      }
    >
      <View style={styles.greetingBlock}>
        <Text style={metallicStyles.footnote}>{getGreeting()}</Text>
        <Text style={metallicStyles.title1}>
          {profile?.name ? `${profile.name} 👋` : 'Bienvenido 👋'}
        </Text>
      </View>

      <SectionTitle
        title="Tus grupos"
        subtitle="Todo lo compartido en un solo lugar, listo para escanear, cargar y saldar."
      />

      <View style={styles.groupsList}>
        {groups.map((group) => (
          <GroupCard
            key={group.id}
            emoji={group.emoji}
            title={group.name}
            subtitle={`${group.members.length} personas - ${group.expenses.length} gastos`}
            amount={formatARS(getGroupTotalSpent(group))}
            members={group.members}
            currentUserName={
              currentUserName && group.members.some((member) => isCurrentUserName(profile, member.name))
                ? currentUserName
                : null
            }
            onPress={() => {
              void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.push(`/group/${group.id}`);
            }}
          />
        ))}

        <View style={styles.actionButtonsContainer}>
          <ActionCard
            onPress={handleCreateGroup}
            iconName="add"
            title="Crear grupo"
            subtitle="Empezá uno nuevo"
          />
          <ActionCard
            onPress={handleOpenJoinGroup}
            iconName="enter-outline"
            title="Unirse a grupo"
            subtitle="Con código"
          />
        </View>
      </View>

      {groups.length === 0 ? (
        <View style={styles.emptyWrap}>
          <EmptyState
            icon="💸"
            title="No hay grupos todavia"
            message="Crea tu primer grupo para empezar"
          />
        </View>
      ) : null}

      <Modal
        visible={joinModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setJoinModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalContainer}>
            <Text style={metallicStyles.headline}>Unirse a un grupo</Text>
            <Text style={metallicStyles.subhead}>
              Pedile a un amigo el código de invitación para unirte a su grupo.
            </Text>
            <Field
              autoCapitalize="characters"
              autoCorrect={false}
              label="Código de invitación"
              onChangeText={(value) => {
                setJoinCode(value);
                if (joinError) setJoinError('');
              }}
              placeholder="C0D1G0"
              value={joinCode}
            />
            {joinError ? <Text style={styles.errorText}>{joinError}</Text> : null}
            <PrimaryButton
              label="Unirme al grupo"
              loading={joinLoading}
              onPress={() => void handleJoinGroup()}
              disabled={!joinCode.trim()}
            />
            <Pressable
              onPress={() => {
                void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setJoinModalVisible(false);
              }}
            >
              <Text style={[metallicStyles.footnote, { padding: 8 }]}>Cancelar</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingTop: 0,
    paddingBottom: 120,
    gap: 16,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    ...metallicStyles.callout,
    color: darkColors.textSecondary,
  },
  greetingBlock: {
    paddingTop: 0,
    marginTop: 0,
    gap: 2,
  },
  groupsList: {
    gap: 16,
  },
  emptyWrap: {
    marginTop: 12,
  },
  actionButtonsContainer: {
    flexDirection: 'row',
    gap: 16,
  },
  actionCard: {
    padding: 16,
    gap: 16,
  },
  createGroupRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    flex: 1,
  },
  createGroupIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: darkColors.cardSecondary,
    borderWidth: 1,
    borderColor: darkColors.borderDefault,
    alignItems: 'center',
    justifyContent: 'center',
  },
  groupTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  groupMeta: {
    flex: 1,
    gap: 2,
  },
  groupBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  avatarStack: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  moreAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: darkColors.cardSecondary,
    borderWidth: 1,
    borderColor: darkColors.borderDefault,
    alignItems: 'center',
    justifyContent: 'center',
  },
  moreAvatarLabel: {
    color: darkColors.textPrimary,
    fontSize: 11,
    fontWeight: '700',
  },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  modalContainer: {
    backgroundColor: darkColors.card,
    borderRadius: 20,
    padding: 24,
    gap: 16,
    width: '100%',
  },
  errorText: {
    color: '#f87171',
    textAlign: 'center',
    fontSize: 14,
  },
});
