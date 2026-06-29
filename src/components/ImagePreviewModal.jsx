/* eslint-disable */
import { Image } from "expo-image";
import { useMemo, useRef, useState } from "react";
import {
  Animated,
  Modal,
  PanResponder,
  Pressable,
  StyleSheet,
  View,
} from "react-native";
import { X } from "lucide-react-native";
import { useTheme } from "../utils/theme";

function dist(t) {
  if (t.length < 2) return 0;
  const dx = t[0].pageX - t[1].pageX;
  const dy = t[0].pageY - t[1].pageY;
  return Math.sqrt(dx * dx + dy * dy);
}

function mid(t) {
  if (t.length < 2) return { x: 0, y: 0 };
  return { x: (t[0].pageX + t[1].pageX) / 2, y: (t[0].pageY + t[1].pageY) / 2 };
}

export default function ImagePreviewModal({ imageUri, onClose }) {
  const { colors } = useTheme();
  const styles = useMemo(() => buildStyles(colors), [colors]);

  const [sx] = useState(() => new Animated.Value(1));
  const [tx] = useState(() => new Animated.Value(0));
  const [ty] = useState(() => new Animated.Value(0));

  const st = useRef({
    scale: 1,
    tx: 0,
    ty: 0,
    pinching: false,
    baseScale: 1,
    pinchDist: 0,
    pinchMidX: 0,
    pinchMidY: 0,
    panning: false,
    panStartX: 0,
    panStartY: 0,
  });

  const lastTap = useRef(0);
  const closeTimer = useRef(null);

  const close = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    closeTimer.current = null;
    lastTap.current = 0;
    st.current.scale = 1;
    st.current.tx = 0;
    st.current.ty = 0;
    sx.setValue(1);
    tx.setValue(0);
    ty.setValue(0);
    onClose();
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,

      onPanResponderGrant: (evt) => {
        const touches = evt.nativeEvent.touches;
        const c = st.current;
        c.pinching = false;
        c.panning = false;

        if (touches.length >= 2) {
          c.pinching = true;
          c.baseScale = c.scale;
          c.pinchDist = dist(touches);
          const m = mid(touches);
          c.pinchMidX = m.x;
          c.pinchMidY = m.y;
        } else if (c.scale > 1) {
          c.panning = true;
          c.panStartX = c.tx;
          c.panStartY = c.ty;
        }
      },

      onPanResponderMove: (evt, gs) => {
        const touches = evt.nativeEvent.touches;
        const c = st.current;

        if (touches.length >= 2) {
          c.pinching = true;
          const d = dist(touches);
          if (c.pinchDist > 0) {
            const newScale = c.baseScale * (d / c.pinchDist);
            if (newScale < 0.5) return;
            c.scale = newScale;
            sx.setValue(newScale);
          }

          const m = mid(touches);
          const dx = m.x - c.pinchMidX;
          const dy = m.y - c.pinchMidY;
          c.tx += dx;
          c.ty += dy;
          tx.setValue(c.tx);
          ty.setValue(c.ty);

          c.pinchDist = d;
          c.pinchMidX = m.x;
          c.pinchMidY = m.y;
        } else if (c.pinching) {
          // transitioning from 2 to 1 finger – ignore
        } else if (c.scale > 1) {
          c.panning = true;
          c.tx = c.panStartX + gs.dx;
          c.ty = c.panStartY + gs.dy;
          tx.setValue(c.tx);
          ty.setValue(c.ty);
        }
      },

      onPanResponderRelease: (_, gs) => {
        const c = st.current;

        if (c.pinching) {
          if (c.scale < 1) {
            c.scale = 1;
            c.tx = 0;
            c.ty = 0;
            Animated.parallel([
              Animated.spring(sx, { toValue: 1, useNativeDriver: true }),
              Animated.spring(tx, { toValue: 0, useNativeDriver: true }),
              Animated.spring(ty, { toValue: 0, useNativeDriver: true }),
            ]).start();
          }
          c.pinching = false;
          return;
        }

        if (c.panning) {
          c.panning = false;
          return;
        }

        // Tap detection
        if (Math.abs(gs.dx) > 8 || Math.abs(gs.dy) > 8) return;

        const now = Date.now();
        if (now - lastTap.current < 300) {
          if (closeTimer.current) clearTimeout(closeTimer.current);
          closeTimer.current = null;
          // double tap → toggle zoom
          if (c.scale > 1) {
            c.scale = 1;
            c.tx = 0;
            c.ty = 0;
            Animated.parallel([
              Animated.spring(sx, { toValue: 1, useNativeDriver: true }),
              Animated.spring(tx, { toValue: 0, useNativeDriver: true }),
              Animated.spring(ty, { toValue: 0, useNativeDriver: true }),
            ]).start();
          } else {
            c.scale = 2.5;
            Animated.spring(sx, { toValue: 2.5, useNativeDriver: true }).start();
          }
          lastTap.current = 0;
        } else {
          lastTap.current = now;
          closeTimer.current = setTimeout(close, 300);
        }
      },
    })
  ).current;

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
