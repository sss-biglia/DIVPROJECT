import React from 'react';
import LottieView from 'lottie-react-native';
import { StyleSheet, View } from 'react-native';

interface IntroScreenProps {
  onFinish: () => void;
}

export const IntroScreen = ({ onFinish }: IntroScreenProps) => {
  return (
    <View style={styles.container}>
      <LottieView
        source={require('../assets/divvv.json')}
        autoPlay
        loop={false}
        style={styles.animation}
        onAnimationFinish={() => {
          onFinish();
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  animation: {
    width: '100%',
    height: '100%',
  },
});
