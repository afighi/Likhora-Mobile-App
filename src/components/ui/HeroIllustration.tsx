import React from 'react';
import { View, StyleSheet, Text, Image } from 'react-native';
import { Sparkles } from 'lucide-react-native';
import { LikhoraColors, Radius } from '@/constants/theme';

interface HeroIllustrationProps {
  type?: 'login' | 'signup' | 'onboarding';
}

export const HeroIllustration: React.FC<HeroIllustrationProps> = ({ type = 'login' }) => {
  return (
    <View style={styles.container}>
      <View style={styles.illustrationCard}>
        {/* Background glow shape */}
        <View style={styles.bgCircle} />

        {/* Main Logo Container */}
        <View style={styles.logoBadgeContainer}>
          <Image
            source={require('../../../assets/images/likhoralogo.png')}
            resizeMode="contain"
            style={styles.logoImage}
          />
        </View>

        {/* AI Sparkle Badge */}
        <View style={styles.aiBadge}>
          <Sparkles size={16} color="#FFFFFF" />
        </View>

        {/* Floating Tag */}
        <View style={styles.floatingTag}>
          <Text style={styles.tagText}>
            {type === 'login' ? 'Launch Smart' : type === 'signup' ? 'Grow Business' : 'Personalized AI'}
          </Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 12,
  },
  illustrationCard: {
    width: '100%',
    height: 140,
    backgroundColor: '#F5EBF8',
    borderRadius: Radius.xlarge,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  bgCircle: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: '#E9D5FF',
    top: -20,
    opacity: 0.6,
  },
  logoBadgeContainer: {
    width: 90,
    height: 90,
    backgroundColor: '#FFFFFF',
    borderRadius: 45,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: LikhoraColors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
    padding: 10,
  },
  logoImage: {
    width: 70,
    height: 70,
  },
  aiBadge: {
    position: 'absolute',
    top: 14,
    left: 20,
    backgroundColor: LikhoraColors.primary,
    padding: 6,
    borderRadius: 20,
    elevation: 2,
  },
  floatingTag: {
    position: 'absolute',
    bottom: 12,
    right: 16,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  tagText: {
    fontSize: 11,
    fontWeight: '700',
    color: LikhoraColors.primary,
  },
});
