import AsyncStorage from "@react-native-async-storage/async-storage";
import * as ImagePicker from "expo-image-picker";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useNavigation, useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  CalendarCheck,
  Camera,
  ChevronRight,
  Database,
  FolderOpen,
  Moon,
  Palette,
  Pencil,
  Settings,
  Sparkles,
  Sun,
  User,
  Smile,
} from "lucide-react-native";
import { setLanguage } from "../../i18n";
import useAlert from "../../hooks/useAlert";
import { hexToRgba, radius, spacing, useTheme } from "../../utils/theme";
import { DEFAULT_CURRENCY, DEFAULT_LANGUAGE, STORAGE_KEYS } from "../../utils/constant";
import DataManagementCard from "../../components/DataManagementCard";
import MoodCalendarModal from "../../components/MoodCalendarModal";
import { on } from "../../utils/events";

export default function ProfileScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { colors, shadows, themeMode, setThemeMode } = useTheme();
  const { alert } = useAlert();

  const [nickname, setNickname] = useState("");
  const [avatar, setAvatar] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editNickname, setEditNickname] = useState("");
  const [editAvatar, setEditAvatar] = useState(null);
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);

  const saveSettings = useCallback(async (key, value) => {
    try {
      await AsyncStorage.setItem(key, value);
    } catch (e) {
      console.error("Save failed:", e);
    }
  }, []);

  const loadProfile = useCallback(async () => {
    try {
      const [savedNickname, savedAvatar] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEYS.nickname),
        AsyncStorage.getItem(STORAGE_KEYS.avatar),
      ]);
      if (savedNickname) setNickname(savedNickname);
      if (savedAvatar) setAvatar(savedAvatar);
    } catch {}
  }, []);

  useEffect(() => { loadProfile(); }, [loadProfile]);

  useEffect(() => {
    const unsubscribe = navigation.addListener("focus", loadProfile);
    return unsubscribe;
  }, [navigation, loadProfile]);

  useEffect(() => {
    const unsub = on("dataReset", () => {
      setNickname("");
      setAvatar(null);
    });
    return unsub;
  }, []);

  const openEditModal = () => {
    setEditNickname(nickname || t("common.newUser"));
    setEditAvatar(avatar);
    setShowEditModal(true);
  };

  const pickFromCamera = async () => {
    setShowAvatarPicker(false);
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(t("settings.cameraPermission"), t("settings.cameraPermissionMsg"));
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) setEditAvatar(result.assets[0].uri);
  };

  const pickFromAlbum = async () => {
    setShowAvatarPicker(false);
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(t("settings.albumPermission"), t("settings.albumPermissionMsg"));
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) setEditAvatar(result.assets[0].uri);
  };

  const handleEditAvatar = () => {
    if (Platform.OS === "web") {
      pickFromAlbum();
    } else {
      setShowAvatarPicker(true);
    }
  };

  const saveEditProfile = async () => {
    const trimmed = editNickname.trim();
    if (trimmed) {
      setNickname(trimmed);
      await saveSettings(STORAGE_KEYS.nickname, trimmed);
    }
    if (editAvatar) {
      setAvatar(editAvatar);
      await saveSettings(STORAGE_KEYS.avatar, editAvatar);
    }
    setShowEditModal(false);
  };

  const styles = useMemo(() => buildStyles(colors, shadows), [colors, shadows]);

  const CardItem = ({
    icon: Icon,
    iconBg,
    label,
    rightText,
    onPress,
    isLast,
    numberOfLines,
  }) => (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.cardItem,
        pressed && styles.cardItemPressed,
        isLast && styles.cardItemLast,
      ]}
    >
      <View style={styles.cardItemLeft}>
        <View
          style={[
            styles.cardItemIcon,
            { backgroundColor: iconBg || hexToRgba(colors.primary, 0.12) },
          ]}
        >
          <Icon size={18} color={colors.primary} />
        </View>
        <Text style={styles.cardItemLabel} numberOfLines={numberOfLines}>
          {label}
        </Text>
      </View>
      <View style={styles.cardItemRight}>
        {rightText ? (
          <Text style={styles.cardItemRightText}>{rightText}</Text>
        ) : null}
        {onPress ? (
          <ChevronRight size={16} color={colors.textTertiary} />
        ) : null}
      </View>
    </Pressable>
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <LinearGradient
        colors={
          colors.background === "#0B0B1A"
            ? ["#14102A", "#0B0B1A"]
            : colors.background === "#FFF0F6"
              ? ["#FFE8F2", "#FFF0F6"]
              : ["#EDE7F5", "#F5F2F9"]
        }
        style={StyleSheet.absoluteFill}
      />
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + 60 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.profileHeader}>
          <Pressable
            onPress={openEditModal}
            style={({ pressed }) => [
              styles.avatarWrap,
              pressed && { opacity: 0.7 },
            ]}
          >
            {avatar ? (
              <Image
                source={{ uri: avatar }}
                style={styles.avatarImage}
                contentFit="contain"
              />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <User size={36} color={colors.textTertiary} />
              </View>
            )}
          </Pressable>
          <Pressable onPress={openEditModal}>
            <Text style={styles.nicknameText}>
              {nickname || t("common.newUser")}
            </Text>
          </Pressable>
        </View>

        <View style={styles.cardGroup}>
          <View style={styles.cardHeader}>
            <View style={styles.cardHeaderRow}>
              <View
                style={[
                  styles.cardItemIcon,
                  { backgroundColor: hexToRgba(colors.primary, 0.12) },
                ]}
              >
                <User size={18} color={colors.primary} />
              </View>
              <Text style={styles.groupLabel}>{t("profile.personalInfo")}</Text>
            </View>
            <Text style={styles.groupDesc}>
              {t("profile.personalInfoDesc")}
            </Text>
          </View>
          <View style={styles.cardList}>
            <CardItem
              icon={Camera}
              iconBg={hexToRgba(colors.primary, 0.12)}
              label={t("settings.avatar")}
              onPress={openEditModal}
            />
            <CardItem
              icon={User}
              iconBg={hexToRgba(colors.primary, 0.12)}
              label={t("settings.nickname")}
              onPress={openEditModal}
              isLast
            />
          </View>
        </View>

        {/* 应用设置 */}
        <View style={styles.cardGroup}>
          <View style={styles.cardHeader}>
            <View style={styles.cardHeaderRow}>
              <View
                style={[
                  styles.cardItemIcon,
                  { backgroundColor: hexToRgba("#F0B866", 0.12) },
                ]}
              >
                <Settings size={18} color="#F0B866" />
              </View>
              <Text style={styles.groupLabel}>{t("profile.appSettings")}</Text>
            </View>
            <Text style={styles.groupDesc}>{t("profile.appSettingsDesc")}</Text>
          </View>
          <View style={styles.cardList}>
            <CardItem
              icon={Settings}
              iconBg={hexToRgba("#F0B866", 0.12)}
              label={t("profile.settings")}
              onPress={() => router.push("/settings")}
            />
            {/* 外观 */}
            <View style={styles.appearanceSection}>
              <View style={[styles.cardItem, styles.cardItemNoBorder]}>
                <View style={styles.cardItemLeft}>
                  <View style={[styles.cardItemIcon, { backgroundColor: hexToRgba(colors.primary, 0.12) }]}>
                    <Palette size={18} color={colors.primary} />
                  </View>
                  <Text style={styles.cardItemLabel}>{t("settings.appearance")}</Text>
                </View>
              </View>
              <View style={styles.themePickerRow}>
                {[
                  { key: "light", icon: Sun, label: t("settings.lightMode"), color: "#F0B866" },
                  { key: "dark", icon: Moon, label: t("settings.darkMode"), color: "#9B8FD4" },
                  { key: "candy", icon: Sparkles, label: t("settings.candyMode"), color: "#FF7EB3" },
                ].map((opt) => {
                  const isActive = themeMode === opt.key;
                  const IconComp = opt.icon;
                  return (
                    <Pressable
                      key={opt.key}
                      style={({ pressed }) => [
                        styles.themePickerItem,
                        isActive && styles.themePickerItemActive,
                        isActive && { borderColor: opt.color, backgroundColor: hexToRgba(opt.color, 0.08) },
                        pressed && { opacity: 0.7 },
                      ]}
                      onPress={() => setThemeMode(opt.key)}
                    >
                      <View
                        style={[
                          styles.themePickerIcon,
                          { backgroundColor: hexToRgba(opt.color, isActive ? 0.18 : 0.10) },
                        ]}
                      >
                        <IconComp size={20} color={isActive ? opt.color : colors.textTertiary} />
                      </View>
                      <Text
                        style={[
                          styles.themePickerLabel,
                          isActive && { color: opt.color, fontWeight: "700" },
                        ]}
                      >
                        {opt.label}
                      </Text>
                      {isActive && (
                        <View style={[styles.themePickerDot, { backgroundColor: opt.color }]} />
                      )}
                    </Pressable>
                  );
                })}
              </View>
            </View>
          </View>
        </View>

        {/* 个人记录 */}
        <View style={styles.cardGroup}>
          <View style={styles.cardHeader}>
            <View style={styles.cardHeaderRow}>
              <View
                style={[
                  styles.cardItemIcon,
                  { backgroundColor: hexToRgba(colors.primary, 0.12) },
                ]}
              >
                <CalendarCheck size={18} color={colors.primary} />
              </View>
              <Text style={styles.groupLabel}>{t("checkIn.personalRecords")}</Text>
            </View>
            <Text style={styles.groupDesc}>{t("checkIn.personalRecordsDesc")}</Text>
          </View>
          <View style={styles.cardList}>
            <MoodCalendarModal renderTrigger={({ open }) => (
              <CardItem
                icon={CalendarCheck}
                iconBg={hexToRgba(colors.primary, 0.12)}
                label={t("checkIn.records")}
                onPress={open}
              />
            )} />
          </View>
        </View>

        {/* 数据管理 */}
        <View style={styles.cardGroup}>
          <View style={styles.cardHeader}>
            <View style={styles.cardHeaderRow}>
              <View
                style={[
                  styles.cardItemIcon,
                  { backgroundColor: hexToRgba(colors.primary, 0.12) },
                ]}
              >
                <Database size={18} color={colors.primary} />
              </View>
              <Text style={styles.groupLabel}>{t("settings.dataManagement")}</Text>
            </View>
            <Text style={styles.groupDesc}>{t("settings.dataManagementDesc")}</Text>
          </View>
          <View style={styles.cardList}>
            <DataManagementCard />
          </View>
        </View>

        {/* 其他 */}
        <View style={styles.cardGroup}>
          <View style={styles.cardHeader}>
            <View style={styles.cardHeaderRow}>
              <View
                style={[
                  styles.cardItemIcon,
                  { backgroundColor: hexToRgba("#8AB8A0", 0.12) },
                ]}
              >
                <Pencil size={18} color="#8AB8A0" />
              </View>
              <Text style={styles.groupLabel}>{t("profile.other")}</Text>
            </View>
            <Text style={styles.groupDesc}>{t("profile.otherDesc")}</Text>
          </View>
          <View style={styles.cardList}>
            <CardItem
              icon={Pencil}
              iconBg={hexToRgba("#8AB8A0", 0.12)}
              label={t("profile.about")}
              onPress={() => router.push("/about")}
              isLast
            />
          </View>
        </View>
      </ScrollView>

      <Modal
        visible={showEditModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowEditModal(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setShowEditModal(false)}
        >
          <Pressable style={styles.modalContent} onPress={() => {}}>
            <Text style={styles.modalTitle}>{t("profile.editProfile")}</Text>
            <Text style={styles.modalSectionLabel}>{t("settings.avatar")}</Text>
            <Pressable
              onPress={handleEditAvatar}
              style={({ pressed }) => [
                styles.modalAvatarWrap,
                pressed && { opacity: 0.7 },
              ]}
            >
              {editAvatar ? (
                <Image
                  source={{ uri: editAvatar }}
                  style={styles.modalAvatarImage}
                  contentFit="contain"
                />
              ) : (
                <View style={styles.modalAvatarPlaceholder}>
                  <Camera size={28} color={colors.textTertiary} />
                </View>
              )}
              <View style={styles.modalAvatarBadge}>
                <Camera size={14} color="#FFFFFF" />
              </View>
            </Pressable>
            <Text style={[styles.modalSectionLabel, { marginTop: spacing.lg }]}>
              {t("settings.nickname")}
            </Text>
            <TextInput
              style={styles.modalInput}
              placeholder={t("settings.nickname")}
              placeholderTextColor={colors.input.placeholder}
              value={editNickname}
              onChangeText={setEditNickname}
              maxLength={6}
            />
            <View style={styles.modalActions}>
              <Pressable
                onPress={() => setShowEditModal(false)}
                style={({ pressed }) => [
                  styles.modalCancelBtn,
                  pressed && { opacity: 0.7 },
                ]}
              >
                <Text style={styles.modalCancelText}>{t("common.cancel")}</Text>
              </Pressable>
              <Pressable
                onPress={saveEditProfile}
                style={({ pressed }) => [
                  styles.modalSaveBtn,
                  pressed && { opacity: 0.85 },
                ]}
              >
                <Text style={styles.modalSaveText}>{t("common.save")}</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {Platform.OS !== "web" && (
        <Modal
          visible={showAvatarPicker}
          transparent
          animationType="fade"
          onRequestClose={() => setShowAvatarPicker(false)}
        >
          <View style={styles.pickerOverlay}>
            <Pressable
              style={StyleSheet.absoluteFill}
              onPress={() => setShowAvatarPicker(false)}
            />
            <View style={styles.pickerSheet}>
              <Text style={styles.pickerTitle}>{t("settings.chooseAvatar")}</Text>
              <View style={styles.pickerActions}>
                <Pressable
                  style={({ pressed }) => [
                    styles.pickerBtn,
                    pressed && { opacity: 0.75 },
                  ]}
                  onPress={pickFromCamera}
                >
                  <View style={[styles.pickerIconWrap, { backgroundColor: colors.primaryBgMedium }]}>
                    <Camera size={20} color={colors.primary} />
                  </View>
                  <Text style={styles.pickerBtnText}>{t("settings.takePhoto")}</Text>
                </Pressable>
                <Pressable
                  style={({ pressed }) => [
                    styles.pickerBtn,
                    pressed && { opacity: 0.75 },
                  ]}
                  onPress={pickFromAlbum}
                >
                  <View style={[styles.pickerIconWrap, { backgroundColor: "rgba(107, 203, 158, 0.15)" }]}>
                    <FolderOpen size={20} color={colors.accent?.green || "#6BCB9E"} />
                  </View>
                  <Text style={styles.pickerBtnText}>{t("settings.fromAlbum")}</Text>
                </Pressable>
              </View>
              <Pressable
                style={({ pressed }) => [
                  styles.pickerCancelBtn,
                  pressed && { opacity: 0.7 },
                ]}
                onPress={() => setShowAvatarPicker(false)}
              >
                <Text style={styles.pickerCancelText}>{t("common.cancel")}</Text>
              </Pressable>
            </View>
          </View>
        </Modal>
      )}

    </View>
  );
}

