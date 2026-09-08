/**
 * Cross-platform confirm/notify.
 *
 * react-native-web ships Alert as a literal no-op:
 *
 *   class Alert { static alert() {} }
 *
 * so on web every Alert.alert call silently does nothing. For a confirmation
 * dialog that means the destructive action never runs at all (the button looks
 * broken), and for an error message it means the failure is invisible — which
 * is worse, because the user is told nothing went wrong.
 *
 * notify() uses the browser's own dialog on web and React Native's Alert on
 * device, so a failure is never swallowed on either.
 *
 * There is deliberately no confirm() here: browsers stamp window.confirm with
 * the page origin ("localhost:8081 says"), which looks nothing like the app.
 * Confirmations use components/ui/ConfirmDialog instead, which renders the
 * same everywhere.
 */

import { Alert, Platform } from 'react-native';

/** A message the user just has to acknowledge. */
export const notify = (title: string, message?: string) => {
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined' && typeof window.alert === 'function') {
      window.alert(message ? `${title}\n\n${message}` : title);
    }
    return;
  }
  Alert.alert(title, message);
};
