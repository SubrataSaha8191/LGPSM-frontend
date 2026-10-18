// Pure (dependency-free) logic for the public contact form: client-side validation, payload
// normalisation and turning an API response into something the UI can show. Kept free of imports and
// framework code so it can be unit-tested with Node's built-in test runner (see contactForm.test.mjs).
// The backend (POST /api/v1/public/contact) is the authority; these checks only give instant feedback.

export interface ContactFormValues {
  name: string;
  email: string;
  phone: string;
  message: string;
  // Honeypot: a hidden field that humans never fill in
  website: string;
}

export type ContactField = "name" | "email" | "phone" | "message";
export type ContactFieldErrors = Partial<Record<ContactField, string>>;

export const EMPTY_CONTACT_FORM: ContactFormValues = { name: "", email: "", phone: "", message: "", website: "" };

export const MESSAGE_MAX_LENGTH = 2000;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const MAX_LINKS = 2;

const countLinks = (text: string) => (text.match(/https?:\/\/|www\./gi) || []).length;
const phoneDigits = (v: string) => v.replace(/\D/g, "");

export function validateContactForm(values: ContactFormValues): ContactFieldErrors {
  const errors: ContactFieldErrors = {};
  const name = values.name.trim();
  const email = values.email.trim();
  const phone = values.phone.trim();
  const message = values.message.trim();

  if (!name) errors.name = "Enter your name";
  else if (name.length < 2) errors.name = "Name must be at least 2 characters";
  else if (name.length > 100) errors.name = "Name must be at most 100 characters";

  if (!email) errors.email = "Enter your email address";
  else if (email.length > 254 || !EMAIL_PATTERN.test(email)) errors.email = "Enter a valid email address";

  if (phone) {
    const digits = phoneDigits(phone).length;
    if (digits < 7 || digits > 15) errors.phone = "Enter a valid phone number (7–15 digits)";
  }

  if (!message) errors.message = "Tell us how we can help";
  else if (message.length < 10) errors.message = "Message must be at least 10 characters";
  else if (message.length > MESSAGE_MAX_LENGTH) errors.message = `Message must be at most ${MESSAGE_MAX_LENGTH} characters`;
  else if (countLinks(message) > MAX_LINKS) errors.message = "Please remove links from your message";

  return errors;
}

export const hasErrors = (errors: ContactFieldErrors) => Object.keys(errors).length > 0;

// What is actually sent: trimmed values, empty phone omitted, honeypot always forwarded as typed
export function toContactPayload(values: ContactFormValues) {
  const phone = values.phone.trim();
  return {
    name: values.name.trim(),
    email: values.email.trim(),
    ...(phone ? { phone } : {}),
    message: values.message.trim(),
    website: values.website,
  };
}

export interface ContactApiResponse {
  success?: boolean;
  message?: string;
  status?: number;
  details?: unknown;
  data?: unknown;
}

export type ContactOutcome =
  | { kind: "success"; message: string; duplicate: boolean }
  | { kind: "validation"; message: string; fieldErrors: ContactFieldErrors }
  | { kind: "rate-limited"; message: string }
  | { kind: "network"; message: string }
  | { kind: "server"; message: string };

const FIELDS: ContactField[] = ["name", "email", "phone", "message"];

// zod issues look like { path: ["body", "email"], message }
function fieldErrorsFromDetails(details: unknown): ContactFieldErrors {
  const out: ContactFieldErrors = {};
  if (!Array.isArray(details)) return out;
  for (const issue of details) {
    const path = (issue as { path?: unknown })?.path;
    const field = Array.isArray(path) ? path[path.length - 1] : undefined;
    const message = (issue as { message?: unknown })?.message;
    if (typeof field === "string" && (FIELDS as string[]).includes(field) && typeof message === "string") {
      const key = field as ContactField;
      if (!out[key]) out[key] = message;
    }
  }
  return out;
}

// Success is reported only when the backend confirms it accepted (stored) the message.
export function interpretContactResponse(res: ContactApiResponse | null | undefined): ContactOutcome {
  if (res && res.success === true) {
    const duplicate = (res.data as { duplicate?: unknown } | undefined)?.duplicate === true;
    return { kind: "success", duplicate, message: res.message || "Thanks — your message has been received." };
  }

  const status = res?.status;

  if (!res || status === 0 || status === undefined) {
    return { kind: "network", message: "We couldn't reach the server. Check your connection and try again — what you typed is still here." };
  }
  if (status === 429) {
    return { kind: "rate-limited", message: res.message || "You've sent several messages recently. Please wait a few minutes and try again." };
  }
  if (status === 400) {
    const fieldErrors = fieldErrorsFromDetails(res.details);
    return {
      kind: "validation",
      fieldErrors,
      message: res.message || "Please check the highlighted fields and try again.",
    };
  }
  if (status >= 500) {
    return { kind: "server", message: "Something went wrong on our side. Please try again in a moment — what you typed is still here." };
  }
  return { kind: "server", message: res.message || "Your message could not be sent. Please try again." };
}
