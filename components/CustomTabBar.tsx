import { Ionicons } from '@expo/vector-icons';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { BlurView } from 'expo-blur';
import { useRef } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';

import { theme } from '../constants/theme';

interface CustomTabBarProps extends BottomTabBarProps {
  onPressAdd: () => void;
}

export function CustomTabBar({
  state,
  descriptors,
  navigation,
  insets,
  onPressAdd,
}: CustomTabBarProps) {
  const scale = useRef(new Animated.Value(1)).current;

  const routes = state.routes.filter(
    (route) => route.name === 'index' || route.name === 'balances'
  );

  const animatePlus = () => {
    Animated.sequence([
      Animated.spring(scale, { toValue: 0.92, useNativeDriver: true, speed: 30, bounciness: 0 }),
      Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 20, bounciness: 4 }),
    ]).start();
  };

  const leftRoute = routes.find((r) => r.name === 'index');
  const rightRoute = routes.find((r) => r.name === 'balances');

  const renderTab = (route: typeof routes[0]) => {
    if (!route) return null;
    const routeIndex = state.routes.findIndex((item) => item.key === route.key);
    const isFocused = state.index === routeIndex;
    const options = descriptors[route.key].options;
    const label =
      typeof options.tabBarLabel === 'string'
        ? options.tabBarLabel
        : typeof options.title === 'string'
          ? options.title
          : route.name === 'index'
            ? 'Grupos'
            : 'Saldos';
    const iconName = route.name === 'index' ? 'grid-outline' : 'wallet-outline';

    return (
      <Pressable
        key={route.key}
        onPress={() => navigation.navigate(route.name)}
        style={styles.tabButton}
      >
        <Ionicons
          color={isFocused ? theme.colors.textPrimary : theme.colors.textTertiary}
          name={iconName}
          size={22}
        />
        <Text
          style={[
            styles.tabLabel,
            { color: isFocused ? theme.colors.textPrimary : theme.colors.textTertiary },
          ]}
        >
          {label}
        </Text>
      </Pressable>
    );
  };

  return (
    <View style={[styles.wrap, { paddingBottom: Math.max(insets.bottom, 8) }]}>
      <BlurView intensity={24} tint="dark" style={styles.blur}>
        <View style={styles.inner}>

          {/* Left tab — Grupos */}
          <View style={styles.side}>
            {renderTab(leftRoute!)}
          </View>

          {/* Center — + button */}
          <View style={styles.centerWrap}>
            <Animated.View style={{ transform: [{ scale }] }}>
              <Pressable
                onPress={() => {
                  animatePlus();
                  onPressAdd();
                }}
                style={styles.plusButton}
              >
                <Ionicons color={theme.colors.background} name="add" size={30} />
              </Pressable>
            </Animated.View>
          </View>

          {/* Right tab — Saldos */}
          <View style={styles.side}>
            {renderTab(rightRoute!)}
          </View>

        </View>
      </BlurView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: 'transparent',
  },
  blur: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.04)',
  },
  inner: {
    height: 72,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  side: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabButton: {
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 12,
  },
  tabLabel: {
    fontSize: 10,
    letterSpacing: 0.3,
    fontWeight: '600',
  },
  centerWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -20,
  },
  plusButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: theme.colors.textPrimary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 12,
  },
});