function buildStyles(colors, shadows) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    scrollContent: {
      padding: spacing.xl,
      paddingBottom: spacing.huge,
      gap: spacing.xxl,
    },
    profileHeader: { alignItems: "center" },
    avatarWrap: {
      width: 88,
      height: 88,
      borderRadius: 44,
      overflow: "hidden",
      backgroundColor: colors.background,
      borderWidth: 2,
      borderColor: colors.borderLight,
      marginBottom: spacing.md,
    },
    avatarImage: { width: "100%", height: "100%" },
    avatarPlaceholder: {
      width: "100%",
      height: "100%",
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.background,
    },
    nicknameText: {
      fontSize: 18,
      fontWeight: "700",
      color: colors.textPrimary,
      marginBottom: spacing.xs,
    },
    cardGroup: {
      backgroundColor: colors.surfaceFrost,
      borderRadius: radius.xl,
      borderCurve: "continuous",
      overflow: "hidden",
      borderWidth: 1,
      borderColor: colors.border,
      ...shadows.card,
    },
    cardHeader: { gap: 6, padding: spacing.xl, paddingBottom: 0 },
    cardHeaderRow: { flexDirection: "row", alignItems: "center", gap: 8 },
    groupLabel: {
      color: colors.textPrimary,
      fontSize: 16,
      fontWeight: "700",
      lineHeight: 22,
      letterSpacing: -0.3,
      flexShrink: 1,
    },
    groupDesc: {
      color: colors.textTertiary,
      fontSize: 13,
      fontWeight: "400",
      lineHeight: 18,
    },
    cardList: { overflow: "hidden", marginTop: 4 },
    cardItem: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: spacing.xl,
      paddingVertical: 13,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.borderLight,
    },
    cardItemPressed: { backgroundColor: colors.surface },
    cardItemLast: { borderBottomWidth: 0 },
    cardItemNoBorder: { borderBottomWidth: 0 },
    cardItemLeft: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      flex: 1,
    },
    cardItemRight: { flexDirection: "row", alignItems: "center", gap: 6 },
    cardItemIcon: {
      width: 34,
      height: 34,
      borderRadius: radius.md,
      borderCurve: "continuous",
      alignItems: "center",
      justifyContent: "center",
    },
    cardItemLabel: {
      color: colors.textPrimary,
      fontSize: 14,
      fontWeight: "600",
      flexShrink: 1,
    },
    cardItemRightText: { fontSize: 13, color: colors.textTertiary },

    modalOverlay: {
      flex: 1,
      backgroundColor: colors.modalOverlay,
      justifyContent: "center",
      alignItems: "center",
      paddingHorizontal: 32,
    },
    modalContent: {
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
    modalTitle: {
      fontSize: 18,
      fontWeight: "700",
      color: colors.textPrimary,
      textAlign: "center",
    },
    modalDesc: {
      fontSize: 14,
      fontWeight: "400",
      color: colors.textSecondary,
      textAlign: "center",
      lineHeight: 22,
    },
    modalIconWrap: {
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: colors.dangerBg,
      alignItems: "center",
      justifyContent: "center",
    },
    modalSectionLabel: {
      fontSize: 13,
      fontWeight: "600",
      color: colors.textSecondary,
      alignSelf: "flex-start",
    },
    modalAvatarWrap: {
      width: 88,
      height: 88,
      borderRadius: 44,
      overflow: "hidden",
      backgroundColor: colors.background,
      borderWidth: 2,
      borderColor: colors.borderLight,
    },
    modalAvatarImage: { width: "100%", height: "100%" },
    modalAvatarPlaceholder: {
      width: "100%",
      height: "100%",
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.background,
    },
    modalAvatarBadge: {
      position: "absolute",
      bottom: 0,
      right: 0,
      width: 26,
      height: 26,
      borderRadius: 13,
      backgroundColor: colors.primary,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 2,
      borderColor: colors.background,
    },
    modalInput: {
      width: "100%",
      height: 48,
      borderWidth: 1,
      borderColor: colors.input.border,
      borderRadius: radius.md,
      paddingHorizontal: spacing.md,
      fontSize: 15,
      color: colors.input.text,
      backgroundColor: colors.input.bg,
    },
    modalActions: { flexDirection: "row", gap: spacing.md, width: "100%" },
    modalActionsRow: { flexDirection: "row", gap: 12, width: "100%" },
    modalCancelBtn: {
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
    modalCancelText: {
      fontSize: 14,
      fontWeight: "500",
      color: colors.textSecondary,
    },
    modalSaveBtn: {
      flex: 1,
      height: 56,
      borderRadius: radius.md,
      borderCurve: "continuous",
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.primary,
      ...shadows.glow,
    },
    modalSaveText: { fontSize: 17, fontWeight: "700", color: "#fff" },
    modalConfirmBtn: {
      height: 46,
      borderRadius: radius.md,
      borderCurve: "continuous",
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.accent.red,
    },
    modalConfirmText: { fontSize: 15, fontWeight: "700", color: "#fff" },
    appearanceSection: {},
    themePickerRow: {
      flexDirection: "row",
      paddingHorizontal: spacing.xl,
      paddingVertical: 12,
      gap: 8,
    },
    themePickerItem: {
      flex: 1,
      alignItems: "center",
      gap: 6,
      paddingVertical: 10,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: "transparent",
      backgroundColor: colors.surface,
    },
    themePickerItemActive: {
      borderColor: colors.primary,
    },
    themePickerIcon: {
      width: 36,
      height: 36,
      borderRadius: 18,
      alignItems: "center",
      justifyContent: "center",
    },
    themePickerLabel: {
      fontSize: 11,
      fontWeight: "600",
      color: colors.textSecondary,
    },
    themePickerDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
      marginTop: 2,
    },
    pickerOverlay: {
      flex: 1,
      justifyContent: "flex-end",
      backgroundColor: colors.modalOverlay,
    },
    pickerSheet: {
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
    pickerTitle: {
      fontSize: 14,
      fontWeight: "600",
      color: colors.textTertiary,
      textAlign: "center",
      marginBottom: 16,
      letterSpacing: 0.5,
    },
    pickerActions: {
      flexDirection: "row",
      gap: 12,
      marginBottom: 16,
    },
    pickerBtn: {
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
    pickerIconWrap: {
      width: 52,
      height: 52,
      borderRadius: 26,
      alignItems: "center",
      justifyContent: "center",
    },
    pickerBtnText: {
      fontSize: 13,
      fontWeight: "600",
      color: colors.textPrimary,
    },
    pickerCancelBtn: {
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: 14,
      borderRadius: radius.md,
      backgroundColor: colors.surfaceFrost,
      borderWidth: 1,
      borderColor: colors.border,
    },
    pickerCancelText: {
      fontSize: 15,
      fontWeight: "600",
      color: colors.textTertiary,
    },
  });
}
