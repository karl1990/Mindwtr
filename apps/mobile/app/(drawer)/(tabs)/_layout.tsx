import { Tabs } from 'expo-router';
import React from 'react';
import { Platform } from 'react-native';

import { HapticTab } from '@/components/haptic-tab';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useTheme } from '../../../contexts/theme-context';
import { useLanguage } from '../../../contexts/language-context';

export default function TabLayout() {
  const { isDark } = useTheme();
  const { t } = useLanguage();

  return (
    <Tabs
      initialRouteName="inbox"
      screenOptions={{
        tabBarActiveTintColor: '#2563EB',
        tabBarInactiveTintColor: isDark ? '#6B7280' : '#9CA3AF',
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
        },
        tabBarStyle: {
          backgroundColor: isDark ? '#1F2937' : '#FFFFFF',
          borderTopColor: isDark ? '#374151' : '#E5E7EB',
          paddingTop: 4,
          height: 60,
          ...Platform.select({
            ios: {
              position: 'absolute',
            },
            default: {},
          }),
        },
      }}>
      <Tabs.Screen
        name="inbox"
        options={{
          title: t('tab.inbox'),
          tabBarIcon: ({ color, focused }) => <IconSymbol size={focused ? 30 : 26} name="tray.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="next"
        options={{
          title: t('tab.next'),
          tabBarIcon: ({ color, focused }) => <IconSymbol size={focused ? 30 : 26} name="arrow.right.circle.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="agenda"
        options={{
          title: t('tab.agenda'),
          tabBarIcon: ({ color, focused }) => <IconSymbol size={focused ? 30 : 26} name="calendar" color={color} />,
        }}
      />
      <Tabs.Screen
        name="review"
        options={{
          title: t('tab.review'),
          tabBarIcon: ({ color, focused }) => <IconSymbol size={focused ? 30 : 26} name="paperplane.fill" color={color} />,
        }}
      />

    </Tabs>
  );
}

