import React, { useRef } from 'react';
import { Pressable, Text, StyleSheet, ActivityIndicator, ViewStyle, TextStyle, View, Animated, Platform } from 'react-native';
import { LikhoraColors, Radius, Spacing, LikhoraFont } from '@/constants/theme';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'google' | 'text';
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  icon?: React.ReactNode;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  loading = false,
  disabled = false,
  style,
  textStyle,
  icon,
}) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.96,
      useNativeDriver: Platform.OS !== 'web',
      speed: 30,
      bounciness: 4,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: Platform.OS !== 'web',
      speed: 30,
      bounciness: 6,
    }).start();
  };

  const getContainerStyle = () => {
    switch (variant) {
      case 'primary':
        return styles.primaryBtn;
      case 'secondary':
        return styles.secondaryBtn;
      case 'outline':
        return styles.outlineBtn;
      case 'google':
        return styles.googleBtn;
      case 'text':
        return styles.textBtn;
      default:
        return styles.primaryBtn;
    }
  };

  const getTextStyle = () => {
    switch (variant) {
      case 'primary':
        return styles.primaryText;
      case 'secondary':
        return styles.secondaryText;
      case 'outline':
        return styles.outlineText;
      case 'google':
        return styles.googleText;
      case 'text':
        return styles.textBtnText;
      default:
        return styles.primaryText;
    }
  };

  return (
    <AnimatedPressable
      style={[
        styles.baseBtn,
        getContainerStyle(),
        disabled && styles.disabledBtn,
        { transform: [{ scale: scaleAnim }] },
        style,
      ]}
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled || loading}
    >
      {loading ? (
        <ActivityIndicator
          color={variant === 'primary' ? '#FFFFFF' : LikhoraColors.primary}
          size="small"
        />
      ) : (
        <View style={styles.contentContainer}>
          {icon && <View style={styles.iconContainer}>{icon}</View>}
          <Text style={[styles.baseText, getTextStyle(), textStyle]}>
            {title}
          </Text>
        </View>
      )}
    </AnimatedPressable>
  );
};

const styles = StyleSheet.create({
  baseBtn: {
    height: 52,
    borderRadius: Radius.large,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.four,
    width: '100%',
    marginVertical: 6,
  },
  contentContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainer: {
    marginRight: 10,
  },
  primaryBtn: {
    backgroundColor: LikhoraColors.primary,
    ...Platform.select({
      web: { boxShadow: '0px 4px 12px rgba(91, 20, 111, 0.25)' } as any,
      default: {
        shadowColor: LikhoraColors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 8,
        elevation: 4,
      },
    }),
  },
  secondaryBtn: {
    backgroundColor: LikhoraColors.secondaryLavender,
  },
  outlineBtn: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: LikhoraColors.primary,
  },
  googleBtn: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: LikhoraColors.border,
    ...Platform.select({
      web: { boxShadow: '0px 1px 4px rgba(0, 0, 0, 0.05)' } as any,
      default: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 3,
        elevation: 1,
      },
    }),
  },
  textBtn: {
    backgroundColor: 'transparent',
    height: 'auto',
    paddingHorizontal: 0,
    marginVertical: 4,
  },
  disabledBtn: {
    opacity: 0.5,
    elevation: 0,
  },
  baseText: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    fontFamily: LikhoraFont.fontFamily,
  },
  primaryText: {
    color: '#FFFFFF',
  },
  secondaryText: {
    color: LikhoraColors.primary,
  },
  outlineText: {
    color: LikhoraColors.primary,
  },
  googleText: {
    color: LikhoraColors.textPrimary,
    fontWeight: '500',
  },
  textBtnText: {
    color: LikhoraColors.primary,
    fontSize: 14,
  },
});
