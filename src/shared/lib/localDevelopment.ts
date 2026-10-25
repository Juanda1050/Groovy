const localHosts = new Set(["localhost", "127.0.0.1", "[::1]", "::1"]);

export const isLocalAuthBypassEnabled =
  import.meta.env.DEV &&
  import.meta.env.VITE_DEV_AUTH_BYPASS === "true" &&
  typeof window !== "undefined" &&
  localHosts.has(window.location.hostname);
