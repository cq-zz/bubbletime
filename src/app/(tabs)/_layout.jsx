import AsyncStorage from "@react-native-async-storage/async-storage";
import { Tabs } from "expo-router";
import { Animated, Easing, Modal, Pressable, Text, View, StyleSheet } from "react-native";
import { Home, User } from "lucide-react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useTranslation } from "react-i18next";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTheme, hexToRgba, radius } from "../../utils/theme";
import useCheckIn from "../../hooks/useCheckIn";
import { MOODS, STORAGE_KEYS } from "../../utils/constant";
import { emit, on } from "../../utils/events";

const RIPPLE_CONFIGS = [
  { targetScale: 2.8, opacity: 0.65 },
  { targetScale: 2.2, opacity: 0.55 },
  { targetScale: 1.6, opacity: 0.4 },
];

const RIPPLE_RISE = 2400;
const RIPPLE_STAGGER = 1200;
const BTN_SIZE = 36;
const BTN_RADIUS = BTN_SIZE / 2;

export default function TabsLayout() {
  const { colors, themeMode, shadows } = useTheme();
  const { t } = useTranslation();
  const isCandy = themeMode === "candy";
  const { checkedIn, loading, doCheckIn, refresh } = useCheckIn();

  const [showMoodPicker, setShowMoodPicker] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [showMoodBtn, setShowMoodBtn] = useState(true);

  const pulseAnim = useRef(new Animated.Value(1)).current;
  const rippleAnims = useRef(RIPPLE_CONFIGS.map(() => new Animated.Value(0))).current;
  const successTimer = useRef(null);
  const toastAnim = useRef(new Animated.Value(0)).current;

  const loadModuleVisibility = useCallback(() => {
    AsyncStorage.getItem(STORAGE_KEYS.homeModules).then((val) => {
      if (val !== null) {
        try {
          const modules = JSON.parse(val);
          setShowMoodBtn(modules.includes("mood-trend"));
        } catch { setShowMoodBtn(true); }
      }
    });
  }, []);

  useEffect(() => { loadModuleVisibility(); }, [loadModuleVisibility]);

  useEffect(() => {
    const unsub = on("modulesChanged", loadModuleVisibility);
    return unsub;
  }, [loadModuleVisibility]);

  useEffect(() => {
    const unsub = on("dataReset", () => {
      loadModuleVisibility();
      refresh();
    });
    return unsub;
  }, [loadModuleVisibility, refresh]);

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.2, duration: 700, easing: Easing.out(Easing.ease), useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 1500, easing: Easing.in(Easing.ease), useNativeDriver: true }),
      ]),
    );
    pulse.start();

    const rippleLoops = rippleAnims.map((anim) =>
      Animated.loop(
        Animated.sequence([
          Animated.timing(anim, { toValue: 1, duration: RIPPLE_RISE, easing: Easing.out(Easing.ease), useNativeDriver: true }),
          Animated.timing(anim, { toValue: 0, duration: 0, useNativeDriver: true }),
        ]),
      ),
    );
    const staggered = Animated.stagger(RIPPLE_STAGGER, rippleLoops);
    staggered.start();

    return () => {
      pulse.stop();
      staggered.stop();

      if (successTimer.current) clearTimeout(successTimer.current);
    };
  }, [pulseAnim, rippleAnims]);

  useEffect(() => {
    if (showSuccess) {
      toastAnim.setValue(0);
      Animated.spring(toastAnim, { toValue: 1, friction: 6, tension: 100, useNativeDriver: true }).start();
    }
  }, [showSuccess, toastAnim]);

  useEffect(() => {
    const unsub = on("checkin", refresh);
    return unsub;
  }, [refresh]);

  const handleMoodSelect = useCallback(async (mood) => {
    setShowMoodPicker(false);
    const result = await doCheckIn(mood);
    if (result.success) {
      setSuccessMsg(t("checkIn.moodSuccess." + mood));
      setShowSuccess(true);
      successTimer.current = setTimeout(() => setShowSuccess(false), 5000);
      emit("checkin");
    }
  }, [doCheckIn, t]);

  const styles = useMemo(() => StyleSheet.create({
    moodOverlay: {
      flex: 1, backgroundColor: colors.modalOverlay, justifyContent: "center", alignItems: "center", paddingHorizontal: 24,
    },
    moodCard: {
      width: "100%", maxWidth: 340, backgroundColor: colors.modalBg, borderRadius: radius.xl, borderCurve: "continuous",
      padding: 20, gap: 14, borderWidth: 1, borderColor: colors.border, maxHeight: "80%",
    },
    moodTitle: {
      fontSize: 15, fontWeight: "700", color: colors.textPrimary, textAlign: "center",
    },
    moodGrid: {
      flexDirection: "row", flexWrap: "wrap", gap: 6, justifyContent: "center",
    },
    moodItem: {
      alignItems: "center", gap: 2, paddingHorizontal: 8, paddingVertical: 6,
      borderRadius: 12, backgroundColor: colors.primaryBg, minWidth: 52,
    },
    moodItemEmoji: { fontSize: 20 },
    moodItemLabel: { fontSize: 10, fontWeight: "600", color: colors.textSecondary, textAlign: "center" },
    moodItemScore: { fontSize: 9, fontWeight: "700", color: colors.textTertiary },
  }), [colors]);

  return (
    <View style={{ flex: 1 }}>
      <Tabs
        initialRouteName="home"
        screenOptions={{
          headerShown: false,
          tabBarStyle: {
            backgroundColor: isCandy ? "#FFF8FB" : colors.background,
            borderTopColor: colors.borderLight,
            borderTopWidth: isCandy ? 2 : 0.5,
            height: 64,
            paddingBottom: 4,
            paddingTop: 4,
          },
          tabBarActiveTintColor: colors.primary,
          tabBarInactiveTintColor: colors.textTertiary,
          tabBarLabelStyle: {
            fontSize: 11,
            fontWeight: "600",
          },
        }}
      >
        <Tabs.Screen
          name="home"
          options={{
            title: t("tab.home"),
            tabBarIcon: ({ color, size }) => <Home size={size} color={color} />,
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: t("tab.profile"),
            tabBarIcon: ({ color, size }) => <User size={size} color={color} />,
          }}
        />
      </Tabs>

      {showMoodBtn && !checkedIn && (
        <View style={{ position: "absolute", bottom: 28, alignSelf: "center", zIndex: 100, alignItems: "center", justifyContent: "center" }}>
          {rippleAnims.map((anim, i) => {
            const cfg = RIPPLE_CONFIGS[i];
            return (
              <Animated.View
                key={`ripple-${i}`}
                pointerEvents="none"
                style={{
                  position: "absolute",
                  width: BTN_SIZE,
                  height: BTN_SIZE,
                  borderRadius: BTN_RADIUS,
                  backgroundColor: hexToRgba(colors.primary, cfg.opacity),
                  transform: [{ scale: anim.interpolate({ inputRange: [0, 1], outputRange: [1, cfg.targetScale] }) }],
                  opacity: anim.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, cfg.opacity, 0] }),
                }}
              />
            );
          })}

          <Animated.View
            style={{
              width: 44,
              height: 44,
              borderRadius: 22,
              transform: [{ scale: pulseAnim }],
            }}
          >
            <Pressable
              onPress={() => setShowMoodPicker(true)}
              disabled={loading}
              style={({ pressed }) => ({
                width: "100%",
                height: "100%",
                borderRadius: 22,
                overflow: "hidden",
                opacity: pressed ? 0.85 : 1,
              })}
            >
              <LinearGradient
                colors={[colors.primaryLight, colors.primary]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{ flex: 1, alignItems: "center", justifyContent: "center" }}
              >
