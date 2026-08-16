import React, { createContext, useContext, useState, useEffect } from 'react';
import { fetchUserNotifications, getSupabaseClient, UserNotification } from '@/services/supabase';
import { useAuth } from '@/context/AuthContext';

export interface NotificationItem {
  id: string;
  type: 'roadmap' | 'updates' | 'legal' | 'suppliers';
  title: string;
  desc: string;
  time: string;
  read: boolean;
  user_id?: string;
}

interface NotificationContextType {
  notifications: NotificationItem[];
  unreadCount: number;
  addNotification: (title: string, desc: string, type?: NotificationItem['type']) => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType>({
  notifications: [],
  unreadCount: 0,
  addNotification: async () => {},
  markAsRead: async () => {},
  markAllAsRead: async () => {},
});

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();

  const getFormattedTime = (createdAt?: string) => {
    if (!createdAt) return 'Just now';
    const elapsedMinutes = Math.max(0, Math.floor((Date.now() - new Date(createdAt).getTime()) / 60_000));
    if (elapsedMinutes < 1) return 'Just now';
    if (elapsedMinutes < 60) return `${elapsedMinutes} minute${elapsedMinutes === 1 ? '' : 's'} ago`;
    const elapsedHours = Math.floor(elapsedMinutes / 60);
    if (elapsedHours < 24) return `${elapsedHours} hour${elapsedHours === 1 ? '' : 's'} ago`;
    const elapsedDays = Math.floor(elapsedHours / 24);
    return `${elapsedDays} day${elapsedDays === 1 ? '' : 's'} ago`;
  };

  const toNotificationItem = (notification: UserNotification): NotificationItem => ({
    id: notification.id,
    type: (['roadmap', 'updates', 'legal', 'suppliers'].includes(notification.type)
      ? notification.type
      : 'updates') as NotificationItem['type'],
    title: notification.title,
    desc: notification.desc_text,
    time: getFormattedTime(notification.created_at),
    read: notification.read,
    user_id: notification.user_id,
  });

  const [notifications, setNotifications] = useState<NotificationItem[]>([]);

  // Real-time Supabase Database Channel Subscription
  useEffect(() => {
    const supabase = getSupabaseClient();
    if (!supabase || !user?.uid) {
      setNotifications([]);
      return;
    }

    let isMounted = true;
    void fetchUserNotifications(user.uid).then(({ data, error }) => {
      if (isMounted && !error && data) {
        setNotifications((data as UserNotification[]).map(toNotificationItem));
      }
    });

    // Subscribe to live Realtime Postgres Changes on notifications table
    const channel = supabase
      .channel('realtime_notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.uid}`,
        },
        (payload: any) => {
          const newNotif = payload.new;
          if (newNotif) {
            const formatted = toNotificationItem(newNotif as UserNotification);
            setNotifications((prev) => prev.some((item) => item.id === formatted.id) ? prev : [formatted, ...prev]);
          }
        }
      )
      .subscribe();

    return () => {
      isMounted = false;
      supabase.removeChannel(channel);
    };
  }, [user?.uid]);

  // Add Notification in Real-Time
  const addNotification = async (title: string, desc: string, type: NotificationItem['type'] = 'updates') => {
    if (!user?.uid) return;

    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('notifications')
      .insert({ user_id: user.uid, title, desc_text: desc, type, read: false })
      .select()
      .single();

    if (!error && data) {
      const notification = toNotificationItem(data as UserNotification);
      setNotifications((prev) => prev.some((item) => item.id === notification.id) ? prev : [notification, ...prev]);
    }
  };

  // Mark Individual Notification as Read in Real-Time
  const markAsRead = async (id: string) => {
    const supabase = getSupabaseClient();
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
    await supabase.from('notifications').update({ read: true }).eq('id', id);
  };

  // Mark All Notifications as Read in Real-Time
  const markAllAsRead = async () => {
    if (!user?.uid) return;
    const supabase = getSupabaseClient();
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    await supabase.from('notifications').update({ read: true }).eq('user_id', user.uid);
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        addNotification,
        markAsRead,
        markAllAsRead,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotification = () => useContext(NotificationContext);
