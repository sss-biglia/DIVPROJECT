import * as Haptics from 'expo-haptics';
import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, StyleProp, StyleSheet, Text, TextStyle, View } from 'react-native';

interface TickerNumberProps {
  value: number;
  style?: StyleProp<TextStyle>;
  formatFn?: (n: number) => string;
  duration?: number;
}

export function TickerNumber({
  value,
  style,
  formatFn = (n) => n.toLocaleString('es-AR'),
  duration = 800,
}: TickerNumberProps) {
  const [digits, setDigits] = useState(formatFn(value).split(''));
  const previousValue = useRef(value);
  const animations = useRef<Animated.Value[]>([]);

  useEffect(() => {
    if (previousValue.current === value) {
      return;
    }

    const nextDigits = formatFn(value).split('');
    const priorDigits = formatFn(previousValue.current).split('');

    while (priorDigits.length < nextDigits.length) {
      priorDigits.unshift(' ');
    }

    animations.current = nextDigits.map(() => new Animated.Value(0));
    setDigits(nextDigits);

    const animatedDigits = animations.current
      .map((animation, index) => {
        if (nextDigits[index] === priorDigits[index]) {
          return null;
        }

        return Animated.timing(animation, {
          toValue: 1,
          duration,
          delay: index * 30,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        });
      })
      .filter(Boolean) as Animated.CompositeAnimation[];

    if (animatedDigits.length > 0) {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      Animated.parallel(animatedDigits).start();
    }

    previousValue.current = value;
  }, [duration, formatFn, value]);

  return (
    <View style={styles.row}>
      {digits.map((digit, index) => {
        const animation = animations.current[index];
        const translateY = animation
          ? animation.interpolate({
              inputRange: [0, 1],
              outputRange: [14, 0],
            })
          : undefined;
        const opacity = animation
          ? animation.interpolate({
              inputRange: [0, 0.3, 1],
              outputRange: [0, 1, 1],
            })
          : undefined;

        return (
          <View key={`${digit}-${index}`} style={styles.digitContainer}>
            {animation ? (
              <Animated.Text
                style={[
                  styles.digit,
                  style,
                  {
                    transform: [{ translateY: translateY as any }],
                    opacity: opacity as any,
                  },
                ]}
              >
                {digit}
              </Animated.Text>
            ) : (
              <Text style={[styles.digit, style]}>{digit}</Text>
            )}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    overflow: 'hidden',
  },
  digitContainer: {
    overflow: 'hidden',
  },
  digit: {
    color: '#A8B89C',
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
});
