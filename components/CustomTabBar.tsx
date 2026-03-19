import { Ionicons } from '@expo/vector-icons';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { BlurView } from 'expo-blur';
<<<<<<< HEAD
import { LinearGradient } from 'expo-linear-gradient';
=======
>>>>>>> e56c373a723b1cf071a74a2ae4778af685b4ec31
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
<<<<<<< HEAD
          color={isFocused ? theme.colors.textPrimary : '#8E8E93'}
=======
          color={isFocused ? theme.colors.textPrimary : theme.colors.textTertiary}
>>>>>>> e56c373a723b1cf071a74a2ae4778af685b4ec31
          name={iconName}
          size={22}
        />
        <Text
          style={[
            styles.tabLabel,
<<<<<<< HEAD
            { color: isFocused ? theme.colors.textPrimary : '#8E8E93' },
=======
            { color: isFocused ? theme.colors.textPrimary : theme.colors.textTertiary },
>>>>>>> e56c373a723b1cf071a74a2ae4778af685b4ec31
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
<<<<<<< HEAD
                style={styles.plusOuter}
              >
                <LinearGradient
                  colors={[
                    'rgba(255,255,255,0.38)',
                    'rgba(192,200,208,0.18)',
                    'rgba(96,104,112,0.10)',
                    'rgba(80,88,96,0.06)',
                  ]}
                  locations={[0, 0.35, 0.7, 1]}
                  start={{ x: 0.3, y: 0.2 }}
                  end={{ x: 0.8, y: 0.9 }}
                  style={styles.plusRing}
                >
                  <LinearGradient
                    colors={['#F0F2F5', '#C2CAD2', '#E0E4E8', '#9CA4AC', '#424A52']}
                    locations={[0, 0.25, 0.5, 0.75, 1]}
                    start={{ x: 0.08, y: 0.05 }}
                    end={{ x: 0.92, y: 0.95 }}
                    style={styles.plusDisk}
                  >
                    {[19, 23, 27, 31, 35, 39, 43, 47, 51, 55].map((y, i) => (
                      <View
                        key={i}
                        style={{
                          position: 'absolute',
                          left: 0,
                          right: 0,
                          top: y - 19,
                          height: 0.4,
                          backgroundColor:
                            i % 2 === 0 ? 'rgba(255,255,255,0.16)' : 'rgba(0,0,0,0.05)',
                        }}
                      />
                    ))}
                    <LinearGradient
                      colors={[
                        'rgba(255,255,255,0.16)',
                        'rgba(255,255,255,0.04)',
                        'rgba(255,255,255,0)',
                      ]}
                      locations={[0, 0.55, 1]}
                      start={{ x: 0.4, y: 0.28 }}
                      end={{ x: 0.7, y: 1 }}
                      style={StyleSheet.absoluteFillObject}
                    />
                    <Text style={styles.plusIcon}>+</Text>
                  </LinearGradient>
                </LinearGradient>
=======
                style={styles.plusButton}
              >
                <Ionicons color={theme.colors.background} name="add" size={30} />
>>>>>>> e56c373a723b1cf071a74a2ae4778af685b4ec31
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
<<<<<<< HEAD
    borderTopColor: theme.colors.background,
=======
    borderTopColor: 'rgba(255,255,255,0.04)',
>>>>>>> e56c373a723b1cf071a74a2ae4778af685b4ec31
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
<<<<<<< HEAD
  plusOuter: {
    width: 58,
    height: 58,
    borderRadius: 29,
    shadowColor: '#A0B0C0',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
  },
  plusRing: {
    width: 58,
    height: 58,
    borderRadius: 29,
    padding: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  plusDisk: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  plusIcon: {
    fontSize: 26,
    fontWeight: '200',
    color: 'rgba(28,32,40,0.78)',
    marginTop: -1,
    zIndex: 1,
=======
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
>>>>>>> e56c373a723b1cf071a74a2ae4778af685b4ec31
  },
});
