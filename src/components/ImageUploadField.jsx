import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { Camera, FolderOpen, ImagePlus, X } from "lucide-react-native";
import { useMemo, useState } from "react";
import {
  Linking,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useTranslation } from "react-i18next";
import { useTheme, radius, spacing } from "../utils/theme";
import { validateImage } from "../utils/image";
import useAlert from "../hooks/useAlert";

/**
 * 通用图片上传组件
 * 支持 Android / iOS / Web
 * - 拍照上传（需相机权限）
 * - 从相册选择（需文件访问权限）
 *
 * Props:
 * - value: string  — 当前图片 URI
 * - onChange: (uri: string) => void  — 图片变更回调（清空时传 ""）
 * - placeholder?: string  — 占位文字
 * - hint?: string  — 提示文字
 * - aspectRatio?: number  — 宽高比，如 4/3；不传则使用固定高度
 * - height?: number  — 固定高度（aspectRatio 不传时生效，默认 160）
 * - disabled?: boolean  — 是否禁用
 */
export default function ImageUploadField({
  value,
  onChange,
  placeholder,
  hint,
  aspectRatio,
  height = 160,
  disabled = false,
}) {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const { alert } = useAlert();
  const styles = useMemo(() => buildStyles(colors), [colors]);
  const [picking, setPicking] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const hasImage = Boolean(value);
  const isNative = Platform.OS === "ios" || Platform.OS === "android";
  const finalHint = hint ?? t("common.imageHint");

  // ── 权限请求 ──
  const requestCameraPermission = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      showPermissionDenied(
        t("common.cameraPermission"),
        t("common.cameraPermissionDesc"),
      );
      return false;
    }
    return true;
  };

  const requestLibraryPermission = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      showPermissionDenied(
        t("common.libraryPermission"),
        t("common.libraryPermissionDesc"),
      );
      return false;
    }
    return true;
  };

  const showPermissionDenied = (title, message) => {
    if (Platform.OS === "web") {
      window.alert(`${title}：${message}`);
      return;
    }
    alert(title, message, [
      { text: t("common.cancel") },
      {
        text: t("common.goToSettings"),
        onPress: () => Linking.openSettings(),
      },
    ]);
  };

  // ── 校验并处理结果 ──
  const processResult = (result) => {
    if (result.canceled || !result.assets || result.assets.length === 0) {
      return;
    }
    const asset = result.assets[0];
    const error = validateImage({
      type: asset.mimeType || asset.type || "",
      fileSize: asset.fileSize ?? 0,
    });
    if (error) {
      if (Platform.OS === "web") {
        window.alert(t(error));
      } else {
        alert(t("common.uploadFailed"), t(error));
      }
      return;
    }
    onChange(asset.uri);
  };

  // ── 拍照 ──
  const handleCamera = async () => {
    setSheetOpen(false);
    if (disabled || picking) return;
    setPicking(true);
    try {
      if (isNative && !(await requestCameraPermission())) return;
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ["images"],
        allowsEditing: false,
        quality: 0.85,
        exif: false,
      });
      processResult(result);
    } catch (e) {
      const msg = e?.message || t("common.cameraFailed");
      if (Platform.OS === "web") {
        window.alert(msg);
      } else {
        alert(t("common.error"), msg);
      }
    } finally {
      setPicking(false);
    }
  };

  // ── 从相册选择 ──
  const handleLibrary = async () => {
    setSheetOpen(false);
    if (disabled || picking) return;
    setPicking(true);
    try {
      if (isNative && !(await requestLibraryPermission())) return;
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: false,
        quality: 0.85,
        exif: false,
      });
      processResult(result);
    } catch (e) {
      const msg = e?.message || t("common.libraryFailed");
      if (Platform.OS === "web") {
        window.alert(msg);
      } else {
        alert(t("common.error"), msg);
      }
    } finally {
      setPicking(false);
    }
  };

  // ── 移除图片 ──
  const handleRemove = (e) => {
    e?.stopPropagation?.();
    onChange("");
  };

  // ── 点击上传区域 ──
  const handlePress = () => {
    if (disabled || picking) return;
    if (isNative) {
      setSheetOpen(true);
    } else {
      // Web: 直接选择文件（Web 不支持相机）
      handleLibrary();
    }
  };

  const containerStyle = [
    styles.container,
    aspectRatio ? { aspectRatio } : { height },
    hasImage && styles.containerHasImage,
    disabled && styles.containerDisabled,
  ];

  return (
    <>
      <Pressable
        style={containerStyle}
        onPress={handlePress}
        disabled={disabled || picking}
      >
        {hasImage ? (
          <>
            <Image
              source={{ uri: value }}
              style={styles.image}
              contentFit="contain"
            />
            {!disabled && (
              <Pressable
                style={({ pressed }) => [
                  styles.removeBtn,
                  pressed && styles.removeBtnPressed,
                ]}
                onPress={handleRemove}
                hitSlop={8}
              >
                <X size={14} color="#FFFFFF" />
              </Pressable>
            )}
          </>
        ) : (
          <View style={styles.placeholder}>
            <View style={styles.iconWrap}>
              <ImagePlus size={24} color={colors.textSecondary} />
            </View>
            <Text style={styles.placeholderText}>{placeholder || t("common.imageHint")}</Text>
            <Text style={styles.hintText}>{finalHint}</Text>
          </View>
        )}
      </Pressable>

      {/* Action Sheet — 仅原生端 */}
      {isNative && (
        <Modal
          visible={sheetOpen}
          transparent
          animationType="fade"
          onRequestClose={() => setSheetOpen(false)}
        >
          <View style={styles.sheetOverlay}>
            <Pressable
              style={StyleSheet.absoluteFill}
              onPress={() => setSheetOpen(false)}
            />
            <View style={styles.sheet}>
              <Text style={styles.sheetTitle}>{t("common.selectImageSource")}</Text>
              <View style={styles.sheetActions}>
                <Pressable
                  style={({ pressed }) => [
                    styles.sheetBtn,
                    pressed && styles.sheetBtnPressed,
                  ]}
                  onPress={handleCamera}
                >
                  <View style={[styles.sheetIconWrap, styles.sheetIconCamera]}>
                    <Camera size={20} color={colors.primary} />
                  </View>
                  <Text style={styles.sheetBtnText}>{t("common.takePhoto")}</Text>
                </Pressable>
                <Pressable
                  style={({ pressed }) => [
                    styles.sheetBtn,
                    pressed && styles.sheetBtnPressed,
                  ]}
                  onPress={handleLibrary}
                >
                  <View style={[styles.sheetIconWrap, styles.sheetIconLibrary]}>
                    <FolderOpen size={20} color={colors.accent.green} />
                  </View>
                  <Text style={styles.sheetBtnText}>{t("common.chooseFromLibrary")}</Text>
                </Pressable>
              </View>
              <Pressable
                style={({ pressed }) => [
                  styles.sheetCancelBtn,
                  pressed && styles.sheetCancelBtnPressed,
                ]}
                onPress={() => setSheetOpen(false)}
              >
                <Text style={styles.sheetCancelText}>{t("common.cancel")}</Text>
              </Pressable>
            </View>
          </View>
        </Modal>
      )}
    </>
  );
}

