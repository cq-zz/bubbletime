import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { AlertTriangle, CheckCircle, CircleAlert, Info } from "lucide-react-native";
import { hexToRgba, radius, spacing, useTheme } from "../utils/theme";

const ICON_MAP = {
  error: { Icon: CircleAlert, colorKey: "accentRed" },
  success: { Icon: CheckCircle, colorKey: "accentGreen" },
  warning: { Icon: AlertTriangle, colorKey: "accentOrange" },
  tip: { Icon: Info, colorKey: "primary" },
  confirm: { Icon: AlertTriangle, colorKey: "accentRed" },
};

function resolveColor(colors, key) {
  if (key === "accentRed") return colors.accent?.red || "#EF4444";
  if (key === "accentGreen") return colors.accent?.green || "#22C55E";
  if (key === "accentOrange") return colors.accent?.orange || "#F59E0B";
  return colors.primary;
}

export default function AlertModal({ visible, onClose, title, message, type = "tip", buttons }) {
  const { colors, shadows } = useTheme();
  const { t } = useTranslation();

  const config = ICON_MAP[type] || ICON_MAP.tip;
  const IconComp = config.Icon;
  const accentColor = resolveColor(colors, config.colorKey);

  const resolvedButtons = useMemo(() => {
    if (buttons && buttons.length > 0) return buttons;
    return [{ text: t("common.confirm"), onPress: onClose }];
  }, [buttons, onClose, t]);

  const styles = useMemo(() => buildStyles(colors, shadows), [colors, shadows]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.content} onPress={() => {}}>
          <View style={[styles.iconWrap, { backgroundColor: hexToRgba(accentColor, 0.08) }]}>
            <IconComp size={28} color={accentColor} />
          </View>
          {title ? <Text style={styles.title}>{title}</Text> : null}
          {message ? <Text style={styles.message}>{message}</Text> : null}
          <View style={[styles.actions, resolvedButtons.length === 1 && styles.actionsSingle]}>
            {resolvedButtons.map((btn, i) => {
              const isPrimary = i === resolvedButtons.length - 1;
              const isCancel = btn.style === "cancel";
              return (
                <Pressable
                  key={i}
                  style={({ pressed }) => [
                    styles.btn,
                    resolvedButtons.length > 1 && styles.btnFlex,
                    isPrimary && !isCancel ? styles.btnPrimary : styles.btnSecondary,
                    isCancel && styles.btnCancel,
                    pressed && { opacity: 0.7 },
                  ]}
                  onPress={() => { btn.onPress?.(); onClose(); }}
                >
                  <Text
                    style={[
                      styles.btnText,
                      isPrimary && !isCancel && styles.btnTextPrimary,
                      isCancel && styles.btnTextCancel,
                    ]}
                  >
                    {btn.text}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function buildStyles(colors, shadows) {
  return StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: colors.modalOverlay,
      justifyContent: "center",
      alignItems: "center",
      paddingHorizontal: 32,
    },
    content: {
      width: "100%",
      maxWidth: 360,
      backgroundColor: colors.modalBg,
      borderRadius: radius.xl,
      borderCurve: "continuous",
      padding: 24,
      gap: 12,
      alignItems: "center",
      borderWidth: 1,
      borderColor: colors.border,
      ...shadows.xl,
    },
    iconWrap: {
      width: 56,
      height: 56,
      borderRadius: 28,
      alignItems: "center",
      justifyContent: "center",
    },
    title: {
      fontSize: 18,
      fontWeight: "700",
      color: colors.textPrimary,
      textAlign: "center",
    },
    message: {
      fontSize: 14,
      fontWeight: "400",
      color: colors.textSecondary,
      textAlign: "center",
      lineHeight: 22,
    },
    actions: {
      flexDirection: "row",
      gap: spacing.sm,
      width: "100%",
      marginTop: spacing.sm,
    },
    actionsSingle: {
      flexDirection: "column",
      gap: spacing.md,
    },
    btn: {
      width: "100%",
      height: 48,
      borderRadius: radius.md,
      borderCurve: "continuous",
      alignItems: "center",
      justifyContent: "center",
    },
    btnFlex: {
      flex: 1,
    },
    btnPrimary: {
      backgroundColor: colors.primary,
    },
    btnSecondary: {
      backgroundColor: colors.input.bg,
      borderWidth: 1,
      borderColor: colors.border,
    },
    btnCancel: {
      backgroundColor: "transparent",
      borderWidth: 0,
    },
    btnText: {
      fontSize: 16,
      fontWeight: "600",
      color: colors.textSecondary,
    },
    btnTextPrimary: {
      color: "#FFFFFF",
      fontWeight: "700",
    },
    btnTextCancel: {
      color: colors.textTertiary,
      fontWeight: "500",
    },
  });
}
