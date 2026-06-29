/* eslint-disable react-hooks/refs */
import { Image } from "expo-image";
import { useMemo, useRef, useState } from "react";
import {
  Animated,
  Modal,
  PanResponder,
  Pressable,
  StyleSheet,
  View,
  TouchableWithoutFeedback,
} from "react-native";
import { X } from "lucide-react-native";
import { useTheme } from "../utils/theme";

const ZOOM_LEVELS = [1, 2.5];

export default function ImagePreviewModal({ imageUri, onClose }) {
  const { colors } = useTheme();
  const styles = useMemo(() => buildStyles(colors), [colors]);

  const [sx] = useState(() => new Animated.Value(1));
  const [tx] = useState(() => new Animated.Value(0));
  const [ty] = useState(() => new Animated.Value(0));

  const sharedRef = useRef({ zoomed: false, px: 0, py: 0 });
  const lastTapRef = useRef(0);
  const closeTimerRef = useRef(null);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => sharedRef.current.zoomed,
      onPanResponderGrant: () => {
        sharedRef.current.px = 0;
        sharedRef.current.py = 0;
      },
      onPanResponderMove: (_, gs) => {
        if (!sharedRef.current.zoomed) return;
        sharedRef.current.px = gs.dx;
        sharedRef.current.py = gs.dy;
        tx.setValue(sharedRef.current.px);
        ty.setValue(sharedRef.current.py);
      },
      onPanResponderRelease: (_, gs) => {
        if (!sharedRef.current.zoomed && Math.abs(gs.dx) < 5 && Math.abs(gs.dy) < 5) {
          close();
        }
      },
    })
  ).current;

  const close = () => {
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    closeTimerRef.current = null;
    lastTapRef.current = 0;
    sharedRef.current.zoomed = false;
    sharedRef.current.px = 0;
    sharedRef.current.py = 0;
    sx.setValue(1);
    tx.setValue(0);
    ty.setValue(0);
    onClose();
  };

  const animateTo = (toScale, toX, toY) => {
    Animated.parallel([
      Animated.spring(sx, { toValue: toScale, useNativeDriver: true }),
      Animated.spring(tx, { toValue: toX, useNativeDriver: true }),
      Animated.spring(ty, { toValue: toY, useNativeDriver: true }),
    ]).start();
  };

  const handleZoomToggle = () => {
    sharedRef.current.zoomed = !sharedRef.current.zoomed;
    if (sharedRef.current.zoomed) {
      animateTo(ZOOM_LEVELS[1], 0, 0);
    } else {
      sharedRef.current.px = 0;
      sharedRef.current.py = 0;
      animateTo(1, 0, 0);
    }
  };

  const handleImagePress = () => {
    const now = Date.now();
    if (now - lastTapRef.current < 300) {
      if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
      handleZoomToggle();
      lastTapRef.current = 0;
    } else {
      lastTapRef.current = now;
      closeTimerRef.current = setTimeout(close, 300);
    }
  };

  if (!imageUri) return null;

  return (
    <Modal
      visible
      transparent
      animationType="fade"
      onRequestClose={close}
    >
      <View style={styles.overlay}>
        <Pressable style={styles.closeBtn} onPress={close}>
          <X size={24} color="#FFFFFF" />
        </Pressable>

        <TouchableWithoutFeedback onPress={handleImagePress}>
          <Animated.View
            style={[
              styles.imageWrap,
              {
                transform: [
                  { translateX: tx },
                  { translateY: ty },
                  { scale: sx },
                ],
              },
            ]}
            {...panResponder.panHandlers}
          >
            <Image
              source={typeof imageUri === "string" ? { uri: imageUri } : imageUri}
              style={styles.image}
              contentFit="contain"
            />
          </Animated.View>
        </TouchableWithoutFeedback>
      </View>
    </Modal>
  );
}

function buildStyles(colors) {
  return StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.92)",
      justifyContent: "center",
      alignItems: "center",
    },
    closeBtn: {
      position: "absolute",
      top: 60,
      right: 20,
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: "rgba(255,255,255,0.15)",
      alignItems: "center",
      justifyContent: "center",
      zIndex: 10,
    },
    imageWrap: {
      width: "100%",
      height: "80%",
    },
    image: {
      width: "100%",
      height: "100%",
    },
  });
}
