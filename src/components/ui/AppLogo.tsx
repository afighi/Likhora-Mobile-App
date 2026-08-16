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
  // likhoralogo.png dimensions: 1024 x 1536 (aspect ratio ~0.667)
  const imageWidth = size * (1024 / 1536);
  // Account for ~69px transparent padding on left of 1024px canvas
  const flushLeftOffset = -Math.round(size * (69 / 1536));

  return (
    <View style={[styles.container, style]}>
      <Image
        source={require('@/assets/images/likhoralogo.png')}
        resizeMode="contain"
        style={[
          {
            width: imageWidth,
            height: size,
            marginLeft: flushLeftOffset,
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