<Text style={{ fontSize: 16, fontWeight: "800", color: "#fff", letterSpacing: -0.5, textAlign: "center" }}>{t("checkIn.check")}</Text>
              </LinearGradient>
            </Pressable>
          </Animated.View>
        </View>
      )}

      <Modal visible={showMoodPicker} transparent animationType="fade" onRequestClose={() => setShowMoodPicker(false)}>
        <Pressable style={styles.moodOverlay} onPress={() => setShowMoodPicker(false)}>
          <Pressable style={styles.moodCard} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.moodTitle}>{t("checkIn.moodTitle")}</Text>
            <View style={styles.moodGrid}>
              {MOODS.map((m) => (
                <Pressable
                  key={m.key}
                  onPress={() => handleMoodSelect(m.key)}
                  style={({ pressed }) => [
                    styles.moodItem,
                    pressed && { opacity: 0.7 },
                  ]}
                >
                  <Text style={styles.moodItemEmoji}>{m.emoji}</Text>
                  <Text style={styles.moodItemLabel} numberOfLines={1}>{t("checkIn.mood." + m.key)}</Text>
                  <Text style={styles.moodItemScore}>{m.score}</Text>
                </Pressable>
              ))}
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {showSuccess && (
        <Animated.View
          pointerEvents="none"
          style={{
            position: "absolute",
            top: 60,
            alignSelf: "center",
            zIndex: 200,
            borderRadius: 20,
            maxWidth: 280,
            opacity: toastAnim,
            transform: [{ translateY: toastAnim.interpolate({ inputRange: [0, 1], outputRange: [-20, 0] }) }, { scale: toastAnim }],
            ...shadows.xl,
          }}
        >
          <LinearGradient
            colors={[colors.primaryLight, colors.primary]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{
              paddingHorizontal: 16,
              paddingVertical: 10,
              borderRadius: 20,
              borderWidth: 1.5,
              borderColor: hexToRgba("#fff", 0.3),
              alignItems: "center",
            }}
          >
            <Text style={{ fontSize: 13, fontWeight: "600", color: "#fff", textAlign: "center", flexShrink: 1, lineHeight: 18 }}>🎉 {successMsg}</Text>
          </LinearGradient>
        </Animated.View>
      )}
    </View>
  );
}
