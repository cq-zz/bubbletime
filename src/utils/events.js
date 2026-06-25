const listeners = {};

export function on(event, fn) {
  if (!listeners[event]) listeners[event] = [];
  listeners[event].push(fn);
  return () => {
    listeners[event] = listeners[event].filter((f) => f !== fn);
  };
}

export function emit(event, ...args) {
  (listeners[event] || []).forEach((fn) => fn(...args));
}
