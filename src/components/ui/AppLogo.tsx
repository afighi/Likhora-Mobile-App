import React from 'react';
import { View, Image, StyleSheet, ImageStyle, ViewStyle } from 'react-native';

interface AppLogoProps {
  size?: number;
  showText?: boolean;
  style?: ViewStyle;
  imageStyle?: ImageStyle;
}

export const AppLogo: React.FC<AppLogoProps> = ({
  size = 34,
  style,
  imageStyle,
}) => {
  // likhoralogo-mark.png is a square, tightly-cropped, transparent-background
  // crop of the app icon (background removed so it drops cleanly onto any
  // screen color instead of showing a white box behind it).
  return (
    <View style={[styles.container, style]}>
      <Image
        source={require('@/assets/images/likhoralogo-mark.png')}
        resizeMode="contain"
        style={[
          {
            width: size,
            height: size,
          },
          imageStyle,
        ]}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
});
