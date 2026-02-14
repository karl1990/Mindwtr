import { Ionicons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import { Pressable, StyleSheet } from 'react-native';

import { useLanguage } from '../../contexts/language-context';
import { useThemeColors } from '@/hooks/use-theme-colors';

export default function AppLayout() {
  const tc = useThemeColors();
  const router = useRouter();
  const { t } = useLanguage();

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: tc.cardBg },
        headerTintColor: tc.text,
        headerTitleAlign: 'center',
        headerShadowVisible: false,
        headerBackButtonDisplayMode: 'minimal',
      }}
    >
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="board" options={{ title: t('nav.board') }} />
      <Stack.Screen name="calendar" options={{ title: t('nav.calendar') }} />
      <Stack.Screen name="review" options={{ title: t('nav.review') }} />
      <Stack.Screen name="contexts" options={{ title: t('contexts.title') }} />
      <Stack.Screen name="waiting" options={{ title: t('waiting.title') }} />
      <Stack.Screen name="someday" options={{ title: t('someday.title') }} />
      <Stack.Screen name="reference" options={{ title: t('nav.reference') }} />
      <Stack.Screen name="done" options={{ title: t('nav.done') || t('list.done') || 'Done' }} />
      <Stack.Screen name="projects-screen" options={{ title: t('projects.title') }} />
      <Stack.Screen name="archived" options={{ title: t('archived.title') || 'Archived' }} />
      <Stack.Screen name="trash" options={{ title: t('trash.title') || 'Trash' }} />
      <Stack.Screen
        name="settings"
        options={{
          title: t('settings.title'),
          headerBackButtonMenuEnabled: false,
          headerBackVisible: false,
          headerLeft: () => (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Back"
              hitSlop={8}
              onPress={() => {
                if (router.canGoBack()) router.back();
              }}
              style={styles.plainBackButton}
            >
              <Ionicons color={tc.text} name="chevron-back" size={24} />
            </Pressable>
          ),
        }}
      />
      <Stack.Screen name="saved-search/[id]" options={{ title: t('search.title') }} />
    </Stack>
  );
}

const styles = StyleSheet.create({
  plainBackButton: {
    backgroundColor: 'transparent',
    marginLeft: 2,
    paddingHorizontal: 2,
    paddingVertical: 2,
  },
});
