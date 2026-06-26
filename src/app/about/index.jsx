import Constants from "expo-constants";
import { Image } from "expo-image";
import { Stack } from "expo-router";
import { Heart } from "lucide-react-native";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import {
    ScrollView,
    StyleSheet,
    Text,
    View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { spacing, useTheme } from "../../utils/theme";

export default function AboutScreen() {
  const { t } = useTranslation();
  const { colors, typography } = useTheme();
  const insets = useSafeAreaInsets();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: { flex: 1, backgroundColor: colors.background },
        content: {
          padding: spacing.xxl,
          alignItems: "center",
          paddingBottom: 60,
        },
        logoImage: {
          width: 80,
          height: 80,
          marginBottom: spacing.lg,
        },
        appName: {
          fontSize: 24,
          fontWeight: "800",
          color: colors.textPrimary,
          marginBottom: spacing.xs,
        },
        appVersion: {
          fontSize: 14,
          color: colors.textTertiary,
          marginBottom: spacing.xxl,
        },
        description: {
          fontSize: 13,
          color: colors.textSecondary,
          textAlign: "left",
          lineHeight: 22,
          marginBottom: spacing.xxxl,
          paddingHorizontal: spacing.md,
        },
        footer: {
          fontSize: 12,
          color: colors.textTertiary,
          textAlign: "center",
          marginTop: spacing.xxl,
        },
      }),
    [colors, typography],
  );

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{ title: t("profile.about"), headerShown: true }}
      />
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Image
          source={require("../../../assets/images/system/logo.png")}
          style={styles.logoImage}
        />
        <Text style={styles.appName}>{t("home.brand")}</Text>
        <Text style={styles.appVersion}>Version {Constants.expoConfig?.version || "1.0.0"}</Text>
        <Text style={styles.description}>{t("about.description", { brand: t("home.brand") })}</Text>

        <Text style={styles.footer}>
          Built with <Heart size={12} color={colors.error.text} /> for a better
          life
        </Text>
      </ScrollView>
    </View>
  );
}
