import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity 
} from 'react-native';
import { useRouter } from 'expo-router';
import { 
  ArrowLeft, 
  CheckCheck, 
  Sparkles, 
  MapPin, 
  ShieldCheck, 
  Scale 
} from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { LikhoraColors, Radius, Spacing, LikhoraFont } from '@/constants/theme';
import { useNotification, NotificationItem } from '@/context/NotificationContext';

export default function NotificationsScreen() {
  const router = useRouter();
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotification();
  const [filter, setFilter] = useState<'all' | 'updates' | 'roadmap'>('all');

  const filteredNotifs = notifications.filter(n => {
    if (filter === 'all') return true;
    return n.type === filter;
  });

  const getIconConfig = (type: NotificationItem['type']) => {
    switch (type) {
      case 'roadmap':
        return { icon: MapPin, bg: LikhoraColors.secondaryLavender, color: LikhoraColors.primary };
      case 'legal':
        return { icon: Scale, bg: '#F0F9FF', color: '#0EA5E9' };
      case 'suppliers':
        return { icon: ShieldCheck, bg: '#FEF3C7', color: '#D97706' };
      default:
        return { icon: Sparkles, bg: '#ECFDF5', color: LikhoraColors.successGreen };
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        
        {/* Top Navigation Bar */}
        <View style={styles.topBar}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => {
              if (router.canGoBack()) router.back();
              else router.replace('/(tabs)');
            }}
            activeOpacity={0.7}
          >
            <ArrowLeft size={22} color={LikhoraColors.textPrimary} />
          </TouchableOpacity>

          <Text style={styles.headerTitle}>Notifications</Text>

          <TouchableOpacity 
            style={styles.markReadBtn} 
            onPress={markAllAsRead}
            activeOpacity={0.7}
          >
            <CheckCheck size={20} color={LikhoraColors.primary} />
          </TouchableOpacity>
        </View>

        {/* Filter Chips */}
        <View style={styles.filterRow}>
          {(['all', 'updates', 'roadmap'] as const).map((tab) => (
            <TouchableOpacity
              key={tab}
              style={[
                styles.chip,
                filter === tab && styles.chipActive,
              ]}
              onPress={() => setFilter(tab)}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.chipText,
                  filter === tab && styles.chipTextActive,
                ]}
              >
                {tab === 'all' ? `All (${notifications.length})` : tab.charAt(0).toUpperCase() + tab.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Notification List */}
        <ScrollView 
          contentContainerStyle={styles.scrollContent} 
          showsVerticalScrollIndicator={false}
        >
          {unreadCount > 0 && (
            <Text style={styles.sectionHeader}>NEW ({unreadCount})</Text>
          )}

          {filteredNotifs.map((item) => {
            const iconConfig = getIconConfig(item.type);
            const IconComp = iconConfig.icon;
            return (
              <TouchableOpacity
                key={item.id}
                style={[
                  styles.notifCard,
                  !item.read && styles.notifCardUnread,
                ]}
                onPress={() => markAsRead(item.id)}
                activeOpacity={0.8}
              >
                <View style={[styles.iconCircle, { backgroundColor: iconConfig.bg }]}>
                  <IconComp size={20} color={iconConfig.color} />
                </View>

                <View style={{ flex: 1 }}>
                  <View style={styles.cardTopRow}>
                    <Text style={styles.cardTitle}>{item.title}</Text>
                    {!item.read && <View style={styles.unreadDot} />}
                  </View>

                  <Text style={styles.cardDesc}>{item.desc}</Text>
                  <Text style={styles.cardTime}>{item.time}</Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: LikhoraColors.backgroundScreen,
  },
  container: {
    flex: 1,
    backgroundColor: LikhoraColors.backgroundScreen,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
    borderBottomWidth: 1,
    borderBottomColor: LikhoraColors.border,
  },
  backBtn: {
    padding: 6,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: LikhoraColors.textPrimary,
    fontFamily: LikhoraFont.fontFamily,
  },
  markReadBtn: {
    padding: 6,
  },
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
    gap: 8,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: Radius.pill,
    backgroundColor: LikhoraColors.inputBackground,
  },
  chipActive: {
    backgroundColor: LikhoraColors.primary,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '700',
    color: LikhoraColors.textSecondary,
    fontFamily: LikhoraFont.fontFamily,
  },
  chipTextActive: {
    color: '#FFFFFF',
  },
  scrollContent: {
    paddingHorizontal: Spacing.four,
    paddingBottom: Spacing.five,
  },
  sectionHeader: {
    fontSize: 12,
    fontWeight: '800',
    color: LikhoraColors.textSecondary,
    letterSpacing: 0.5,
    marginVertical: 10,
    fontFamily: LikhoraFont.fontFamily,
  },
  notifCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FFFFFF',
    borderRadius: Radius.large,
    padding: Spacing.three,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: LikhoraColors.border,
  },
  notifCardUnread: {
    backgroundColor: LikhoraColors.primarySoft,
    borderColor: LikhoraColors.softPurple,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: LikhoraColors.textPrimary,
    flex: 1,
    fontFamily: LikhoraFont.fontFamily,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: LikhoraColors.primary,
    marginLeft: 6,
  },
  cardDesc: {
    fontSize: 13,
    color: LikhoraColors.textSecondary,
    lineHeight: 18,
    marginBottom: 6,
    fontFamily: LikhoraFont.fontFamily,
  },
  cardTime: {
    fontSize: 11,
    color: LikhoraColors.textPlaceholder,
    fontFamily: LikhoraFont.fontFamily,
  },
});
