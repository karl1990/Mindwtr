import { Tabs } from 'expo-router';
import { Platform, StyleSheet, Text } from 'react-native';

import { HapticTab } from '@/components/haptic-tab';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useTheme } from '../../../contexts/theme-context';
import { useLanguage } from '../../../contexts/language-context';

export default function TabLayout() {
  const { isDark } = useTheme();
  const { t } = useLanguage();

  const activeTint = isDark ? '#93C5FD' : '#2563EB';
  const inactiveTint = isDark ? '#6B7280' : '#9CA3AF';
  const activeItemBg = isDark ? 'rgba(59, 130, 246, 0.18)' : 'rgba(37, 99, 235, 0.12)';

  return (
    <Tabs
      initialRouteName="inbox"
      screenOptions={{
        tabBarActiveTintColor: activeTint,
        tabBarInactiveTintColor: inactiveTint,
        tabBarActiveBackgroundColor: activeItemBg,
        tabBarInactiveBackgroundColor: 'transparent',
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
        },
        tabBarItemStyle: {
          borderRadius: 14,
          marginHorizontal: 10,
          marginVertical: 6,
        },
        tabBarStyle: {
          backgroundColor: isDark ? '#1F2937' : '#FFFFFF',
          borderTopColor: isDark ? '#374151' : '#E5E7EB',
          paddingTop: 6,
          height: 58,
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
          tabBarLabel: ({ focused, color }) => (
            <Text style={[styles.tabLabel, { color, fontWeight: focused ? '700' : '600' }]}>{t('tab.inbox')}</Text>
          ),
          tabBarIcon: ({ color, focused }) => (
            <IconSymbol size={focused ? 28 : 24} name="tray.fill" color={color} style={{ opacity: focused ? 1 : 0.65 }} />
          ),
        }}
      />
      <Tabs.Screen
        name="next"
        options={{
          title: t('tab.next'),
          tabBarLabel: ({ focused, color }) => (
            <Text style={[styles.tabLabel, { color, fontWeight: focused ? '700' : '600' }]}>{t('tab.next')}</Text>
          ),
          tabBarIcon: ({ color, focused }) => (
            <IconSymbol size={focused ? 28 : 24} name="arrow.right.circle.fill" color={color} style={{ opacity: focused ? 1 : 0.65 }} />
          ),
        }}
      />
      <Tabs.Screen
        name="board"
        options={{
          title: t('tab.board'),
          tabBarLabel: ({ focused, color }) => (
            <Text style={[styles.tabLabel, { color, fontWeight: focused ? '700' : '600' }]}>{t('tab.board')}</Text>
          ),
          tabBarIcon: ({ color, focused }) => (
            <IconSymbol size={focused ? 28 : 24} name="square.grid.2x2.fill" color={color} style={{ opacity: focused ? 1 : 0.65 }} />
          ),
        }}
      />
      <Tabs.Screen
        name="review"
        options={{
          title: t('tab.review'),
          tabBarLabel: ({ focused, color }) => (
            <Text style={[styles.tabLabel, { color, fontWeight: focused ? '700' : '600' }]}>{t('tab.review')}</Text>
          ),
          tabBarIcon: ({ color, focused }) => (
            <IconSymbol size={focused ? 28 : 24} name="paperplane.fill" color={color} style={{ opacity: focused ? 1 : 0.65 }} />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabLabel: {
    fontSize: 11,
  },
});
