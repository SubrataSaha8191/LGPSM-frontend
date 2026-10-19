// "Remember me" on the sign-in form. Only the email address is kept (never the password or a token),
// separately for each portal (admin / organizer), so the field can be pre-filled next time.
// Storage is injected so the logic can be unit-tested without a browser.

export interface KeyValueStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

const KEY_PREFIX = "lgpsm_remembered_login:";
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const keyFor = (portal: string) => `${KEY_PREFIX}${portal}`;

// Storage can throw (private mode, blocked site data); remembering is a convenience, never a requirement
function safely<T>(fn: () => T, fallback: T): T {
  try {
    return fn();
  } catch {
    return fallback;
  }
}

export function readRememberedEmail(storage: KeyValueStorage, portal: string): string {
  const raw = safely(() => storage.getItem(keyFor(portal)), null);
  if (!raw) return "";
  const email = raw.trim();
  // Anything that is not a plausible email (corrupted or tampered value) is ignored
  return email.length <= 254 && EMAIL_PATTERN.test(email) ? email : "";
}

export function saveRememberedEmail(storage: KeyValueStorage, portal: string, email: string): void {
  const value = email.trim();
  if (!EMAIL_PATTERN.test(value) || value.length > 254) return;
  safely(() => storage.setItem(keyFor(portal), value), undefined);
}

export function forgetRememberedEmail(storage: KeyValueStorage, portal: string): void {
  safely(() => storage.removeItem(keyFor(portal)), undefined);
}

// Called after a successful sign-in: ticked remembers this email, unticked forgets any earlier one
export function applyRememberChoice(storage: KeyValueStorage, portal: string, email: string, remember: boolean): void {
  if (remember) saveRememberedEmail(storage, portal, email);
  else forgetRememberedEmail(storage, portal);
}
