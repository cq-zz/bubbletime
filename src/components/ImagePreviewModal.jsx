import { Image } from "expo-image";
import { useMemo, useRef, useState } from "react";
import { Animated, Dimensions, Modal, StyleSheet, View } from "react-native";
import { useTheme } from "../utils/theme";

const MIN_SCALE = 1;
const MAX_SCALE = 4;
const TAP_MOVE_THRESHOLD = 10;

function dist(t) {
  if (t.length < 2) return 0;
  const dx = t[0].pageX - t[1].pageX;
  const dy = t[0].pageY - t[1].pageY;
  return Math.sqrt(dx * dx + dy * dy);
}

function midpoint(t) {
  return {
    x: (t[0].pageX + t[1].pageX) / 2,
    y: (t[0].pageY + t[1].pageY) / 2,
  };
}

export default function ImagePreviewModal({ imageUri, onClose }) {
  const { colors } = useTheme();
  const styles = useMemo(() => buildStyles(colors), [colors]);
  const vp = useRef(Dimensions.get("window"));

  const [sx] = useState(() => new Animated.Value(1));
  const [tx] = useState(() => new Animated.Value(0));
  const [ty] = useState(() => new Animated.Value(0));

  const S = useRef({
    // Current transform
    sc: 1,
    tx: 0,
    ty: 0,
    // Drag
    drag: false,
    dragSc: 1,
    dragTx: 0,
    dragTy: 0,
    dragBaseX: 0,
    dragBaseY: 0,
    // Pinch
    pinch: false,
    baseSc: 1,
    baseTx: 0,
    baseTy: 0,
    startDist: 0,
    startMidX: 0,
    startMidY: 0,
    // First‑move baseline guard (avoids jump between touchstart and first touchmove)
    baselined: false,
    // Tap tracking
    moved: false,
    tapX: 0,
    tapY: 0,
  });

  // ─── helpers ───────────────────────────────────────────────

  function bound(sc) {
    const mtx = (vp.current.width * sc - vp.current.width) / 2;
    const mty = (vp.current.height * sc - vp.current.height) / 2;
    return { mtx: Math.max(0, mtx), mty: Math.max(0, mty) };
  }

  function set(s, x, y, anim) {
    const c = S.current;
    c.sc = s;
    c.tx = x;
    c.ty = y;
    if (anim) {
      Animated.parallel([
        Animated.spring(sx, { toValue: s, useNativeDriver: true }),
        Animated.spring(tx, { toValue: x, useNativeDriver: true }),
        Animated.spring(ty, { toValue: y, useNativeDriver: true }),
      ]).start();
    } else {
      sx.setValue(s);
      tx.setValue(x);
      ty.setValue(y);
    }
  }

  function recenter() {
    const c = S.current;
    if (c.sc < 1) { set(1, 0, 0, true); return; }
    const { mtx, mty } = bound(c.sc);
    const x = Math.min(mtx, Math.max(-mtx, c.tx));
    const y = Math.min(mty, Math.max(-mty, c.ty));
    if (x !== c.tx || y !== c.ty) set(c.sc, x, y, true);
  }

  function beginPinch(t) {
    const c = S.current;
    const p = midpoint(t);
    c.pinch = true;
    c.baselined = true;
    c.baseSc = c.sc;
    c.baseTx = c.tx;
    c.baseTy = c.ty;
    c.startDist = dist(t);
    c.startMidX = p.x - vp.current.width / 2;
    c.startMidY = p.y - vp.current.height / 2;
  }

  function close() {
    const c = S.current; c.sc = 1; c.tx = 0; c.ty = 0;
    sx.setValue(1); tx.setValue(0); ty.setValue(0);
    onClose();
  }

  // ─── touch handlers ───────────────────────────────────────

  function onStart(e) {
    const t = e.nativeEvent.touches || [];
    const c = S.current;
    c.drag = false;
    c.pinch = false;
    c.moved = false;
    c.baselined = false;

    if (t.length >= 2) {
      beginPinch(t);
    } else if (c.sc > 1) {
      c.drag = true;
      c.dragSc = c.sc;
      c.dragTx = c.tx;
      c.dragTy = c.ty;
      c.dragBaseX = t[0]?.pageX || 0;
      c.dragBaseY = t[0]?.pageY || 0;
    }

    c.tapX = t[0]?.pageX || 0;
    c.tapY = t[0]?.pageY || 0;
  }

  function onMove(e) {
    const t = e.nativeEvent.touches || [];
    const c = S.current;

    if (t.length >= 2) {
      c.pinch = true;

      // If the second finger did not trigger onStart, fall back to the first
      // two-finger move frame as the pinch baseline.
      if (!c.baselined) {
        beginPinch(t);
        return; // apply nothing on this frame – transform is unchanged
      }

      const d = dist(t);
      if (d === 0 || c.startDist === 0) return;

      const raw = c.baseSc * (d / c.startDist);
      const s = Math.min(MAX_SCALE, Math.max(MIN_SCALE, raw));

      // Keep the content point under the initial two-finger midpoint anchored,
      // while still allowing the current midpoint to pan during pinch.
      const p = midpoint(t);
      const cx = p.x - vp.current.width / 2;
      const cy = p.y - vp.current.height / 2;
      const r = s / (c.baseSc || 1);
      const nx = cx - (c.startMidX - c.baseTx) * r;
      const ny = cy - (c.startMidY - c.baseTy) * r;

      const { mtx, mty } = bound(s);
      set(s, Math.min(mtx, Math.max(-mtx, nx)), Math.min(mty, Math.max(-mty, ny)), false);
      c.moved = true;
    } else if (c.pinch) {
      // 2→1 fingers – ignore
      c.moved = true;
    } else if (c.drag || c.sc > 1) {
      c.drag = true;
      const dx = (t[0]?.pageX || 0) - c.dragBaseX;
      const dy = (t[0]?.pageY || 0) - c.dragBaseY;
      if (Math.abs(dx) <= TAP_MOVE_THRESHOLD && Math.abs(dy) <= TAP_MOVE_THRESHOLD) {
        return;
      }
      c.moved = true;
      const { mtx, mty } = bound(c.sc);
      set(c.sc,
        Math.min(mtx, Math.max(-mtx, c.dragTx + dx)),
        Math.min(mty, Math.max(-mty, c.dragTy + dy)),
        false);
    } else if (t.length === 1) {
      c.lastX = t[0]?.pageX || 0;
      c.lastY = t[0]?.pageY || 0;
    }
  }

  function onEnd(e) {
    const c = S.current;

    if (c.pinch) {
      c.pinch = false;
      c.baselined = false;
      c.startDist = 0;
      recenter();
      return;
    }

    if (c.drag) {
      c.drag = false;
      if (c.moved) {
        recenter();
        return;
      }
    }

    if (c.moved) {
      const dx = Math.abs((c.lastX || c.tapX) - c.tapX);
      const dy = Math.abs((c.lastY || c.tapY) - c.tapY);
      if (dx > TAP_MOVE_THRESHOLD || dy > TAP_MOVE_THRESHOLD) return;
    }

    close();
  }

  // ─── render ───────────────────────────────────────────────

  if (!imageUri) return null;

  return (
    <Modal
      visible
      transparent
      animationType="fade"
      onRequestClose={close}
    >
      <View
        style={styles.overlay}
        onTouchStart={onStart}
        onTouchMove={onMove}
        onTouchEnd={onEnd}
      >
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
