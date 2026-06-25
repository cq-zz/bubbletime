import { useCallback, useEffect, useState } from "react";
import { fetchTodayCheckIn, fetchSubmitCheckIn } from "../services/checkIn";

export default function useCheckIn() {
  const [checkedIn, setCheckedIn] = useState(false);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    const res = await fetchTodayCheckIn();
    setCheckedIn(res.code === 0 && !!res.data);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const doCheckIn = useCallback(async (mood) => {
    setLoading(true);
    const res = await fetchSubmitCheckIn(mood);
    setLoading(false);
    if (res.code === 0) {
      setCheckedIn(true);
      return { success: true };
    }
    return { success: false, message: res.message };
  }, []);

  return { checkedIn, loading, doCheckIn, refresh };
}
