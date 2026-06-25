import { Image } from "expo-image";
import { Stack } from "expo-router";
import { Globe, Heart, Mail } from "lucide-react-native";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import {
    Linking,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { hexToRgba, radius, spacing, useTheme } from "../../utils/theme";

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
          marginTop: spacing.xl,
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
          fontSize: 14,
          color: colors.textSecondary,
          textAlign: "center",
          lineHeight: 22,
          marginBottom: spacing.xxxl,
        },
        linkCard: {
          flexDirection: "row",
          alignItems: "center",
          backgroundColor: colors.surface,
          borderRadius: radius.lg,
          paddingVertical: spacing.lg,
          paddingHorizontal: spacing.xl,
          marginBottom: spacing.md,
          width: "100%",
        },
        linkIcon: {
          width: 36,
          height: 36,
          borderRadius: 10,
          alignItems: "center",
          justifyContent: "center",
          marginRight: spacing.md,
        },
        linkText: {
          flex: 1,
          fontSize: 15,
          fontWeight: "500",
          color: colors.textPrimary,
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
    <View style={[styles.container, { paddingTop: insets.top }]}>
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
        <Text style={styles.appName}>BubbleTime</Text>
        <Text style={styles.appVersion}>Version 1.0.0</Text>
        <Text style={styles.description}>{t("about.description")}</Text>

        <Pressable
          onPress={() => Linking.openURL("mailto:hello@bubbletime.app")}
          style={({ pressed }) => [
            styles.linkCard,
            pressed && { opacity: 0.6 },
          ]}
        >
          <View
            style={[
              styles.linkIcon,
              { backgroundColor: hexToRgba(colors.primary, 0.1) },
            ]}
          >
            <Mail size={18} color={colors.primary} />
          </View>
          <Text style={styles.linkText}>hello@bubbletime.app</Text>
        </Pressable>

        <Pressable
          onPress={() => Linking.openURL("https://bubbletime.app")}
          style={({ pressed }) => [
            styles.linkCard,
            pressed && { opacity: 0.6 },
          ]}
        >
          <View
            style={[
              styles.linkIcon,
              { backgroundColor: hexToRgba(colors.primary, 0.1) },
            ]}
          >
            <Globe size={18} color={colors.primary} />
          </View>
          <Text style={styles.linkText}>bubbletime.app</Text>
        </Pressable>

        <Text style={styles.footer}>
          Built with <Heart size={12} color={colors.error.text} /> for a better
          life
        </Text>
      </ScrollView>
    </View>
  );
}
