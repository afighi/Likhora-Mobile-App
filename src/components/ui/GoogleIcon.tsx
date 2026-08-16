import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export const GoogleIcon: React.FC = () => {
  return (
    <View style={styles.badge}>
      <Text style={styles.gText}>G</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#EA4335',
    alignItems: 'center',
    justifyContent: 'center',
  },
  gText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '900',
  },
});
