import '../polyfills';
import { DarkTheme, DefaultTheme, ThemeProvider as NavigationThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { ThemeProvider, useTheme } from '../contexts/theme-context';
import { LanguageProvider, useLanguage } from '../contexts/language-context';
import { setStorageAdapter, useTaskStore } from '@focus-gtd/core';
import { mobileStorage } from '../lib/storage-adapter';

// Initialize storage for mobile
try {
  setStorageAdapter(mobileStorage);
} catch (e) {
  console.error('[Mobile] Failed to initialize storage adapter:', e);
}

function RootLayoutContent() {
  const { colorScheme, isDark } = useTheme();

  useEffect(() => {
    // Load data from storage
    const loadData = async () => {
      try {
        const store = useTaskStore.getState();
        await store.fetchData();
      } catch (e) {
        console.error('[Mobile] Failed to load data:', e);
      } finally {
        // Hide splash screen (safe for web)
        if (typeof SplashScreen?.hideAsync === 'function') {
          SplashScreen.hideAsync().catch(console.warn);
        }
      }
    };

    loadData();
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <NavigationThemeProvider value={isDark ? DarkTheme : DefaultTheme}>
        <Stack>
          <Stack.Screen name="(drawer)" options={{ headerShown: false }} />
          <Stack.Screen
            name="global-search"
            options={{
              headerShown: false,
              presentation: 'modal',
              animation: 'slide_from_bottom'
            }}
          />
          <Stack.Screen
            name="check-focus"
            options={{
              headerShown: false,
            }}
          />
        </Stack>
        <StatusBar style="auto" />
      </NavigationThemeProvider>
    </GestureHandlerRootView>
  );
}

export default function RootLayout() {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <RootLayoutContent />
      </LanguageProvider>
    </ThemeProvider>
  );
}
