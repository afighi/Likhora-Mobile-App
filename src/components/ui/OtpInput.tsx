import React, { useRef } from 'react';
import { View, Text, TextInput, StyleSheet, Pressable, NativeSyntheticEvent, TextInputKeyPressEventData } from 'react-native';

import { LikhoraColors, Radius, LikhoraFont } from '@/constants/theme';

interface OtpInputProps {
  value: string;
  onChange: (code: string) => void;
  length?: number;
  error?: string;
  /** Fired when the last box is filled, so the caller can auto-submit. */
  onComplete?: (code: string) => void;
}

/**
 * One box per digit.
 *
 * The boxes are presentational; the actual state is a single string, which
 * keeps paste, autofill and backspace-across-boxes working without juggling
 * an array of refs' values. Focus is the only thing that moves between boxes.
 */
export const OtpInput: React.FC<OtpInputProps> = ({
  value,
  onChange,
  length = 6,
  error,
  onComplete,
}) => {
  const inputs = useRef<(TextInput | null)[]>([]);

  const focusBox = (index: number) => {
    if (index >= 0 && index < length) inputs.current[index]?.focus();
  };

  const handleChange = (raw: string, index: number) => {
    const digits = raw.replace(/[^0-9]/g, '');
    if (!digits) return;

    // A paste (or SMS autofill) lands entirely in one box, so spread it across
    // the remaining boxes rather than keeping only the first character.
    const next = (value.slice(0, index) + digits + value.slice(index + digits.length))
      .replace(/[^0-9]/g, '')
      .slice(0, length);

    onChange(next);

    const landedAt = Math.min(index + digits.length, length - 1);
    if (next.length >= length) {
      inputs.current[length - 1]?.blur();
      onComplete?.(next);
    } else {
      focusBox(landedAt);
    }
  };

  const handleKeyPress = (
    event: NativeSyntheticEvent<TextInputKeyPressEventData>,
    index: number
  ) => {
    if (event.nativeEvent.key !== 'Backspace') return;

    if (value[index]) {
      // Clear this box and stay put.
      onChange(value.slice(0, index) + value.slice(index + 1));
      return;
    }

    // Already empty: step back and clear the previous digit, which is what
    // people expect when correcting a code.
    if (index > 0) {
      onChange(value.slice(0, index - 1) + value.slice(index));
      focusBox(index - 1);
    }
  };

  return (
    <View>
      <Text style={styles.label}>Enter the 6-digit code</Text>

      <View style={styles.row}>
        {Array.from({ length }).map((_, index) => {
          const digit = value[index] || '';
          const isNext = index === value.length;
          return (
            <Pressable
              key={index}
              style={[
                styles.box,
                digit ? styles.boxFilled : null,
                isNext ? styles.boxActive : null,
                error ? styles.boxError : null,
              ]}
              // Tapping any box focuses the first empty one, so a half-typed
              // code can't get a digit written into the middle of it.
              onPress={() => focusBox(Math.min(value.length, length - 1))}
            >
              <TextInput
                ref={(ref) => {
                  inputs.current[index] = ref;
                }}
                style={styles.input}
                value={digit}
                onChangeText={(text) => handleChange(text, index)}
                onKeyPress={(event) => handleKeyPress(event, index)}
                keyboardType="number-pad"
                // Lets a 6-digit paste arrive in one box before being spread.
                maxLength={length}
                selectTextOnFocus
                textContentType="oneTimeCode"
                autoComplete="one-time-code"
                accessibilityLabel={`Digit ${index + 1} of ${length}`}
              />
            </Pressable>
          );
        })}
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
};

const styles = StyleSheet.create({
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: LikhoraColors.textPrimary,
    marginBottom: 10,
    fontFamily: LikhoraFont.fontFamily,
  },
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  box: {
    flex: 1,
    height: 56,
    borderRadius: Radius.large,
    borderWidth: 1.5,
    borderColor: LikhoraColors.border,
    backgroundColor: LikhoraColors.inputBackground,
    alignItems: 'center',
    justifyContent: 'center',
  },
  boxFilled: {
    borderColor: LikhoraColors.primary,
    backgroundColor: '#FFFFFF',
  },
  boxActive: { borderColor: LikhoraColors.primary },
  boxError: { borderColor: LikhoraColors.errorRed },
  input: {
    width: '100%',
    height: '100%',
    textAlign: 'center',
    fontSize: 22,
    fontWeight: '800',
    color: LikhoraColors.textPrimary,
    fontFamily: LikhoraFont.fontFamily,
    // Removes the default web focus ring so the box border is the only state.
    outlineStyle: 'none' as any,
  },
  error: {
    fontSize: 12,
    color: LikhoraColors.errorRed,
    marginTop: 8,
    fontFamily: LikhoraFont.fontFamily,
  },
});
