import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, TextInputProps } from 'react-native';
import { Eye, EyeOff } from 'lucide-react-native';
import { LikhoraColors, Radius, Spacing, LikhoraFont } from '@/constants/theme';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  isPassword?: boolean;
  leftIcon?: React.ReactNode;
  hint?: string;
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  isPassword = false,
  leftIcon,
  hint,
  value,
  onChangeText,
  placeholder,
  secureTextEntry,
  style,
  ...props
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  return (
    <View style={styles.container}>
      {label && <Text style={styles.label}>{label}</Text>}
      <View
        style={[
          styles.inputWrapper,
          isFocused && styles.focusedWrapper,
          error ? styles.errorWrapper : null,
        ]}
      >
        {leftIcon && <View style={styles.leftIconContainer}>{leftIcon}</View>}
        <TextInput
          style={[styles.input, leftIcon ? { paddingLeft: 0 } : null, style]}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={LikhoraColors.textPlaceholder}
          secureTextEntry={isPassword ? !showPassword : secureTextEntry}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          {...props}
        />
        {isPassword && (
          <TouchableOpacity
            style={styles.eyeButton}
            onPress={() => setShowPassword(!showPassword)}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
          >
            {showPassword ? (
              <EyeOff size={20} color={LikhoraColors.textSecondary} />
            ) : (
              <Eye size={20} color={LikhoraColors.textSecondary} />
            )}
          </TouchableOpacity>
        )}
      </View>
      {hint && !error && <Text style={styles.hintText}>{hint}</Text>}
      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: Spacing.three,
    width: '100%',
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: LikhoraColors.textPrimary,
    marginBottom: 6,
    fontFamily: LikhoraFont.fontFamily,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: LikhoraColors.inputBackground,
    borderRadius: Radius.large,
    borderWidth: 1.5,
    borderColor: 'transparent',
    paddingHorizontal: Spacing.three,
    height: 52,
  },
  focusedWrapper: {
    borderColor: LikhoraColors.inputFocusBorder,
    backgroundColor: '#FFFFFF',
    shadowColor: LikhoraColors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  errorWrapper: {
    borderColor: LikhoraColors.errorRed,
    backgroundColor: LikhoraColors.errorRedSoft,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: LikhoraColors.textPrimary,
    paddingVertical: 10,
    height: '100%',
    fontFamily: LikhoraFont.fontFamily,
  },
  leftIconContainer: {
    marginRight: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  eyeButton: {
    padding: 6,
    marginLeft: 4,
  },
  hintText: {
    fontSize: 12,
    color: LikhoraColors.textSecondary,
    marginTop: 4,
    fontFamily: LikhoraFont.fontFamily,
  },
  errorText: {
    fontSize: 12,
    color: LikhoraColors.errorRed,
    marginTop: 4,
    fontWeight: '600',
    fontFamily: LikhoraFont.fontFamily,
  },
});
