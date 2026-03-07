export type AuthRole = "owner" | "user";

type AuthSession = {
  token: string | null;
  username: string | null;
  role: string | null;
};

const AUTH_KEYS = {
  token: "token",
  username: "username",
  role: "role",
} as const;

const readAuth = (storage: Storage): AuthSession => ({
  token: storage.getItem(AUTH_KEYS.token),
  username: storage.getItem(AUTH_KEYS.username),
  role: storage.getItem(AUTH_KEYS.role),
});

export const getAuthSession = (): AuthSession => {
  if (typeof window === "undefined") {
    return { token: null, username: null, role: null };
  }

  const sessionAuth = readAuth(window.sessionStorage);
  if (sessionAuth.token && sessionAuth.role) {
    return sessionAuth;
  }

  // Backward compatibility for older logins that used localStorage.
  return readAuth(window.localStorage);
};

export const setAuthSession = (
  token: string,
  username: string,
  role: AuthRole,
): void => {
  if (typeof window === "undefined") return;

  window.sessionStorage.setItem(AUTH_KEYS.token, token);
  window.sessionStorage.setItem(AUTH_KEYS.username, username);
  window.sessionStorage.setItem(AUTH_KEYS.role, role);

  // Clear legacy shared keys to avoid cross-tab role conflicts.
  window.localStorage.removeItem(AUTH_KEYS.token);
  window.localStorage.removeItem(AUTH_KEYS.username);
  window.localStorage.removeItem(AUTH_KEYS.role);
};

export const setAuthRole = (role: AuthRole): void => {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(AUTH_KEYS.role, role);
  window.localStorage.removeItem(AUTH_KEYS.role);
};

export const clearAuthSession = (): void => {
  if (typeof window === "undefined") return;

  window.sessionStorage.removeItem(AUTH_KEYS.token);
  window.sessionStorage.removeItem(AUTH_KEYS.username);
  window.sessionStorage.removeItem(AUTH_KEYS.role);

  // Also clear old shared keys if present.
  window.localStorage.removeItem(AUTH_KEYS.token);
  window.localStorage.removeItem(AUTH_KEYS.username);
  window.localStorage.removeItem(AUTH_KEYS.role);
};
