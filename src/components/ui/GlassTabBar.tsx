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
  const iconColor = isFocused ? '#FFFFFF' : '#6E5D70';
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
        <View style={styles.centerIconSquircle}>
          <Image
            source={require('../../../assets/images/tabIcons/likhoralogo.png')}
            resizeMode="contain"
            style={{ width: 24, height: 24 }}
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
    bottom: 20,
    left: 20,
    right: 20,
    alignItems: 'center',
    justifyContent: 'center',
    pointerEvents: 'box-none',
  } as any,
  glassHolder: {
    width: '100%',
    height: 64,
    borderRadius: 9999,
    backgroundColor: 'rgba(255, 255, 255, 0.78)',
    borderWidth: 0.5,
    borderColor: 'rgba(255, 255, 255, 0.8)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 24,
    elevation: 12,
    ...(Platform.OS === 'web'
      ? ({
          backdropFilter: 'blur(20px) saturate(180%)',
          WebkitBackdropFilter: 'blur(20px) saturate(180%)',
          boxShadow: '0 12px 32px -4px rgba(30, 19, 32, 0.12)',
        } as any)
      : {
          shadowColor: '#1E1320',
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: 0.12,
          shadowRadius: 24,
        }),
  },
  centerIconSquircle: {
    borderRadius: 14,
    padding: 6,
    backgroundColor: 'rgba(246, 243, 247, 0.85)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 0.5,
    borderColor: 'rgba(66, 20, 62, 0.08)',
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
    backgroundColor: 'rgba(246, 243, 247, 0.8)',
  },
});
