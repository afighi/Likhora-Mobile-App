import React from 'react';
import { View, Text, StyleSheet, Modal, Pressable, ActivityIndicator } from 'react-native';

import { LikhoraColors, Radius, Spacing, LikhoraFont } from '@/constants/theme';

interface ConfirmDialogProps {
  visible: boolean;
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Paints the confirm button red — use for anything that destroys data. */
  destructive?: boolean;
  /** Shows a spinner on the confirm button and blocks dismissal while working. */
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * In-app confirmation dialog.
 *
 * Deliberately not the platform dialog. React Native's Alert renders natively
 * on device but is a no-op stub in react-native-web, and window.confirm — the
 * obvious web substitute — is stamped by the browser with the page origin
 * ("localhost:8081 says"), which looks nothing like the app. Since this
 * project is previewed in a browser but ships to iOS and Android, a Modal is
 * the only option that behaves and looks identical in both places.
 */
export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  visible,
  title,
  message,
  confirmLabel = 'OK',
  cancelLabel = 'Cancel',
  destructive = false,
  loading = false,
  onConfirm,
  onCancel,
}) => (
  <Modal
    visible={visible}
    transparent
    animationType="fade"
    // Android's hardware back button, and Escape on web.
    onRequestClose={loading ? undefined : onCancel}
  >
    <Pressable style={styles.backdrop} onPress={loading ? undefined : onCancel}>
      {/* Swallows taps on the card so they don't reach the dismissing backdrop. */}
      <Pressable style={styles.card} onPress={() => {}}>
        <Text style={styles.title}>{title}</Text>
        {message ? <Text style={styles.message}>{message}</Text> : null}

        <View style={styles.actions}>
          <Pressable
            style={({ pressed }) => [styles.button, styles.cancelButton, pressed && styles.pressed]}
            onPress={onCancel}
            disabled={loading}
            accessibilityRole="button"
          >
            <Text style={styles.cancelText}>{cancelLabel}</Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [
              styles.button,
              destructive ? styles.destructiveButton : styles.confirmButton,
              pressed && styles.pressed,
            ]}
            onPress={onConfirm}
            disabled={loading}
            accessibilityRole="button"
          >
            {loading ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.confirmText}>{confirmLabel}</Text>
            )}
          </Pressable>
        </View>
      </Pressable>
    </Pressable>
  </Modal>
);

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(20, 8, 22, 0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.four,
  },
  card: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: '#FFFFFF',
    borderRadius: Radius.xlarge,
    padding: Spacing.four,
  },
  title: {
    fontSize: 16,
    fontWeight: '800',
    color: LikhoraColors.textPrimary,
    fontFamily: LikhoraFont.fontFamily,
    marginBottom: 6,
  },
  message: {
    fontSize: 13,
    color: LikhoraColors.textSecondary,
    lineHeight: 19,
    fontFamily: LikhoraFont.fontFamily,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: Spacing.four,
  },
  button: {
    minWidth: 92,
    paddingHorizontal: 16,
    paddingVertical: 11,
    borderRadius: Radius.medium,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: { opacity: 0.85 },
  cancelButton: {
    backgroundColor: LikhoraColors.inputBackground,
  },
  cancelText: {
    fontSize: 13,
    fontWeight: '800',
    color: LikhoraColors.textSecondary,
    fontFamily: LikhoraFont.fontFamily,
  },
  confirmButton: { backgroundColor: LikhoraColors.primary },
  destructiveButton: { backgroundColor: LikhoraColors.errorRed },
  confirmText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
    fontFamily: LikhoraFont.fontFamily,
  },
});
