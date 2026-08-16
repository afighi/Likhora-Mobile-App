import React, { useRef } from 'react';
import { 
  View, 
  Pressable, 
  StyleSheet, 
  Image, 
  Platform, 
  Animated 
} from 'react-native';
import { 
  Home, 
  Map, 
  Store, 
  Users 
} from 'lucide-react-native';
import { LikhoraColors } from '@/constants/theme';

export interface GlassTabBarProps {
  state: any;
  descriptors: any;
  navigation: any;
}

const ALLOWED_ROUTES = ['index', 'roadmap', 'ai-assistant', 'suppliers', 'community'];

export const GlassTabBar: React.FC<GlassTabBarProps> = ({
  state,
  descriptors,
  navigation,
}) => {
  const visibleRoutes = state.routes.filter((r: any) => ALLOWED_ROUTES.includes(r.name));

  return (
    <View style={styles.floatingContainer}>
      <View style={styles.glassHolder}>
        {visibleRoutes.map((route: any) => {
          const index = state.routes.findIndex((r: any) => r.key === route.key);
          const { options } = descriptors[route.key];
          const isFocused = state.index === index;

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });

            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          const onLongPress = () => {
            navigation.emit({
              type: 'tabLongPress',
              target: route.key,
            });
          };

          return (
            <GlassTabButton
              key={route.key}
              route={route}
              isFocused={isFocused}
              onPress={onPress}
              onLongPress={onLongPress}
              accessibilityLabel={options.tabBarAccessibilityLabel}
              testID={options.tabBarTestID}
            />
          );
        })}
      </View>
    </View>
  );
};

interface GlassTabButtonProps {
  route: any;
  isFocused: boolean;
  onPress: () => void;
  onLongPress: () => void;
  accessibilityLabel?: string;
  testID?: string;
}

const GlassTabButton: React.FC<GlassTabButtonProps> = ({
  route,
  isFocused,
  onPress,
  onLongPress,
  accessibilityLabel,
  testID,
}) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.88,
      useNativeDriver: Platform.OS !== 'web',
      speed: 30,
      bounciness: 6,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: isFocused ? 1.05 : 1,
      useNativeDriver: Platform.OS !== 'web',
      speed: 25,
      bounciness: 10,
    }).start();
  };

  const isAI = route.name === 'ai-assistant';
  const iconColor = isFocused ? '#FFFFFF' : '#8C8291';
  const iconSize = 20;

  const renderIcon = () => {
    if (route.name === 'index') {
      return <Home size={iconSize} color={iconColor} strokeWidth={isFocused ? 2.5 : 2} />;
    }
    if (route.name === 'roadmap') {
      return <Map size={iconSize} color={iconColor} strokeWidth={isFocused ? 2.5 : 2} />;
    }
    if (route.name === 'ai-assistant') {
      return (
        <View style={[styles.aiIconBadge, isFocused && styles.aiIconBadgeActive]}>
          <Image
            source={require('../../../assets/images/tabIcons/likhoralogo.png')}
            resizeMode="contain"
            style={{ width: 28, height: 28 }}
          />
        </View>
      );
    }
    if (route.name === 'suppliers') {
      return <Store size={iconSize} color={iconColor} strokeWidth={isFocused ? 2.5 : 2} />;
    }
    if (route.name === 'community') {
      return <Users size={iconSize} color={iconColor} strokeWidth={isFocused ? 2.5 : 2} />;
    }
    return null;
  };

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={isFocused ? { selected: true } : {}}
      accessibilityLabel={accessibilityLabel}
      testID={testID}
      onPress={onPress}
      onLongPress={onLongPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={({ hovered }: any) => [
        styles.tabItem,
        !isAI && isFocused && styles.tabItemFocused,
        !isAI && hovered && styles.tabItemHovered,
      ]}
    >
      <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
        {renderIcon()}
      </Animated.View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  floatingContainer: {
    position: 'absolute',
    bottom: 24,
    left: 20,
    right: 20,
    alignItems: 'center',
    justifyContent: 'center',
    pointerEvents: 'box-none',
  } as any,
  glassHolder: {
    width: '100%',
    height: 66,
    borderRadius: 38,
    backgroundColor: Platform.OS === 'web' ? 'rgba(255, 255, 255, 0.85)' : 'rgba(255, 255, 255, 0.92)',
    borderWidth: 1,
    borderColor: 'rgba(42, 33, 48, 0.08)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 8,
    elevation: 12,
    ...(Platform.OS === 'web'
      ? ({
          backdropFilter: 'blur(28px) saturate(200%)',
          WebkitBackdropFilter: 'blur(28px) saturate(200%)',
          boxShadow: '0 12px 32px rgba(42, 33, 48, 0.12), inset 0 1px 1px rgba(255, 255, 255, 0.9)',
        } as any)
      : {
          shadowColor: LikhoraColors.textPrimary,
          shadowOffset: { width: 0, height: 12 },
          shadowOpacity: 0.12,
          shadowRadius: 24,
        }),
  },
  tabItem: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    transitionProperty: 'all',
    transitionDuration: '200ms',
  } as any,
  tabItemFocused: {
    backgroundColor: LikhoraColors.primary,
    borderRadius: 24,
  },
  tabItemHovered: {
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
  },
  aiIconBadge: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: LikhoraColors.secondaryLavender,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.95)',
    elevation: 6,
    ...(Platform.OS === 'web'
      ? ({ boxShadow: '0 4px 12px rgba(74, 21, 75, 0.25)' } as any)
      : {
          shadowColor: LikhoraColors.primary,
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.25,
          shadowRadius: 8,
        }),
  },
  aiIconBadgeActive: {
    backgroundColor: '#FFFFFF',
    borderColor: LikhoraColors.primary,
    borderWidth: 2,
    ...(Platform.OS === 'web'
      ? ({ boxShadow: '0 4px 14px rgba(74, 21, 75, 0.35)' } as any)
      : {
          shadowOpacity: 0.35,
          shadowRadius: 10,
        }),
  },
});
