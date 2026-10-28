// System users (on-ground staff) work only in the mobile app, so the web has just two portals
export type PortalMode = "admin" | "organizer";

export interface ParsedPortal {
  mode: PortalMode;
}

export function parsePortalMode(raw: string | null | undefined, fallback: PortalMode = "organizer"): ParsedPortal {
  switch (raw) {
    case "admin":
      return { mode: "admin" };
    case "organizer":
    case "user": // legacy alias
      return { mode: "organizer" };
    default:
      // Includes the retired system_user / assigned_user / app links: old bookmarks land on the organizer sign-in
      return { mode: fallback };
  }
}

export function portalRole(mode: PortalMode): "ADMIN" | "ORGANIZER" {
  return mode === "admin" ? "ADMIN" : "ORGANIZER";
}

export const signinHref = (mode: PortalMode) => `/signin?mode=${mode}`;

// The portal a user last signed in through is remembered in a cookie so every redirect to the
// login screen (logout, expired session, protected-route guard) returns them to the same portal.
export const PORTAL_COOKIE = "lgpsm_portal";

export function portalForRole(role: string | undefined | null): PortalMode {
  return role === "ADMIN" ? "admin" : "organizer";
}

export function rememberPortal(role: string | undefined | null) {
  if (typeof document === "undefined") return;
  document.cookie = `${PORTAL_COOKIE}=${portalForRole(role)}; path=/; max-age=31536000; samesite=lax`;
}

export function rememberedPortal(): PortalMode | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp(`(?:^|; )${PORTAL_COOKIE}=(admin|organizer)`));
  return (match?.[1] as PortalMode) || null;
}

// Login URL for redirects; `from` is kept so the user returns to where they were. With no remembered portal the
// organizer sign-in is the default (the sign-in page itself defaults to it): sending someone to the Admin form by
// accident is how a person ends up trying the wrong portal.
export function loginRedirectPath(from?: string): string {
  const params = new URLSearchParams({ mode: rememberedPortal() || "organizer" });
  if (from && isSafeReturnPath(from)) params.set("from", from);
  return `/signin?${params.toString()}`;
}

// A deliberate logout must not leave a "return to this page" trail. Otherwise the route guard, which also
// reacts to the session disappearing, sends the person to sign-in with from=<page they were on>, and whoever
// signs in next (possibly another role) lands on that page instead of their dashboard.
export const EXPLICIT_LOGOUT_KEY = "lgpsm_explicit_logout";

interface FlagStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

const browserSessionStorage = (): FlagStorage | null => {
  try {
    return typeof window === "undefined" ? null : window.sessionStorage;
  } catch {
    return null;
  }
};

export function flagExplicitLogout(storage: FlagStorage | null = browserSessionStorage()): void {
  try {
    storage?.setItem(EXPLICIT_LOGOUT_KEY, "1");
  } catch {
    /* storage blocked: the sign-in page also validates the return path, so this only loses a refinement */
  }
}

export function isExplicitLogout(storage: FlagStorage | null = browserSessionStorage()): boolean {
  try {
    return storage?.getItem(EXPLICIT_LOGOUT_KEY) === "1";
  } catch {
    return false;
  }
}

export function clearExplicitLogout(storage: FlagStorage | null = browserSessionStorage()): void {
  try {
    storage?.removeItem(EXPLICIT_LOGOUT_KEY);
  } catch {
    /* ignore */
  }
}

export function isSafeReturnPath(path: string | null | undefined): path is string {
  return !!path && path.startsWith("/") && !path.startsWith("//") && !path.startsWith("/signin");
}
export const forgotPasswordHref = (mode: PortalMode) => `/forgot-password?mode=${mode}`;

