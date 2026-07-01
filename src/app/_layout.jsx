import { Stack } from "expo-router";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { StatusBar } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { loadSavedLanguage } from "../i18n";
import { ThemeProvider, useTheme } from "../utils/theme";
import { AlertProvider } from "../hooks/useAlert";

function AppContent() {
  const { colors } = useTheme();
  const { t } = useTranslation();

  return (
    <>
      <StatusBar
        barStyle={colors.statusBar}
        backgroundColor={colors.background}
        translucent
      />
      <Stack
        screenOptions={{
          headerShown: true,
          headerTitleAlign: "center",
          headerStyle: {
            backgroundColor: colors.background,
          },
          headerShadowVisible: false,
          headerTintColor: colors.textPrimary,
          headerTitleStyle: {
            color: colors.textPrimary,
            fontSize: 17,
            fontWeight: "700",
          },
          contentStyle: {
            backgroundColor: colors.background,
          },
          animation: "slide_from_right",
        }}
      >
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="settings" options={{ headerShown: false }} />
        <Stack.Screen name="about" options={{ title: t("profile.about") }} />
        <Stack.Screen name="bills" options={{ title: t("nav.bills") }} />
        <Stack.Screen name="durable" options={{ title: t("nav.durable") }} />
        <Stack.Screen name="important-date" options={{ title: t("nav.importantDate") }} />
        <Stack.Screen name="reminder" options={{ title: t("nav.reminder") }} />
        <Stack.Screen name="schedule" options={{ title: t("nav.schedule") }} />
        <Stack.Screen name="diary" options={{ title: t("nav.diary") }} />
        <Stack.Screen name="bubble-time-game" options={{ headerShown: false }} />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  const [i18nReady, setI18nReady] = useState(false);

  useEffect(() => {
    loadSavedLanguage().finally(() => setI18nReady(true));
  }, []);

  if (!i18nReady) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider>
          <AlertProvider>
            <AppContent />
          </AlertProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