function buildStyles(colors) {
  return StyleSheet.create({
  container: {
    width: "100%",
    borderRadius: radius.lg,
    borderCurve: "continuous",
    borderWidth: 2,
    borderColor: colors.border,
    borderStyle: "dashed",
    backgroundColor: colors.surfaceFrost,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  containerHasImage: {
    borderStyle: "solid",
    borderColor: colors.primary,
  },
  containerDisabled: {
    opacity: 0.5,
  },
  image: {
    ...StyleSheet.absoluteFillObject,
    width: "100%",
    height: "100%",
  },
  removeBtn: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10,
  },
  removeBtnPressed: {
    opacity: 0.7,
  },
  placeholder: {
    alignItems: "center",
    gap: spacing.sm,
  },
  iconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primaryBg,
    alignItems: "center",
    justifyContent: "center",
  },
  placeholderText: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: "600",
    letterSpacing: 0.3,
    lineHeight: 18,
  },
  hintText: {
    color: colors.textTertiary,
    fontSize: 11,
    lineHeight: 16,
  },
  // ── Action Sheet ──
  sheetOverlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: colors.modalOverlay,
    zIndex: 99999,
  },
  sheet: {
    backgroundColor: colors.modalBg,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderCurve: "continuous",
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: Platform.OS === "ios" ? 34 : 20,
    ...Platform.select({
      ios: {
        shadowColor: "#A677B6",
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.15,
        shadowRadius: 24,
      },
      android: { elevation: 16 },
    }),
  },
  sheetTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.textTertiary,
    textAlign: "center",
    marginBottom: 16,
    letterSpacing: 0.5,
  },
  sheetActions: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 16,
  },
  sheetBtn: {
    flex: 1,
    alignItems: "center",
    gap: 10,
    paddingVertical: 20,
    borderRadius: radius.lg,
    borderCurve: "continuous",
    backgroundColor: colors.surfaceFrost,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sheetBtnPressed: {
    opacity: 0.75,
  },
  sheetIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
  },
  sheetIconCamera: {
    backgroundColor: colors.primaryBgMedium,
  },
  sheetIconLibrary: {
    backgroundColor: "rgba(107, 203, 158, 0.15)",
  },
  sheetBtnText: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.textPrimary,
  },
  sheetCancelBtn: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceFrost,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sheetCancelBtnPressed: {
    opacity: 0.7,
  },
  sheetCancelText: {
    fontSize: 15,
    fontWeight: "600",
    color: colors.textTertiary,
  },
  });
}
