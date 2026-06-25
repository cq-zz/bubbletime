import { useCallback, useEffect, useRef } from "react";
import { AppState } from "react-native";
import { checkAutoSchedules } from "../services/bills";

function msUntilMidnight() {
  const now = new Date();
  const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 5, 0);
  const ms = tomorrow.getTime() - now.getTime();
  // 保护：夏令时等边缘情况可能导致负数或零，确保至少等待 1 分钟
  return ms > 60000 ? ms : 86400000;
}

// 防抖间隔（ms）：避免 AppState 恢复与定时器同时触发造成重复
const DEBOUNCE_MS = 5000;

export default function useBillScheduler() {
  const timeoutRef = useRef(null);
  const lastCheckRef = useRef(0);

  const runCheck = useCallback(async () => {
    const now = Date.now();
    // 防抖：短时间内已经触发过则跳过（锁机制在底层也有，这里是额外的 UI 层保护）
    if (now - lastCheckRef.current < DEBOUNCE_MS) return;
    lastCheckRef.current = now;
    try {
      await checkAutoSchedules();
    } catch (e) {
      // 静默处理：不影响应用正常运行
      if (__DEV__) console.warn("[BillScheduler] check failed:", e?.message);
    }
  }, []);

  useEffect(() => {
    let mounted = true;

    const scheduleNext = () => {
      if (!mounted) return;
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => {
        if (!mounted) return;
        runCheck();
        scheduleNext();
      }, msUntilMidnight());
    };

    // 启动时立即检查一次（处理应用离线期间漏掉的条目）
    runCheck();
    scheduleNext();

    // AppState 监听：从后台恢复到前台时检查
    const sub = AppState.addEventListener("change", (nextState) => {
      if (nextState === "active" && mounted) runCheck();
    });

    return () => {
      mounted = false;
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
      sub.remove();
    };
  }, [runCheck]);
}
