import { createContext, useCallback, useContext, useEffect, useState } from "react";
import AlertModal from "../components/AlertModal";

const AlertContext = createContext(null);
const _globalAlertRef = { current: null };

export function AlertProvider({ children }) {
  const [alertState, setAlertState] = useState(null);

  const show = useCallback((titleOrConfig, message, buttons) => {
    if (typeof titleOrConfig === "string") {
      setAlertState({ title: titleOrConfig, message, type: "tip", buttons });
    } else {
      setAlertState({
        title: "",
        message: "",
        type: "tip",
        buttons: undefined,
        ...titleOrConfig,
      });
    }
  }, []);

  const close = useCallback(() => setAlertState(null), []);

  useEffect(() => {
    _globalAlertRef.current = show;
    return () => { _globalAlertRef.current = null; };
  }, [show]);

  return (
    <AlertContext.Provider value={show}>
      {children}
      <AlertModal
        visible={!!alertState}
        onClose={close}
        title={alertState?.title}
        message={alertState?.message}
        type={alertState?.type}
        buttons={alertState?.buttons}
      />
    </AlertContext.Provider>
  );
}

export default function useAlert() {
  const show = useContext(AlertContext);
  return {
    alert: useCallback((...args) => show?.(...args), [show]),
  };
}

export function globalAlert(...args) {
  _globalAlertRef.current?.(...args);
}
