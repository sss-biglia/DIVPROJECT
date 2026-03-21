import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useRef, useState } from 'react';
import { Animated, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';

import { MemberAvatar } from '../../components/MemberAvatar';
import { EmptyState, Screen, SectionTitle } from '../../components/ui';
import { theme } from '../../constants/theme';
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
  const scale = useRef(new Animated.Value(1)).current;

  const onPressIn = () => {
    Animated.spring(scale, {
      toValue: 0.98,
      useNativeDriver: true,
      speed: 22,
      bounciness: 0,
    }).start();
  };

  const onPressOut = () => {
    Animated.spring(scale, {
      toValue: 1,
      useNativeDriver: true,
      speed: 20,
      bounciness: 0,
    }).start();
  };

  const visibleMembers = members.slice(0, 4);
  const remaining = members.length - visibleMembers.length;

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <Pressable
        onPress={onPress}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        style={styles.groupCard}
      >
        <LinearGradient
          colors={['#2a2a2a', '#1a1a1a']}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={[StyleSheet.absoluteFill, { borderRadius: 16 }]}
        />
        <>
          <View style={styles.groupTop}>
            <Text style={styles.groupEmoji}>{emoji}</Text>
            <View style={styles.groupMeta}>
              <Text style={styles.groupName}>{title}</Text>
              <Text style={styles.groupSub}>{subtitle}</Text>
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
              <Text style={styles.groupAmount}>{amount}</Text>
              <Ionicons color={theme.colors.textSecondary} name="chevron-forward" size={18} />
            </View>
          </View>
        </>
      </Pressable>
    </Animated.View>
  );
}

function CreateGroupCard({ onPress }: { onPress: () => void }) {
  const scale = useRef(new Animated.Value(1)).current;

  const onPressIn = () => {
    Animated.spring(scale, {
      toValue: 0.98,
      useNativeDriver: true,
      speed: 22,
      bounciness: 0,
    }).start();
  };

  const onPressOut = () => {
    Animated.spring(scale, {
      toValue: 1,
      useNativeDriver: true,
      speed: 20,
      bounciness: 0,
    }).start();
  };

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <Pressable
        onPress={onPress}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        style={[styles.groupCard, styles.createGroupCard]}
      >
        <LinearGradient
          colors={['#2a2a2a', '#1a1a1a']}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={[StyleSheet.absoluteFill, { borderRadius: 16 }]}
        />
        <>
          <View style={styles.createGroupRow}>
            <View style={styles.createGroupIcon}>
              <Ionicons color="#98A869" name="add" size={28} />
            </View>
            <View style={styles.groupMeta}>
              <Text style={styles.groupName}>Crear grupo</Text>
              <Text style={styles.groupSub}>Empeza un nuevo grupo para dividir gastos.</Text>
            </View>
          </View>
          <Ionicons color={theme.colors.textSecondary} name="chevron-forward" size={18} />
        </>
      </Pressable>
    </Animated.View>
  );
}

export default function GroupsScreen() {
  const router = useRouter();
  const { groups, isReady, profile, refreshGroups } = useApp();
  const [refreshing, setRefreshing] = useState(false);
  const currentUserName = profile ? `${profile.name} ${profile.lastName}`.trim() : null;

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
          tintColor={theme.colors.textPrimary}
        />
      }
    >
      <View style={styles.greetingBlock}>
        <Text style={styles.greeting}>{getGreeting()}</Text>
        <Text style={styles.greetingName}>
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

        <CreateGroupCard onPress={handleCreateGroup} />
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
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingTop: 0,
    paddingBottom: 120,
    gap: theme.spacing.md,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    color: theme.colors.textSecondary,
    ...theme.typography.callout,
  },
  greetingBlock: {
    paddingTop: 0,
    marginTop: 0,
    gap: 2,
  },
  greeting: {
    color: theme.colors.textSecondary,
    ...theme.typography.footnote,
  },
  greetingName: {
    color: theme.colors.textPrimary,
    ...theme.typography.title1,
  },
  groupsList: {
    gap: theme.spacing.md,
  },
  emptyWrap: {
    marginTop: theme.spacing.sm,
  },
  groupCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#363636',
    borderTopColor: '#484848',
    padding: theme.spacing.md,
    gap: theme.spacing.md,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 8,
  },
  createGroupCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#98A869',
    borderTopColor: '#b8c87a',
    shadowColor: '#98A869',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  createGroupRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    flex: 1,
  },
  createGroupIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: theme.colors.cardSecondary,
    borderWidth: 1,
    borderColor: theme.colors.borderDefault,
    alignItems: 'center',
    justifyContent: 'center',
  },
  groupTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
  },
  groupEmoji: {
    fontSize: 36,
  },
  groupMeta: {
    flex: 1,
    gap: 2,
  },
  groupName: {
    color: theme.colors.textPrimary,
    fontSize: 16,
    fontWeight: '600',
  },
  groupSub: {
    color: theme.colors.textSecondary,
    fontSize: 12,
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
    backgroundColor: theme.colors.cardSecondary,
    borderWidth: 1,
    borderColor: theme.colors.borderDefault,
    alignItems: 'center',
    justifyContent: 'center',
  },
  moreAvatarLabel: {
    color: theme.colors.textPrimary,
    fontSize: 11,
    fontWeight: '700',
  },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  groupAmount: {
    color: theme.colors.textPrimary,
    fontSize: 16,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
});
