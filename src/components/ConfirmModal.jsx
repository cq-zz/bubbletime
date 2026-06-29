import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { Trash2 } from "lucide-react-native";
import { hexToRgba, radius, spacing, useTheme } from "../utils/theme";

export default function ConfirmModal({
  visible,
  onClose,
  onConfirm,
  title,
  description,
  confirmText,
  cancelText,
  icon: Icon,
}) {
  const { colors, shadows } = useTheme();
  const { t } = useTranslation();
  const [confirming, setConfirming] = useState(false);

  const handleConfirm = useCallback(async () => {
    if (confirming) return;
    setConfirming(true);
    try {
      await onConfirm();
    } finally {
      setConfirming(false);
    }
  }, [confirming, onConfirm]);

  const styles = buildStyles(colors, shadows);
  const IconComponent = Icon || Trash2;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.content} onPress={() => {}}>
          <View style={styles.iconWrap}>
            <IconComponent size={28} color={colors.accent.red} />
          </View>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.description}>{description}</Text>
          <View style={styles.actions}>
            <Pressable
              style={({ pressed }) => [
                styles.cancelBtn,
                pressed && { opacity: 0.7 },
              ]}
              onPress={onClose}
            >
              <Text style={styles.cancelText}>
                {cancelText || t("common.cancel")}
              </Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [
                styles.confirmBtn,
                pressed && { opacity: 0.85 },
                confirming && styles.confirmBtnDisabled,
              ]}
              onPress={handleConfirm}
              disabled={confirming}
            >
              <Text style={styles.confirmText}>
                {confirming
                  ? t("common.saving")
                  : confirmText || t("common.delete")}
              </Text>
            </Pressable>
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
      backgroundColor: hexToRgba(colors.accent.red, 0.08),
      alignItems: "center",
      justifyContent: "center",
    },
    title: {
      fontSize: 18,
      fontWeight: "700",
      color: colors.textPrimary,
      textAlign: "center",
    },
    description: {
      fontSize: 14,
      fontWeight: "400",
      color: colors.textSecondary,
      textAlign: "center",
      lineHeight: 22,
    },
    actions: {
      flexDirection: "row",
      gap: spacing.md,
      width: "100%",
      marginTop: spacing.sm,
    },
    cancelBtn: {
      flex: 1,
      height: 56,
      borderRadius: radius.md,
      borderCurve: "continuous",
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.input.bg,
      borderWidth: 1,
      borderColor: colors.border,
    },
    cancelText: {
      fontSize: 16,
      fontWeight: "500",
      color: colors.textSecondary,
    },
    confirmBtn: {
      flex: 1,
      height: 56,
      borderRadius: radius.md,
      borderCurve: "continuous",
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.accent.red,
    },
    confirmBtnDisabled: {
      opacity: 0.6,
    },
    confirmText: {
      fontSize: 17,
      fontWeight: "700",
      color: "#FFFFFF",
    },
  });
}
