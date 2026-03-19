import { Ionicons } from '@expo/vector-icons';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useRef } from 'react';
import { Animated, Dimensions, Pressable, StyleSheet, Text, View } from 'react-native';

import { theme } from '../constants/theme';

interface CustomTabBarProps extends BottomTabBarProps {
  onPressAdd: () => void;
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const TAB_COUNT = 3;
const TAB_WIDTH = SCREEN_WIDTH / TAB_COUNT;

const TabButton = ({ route, isFocused, navigation, descriptor }) => {
  const { options } = descriptor;
  const label = route.name === 'index' ? 'Grupos' : 'Saldos';
  const iconName = route.name === 'index' ? 'grid-outline' : 'wallet-outline';

  const scaleAnim = useRef(new Animated.Value(1)).current;
  const opacityAnim = useRef(new Animated.Value(isFocused ? 1 : 0)).current;

  useEffect(() => {
    Animated.spring(scaleAnim, {
      toValue: isFocused ? 1.15 : 1,
      useNativeDriver: true,
      damping: 15,
      stiffness: 200,
    }).start();
    Animated.timing(opacityAnim, {
      toValue: isFocused ? 1 : 0,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }, [isFocused, scaleAnim, opacityAnim]);

  return (
    <Pressable
      key={route.key}
      onPress={() => navigation.navigate(route.name)}
      style={styles.tabButton}
    >
      <Animated.View
        style={{
          position: 'absolute',
          width: 80,
          height: 58,
          borderRadius: 18,
          backgroundColor: 'rgba(152, 168, 105, 0.12)',
          borderWidth: 1,
          borderColor: 'rgba(152, 168, 105, 0.35)',
          borderTopColor: 'rgba(200, 220, 140, 0.5)',
          shadowColor: '#98A869',
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0.25,
          shadowRadius: 8,
          opacity: opacityAnim,
          bottom: -4,
          alignSelf: 'center',
        }}
      />
      <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
        <Ionicons
          color={isFocused ? '#98A869' : '#4a4a4a'}
          name={iconName}
          size={22}
        />
      </Animated.View>
      <Text
        style={[styles.tabLabel, { color: isFocused ? '#98A869' : '#4a4a4a' }]}
      >
        {label}
      </Text>
    </Pressable>
  );
};

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
    scale.stopAnimation(() => {
      scale.setValue(1);
      Animated.sequence([
        Animated.spring(scale, { toValue: 0.92, useNativeDriver: true, speed: 30, bounciness: 0 }),
        Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 20, bounciness: 4 }),
      ]).start();
    });
  };

  const leftRoute = routes.find((r) => r.name === 'index');
  const rightRoute = routes.find((r) => r.name === 'balances');

  const leftRouteIndex = state.routes.findIndex((item) => item.key === leftRoute?.key);
  const rightRouteIndex = state.routes.findIndex((item) => item.key === rightRoute?.key);

  return (
    <View style={[styles.wrap, { paddingBottom: Math.max(insets.bottom, 8) }]}>
      <View style={styles.blur}>
        <LinearGradient
          colors={['#222222', '#111111', '#1e1e1e']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: 0,
            bottom: 0,
          }}
        />
        <View style={styles.inner}>

          {/* Left tab — Grupos */}
          <View style={styles.side}>
            {leftRoute && (
              <TabButton route={leftRoute} isFocused={state.index === leftRouteIndex} navigation={navigation} descriptor={descriptors[leftRoute.key]} />
            )}
          </View>

          {/* Center — + button */}
          <View style={styles.centerWrap}>
            <Animated.View style={{ transform: [{ scale }] }}>
              <Pressable
                onPress={() => {
                  animatePlus();
                  onPressAdd();
                }}
                style={styles.plusOuter}
              >
                <LinearGradient
                  colors={['rgba(176, 194, 126, 0.3)', 'rgba(122, 138, 84, 0.1)']}
                  start={{ x: 0.3, y: 0.2 }}
                  end={{ x: 0.8, y: 0.9 }}
                  style={styles.plusRing}
                >
                  <LinearGradient
                    colors={['#b0c27e', '#7a8a54']}
                    start={{ x: 0.2, y: 0 }}
                    end={{ x: 0.8, y: 1 }}
                    style={styles.plusDisk}
                  >
                    <Text style={styles.plusIcon}>+</Text>
                  </LinearGradient>
                </LinearGradient>
              </Pressable>
            </Animated.View>
          </View>

          {/* Right tab — Saldos */}
          <View style={styles.side}>
            {rightRoute && (
              <TabButton route={rightRoute} isFocused={state.index === rightRouteIndex} navigation={navigation} descriptor={descriptors[rightRoute.key]} />
            )}
          </View>

        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: 'transparent',
  },
  blur: {
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
    justifyContent: 'center',
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
  plusOuter: {
    width: 70,
    height: 70,
    borderRadius: 35,
    shadowColor: '#98A869',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 10,
  },
  plusRing: {
    width: 70,
    height: 70,
    borderRadius: 35,
    padding: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  plusDisk: {
    width: 62,
    height: 62,
    borderRadius: 31,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  plusIcon: {
    fontSize: 31,
    fontWeight: '200',
    color: 'rgba(28,32,40,0.78)',
    marginTop: -2,
    zIndex: 1,
  },
});
