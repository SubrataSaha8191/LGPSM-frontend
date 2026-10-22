// Pure helpers for the AI template screens (dependency-free so they can be unit-tested with `npm test`).

import type { GenerationJob, GenerationStatus, GenerationVariant } from "@/services/templateGenerationService";

export const isFinished = (status: GenerationStatus | undefined): boolean => status === "SUCCEEDED" || status === "CONCEPT_ONLY" || status === "FAILED";

/** Poll quickly at first, then back off: a design takes tens of seconds, so there is nothing to see sooner. */
export function pollDelayMs(attempt: number): number {
  return Math.min(2500 + attempt * 500, 6000);
}

/** After this long we tell the user it is taking longer than usual (the job keeps running on the server). */
export const SLOW_AFTER_MS = 120_000;

export interface ErrorView {
  title: string;
  message: string;
  /** whether trying the same request again can help */
  retryable: boolean;
  kind: "unavailable" | "quota" | "validation" | "busy" | "provider" | "network" | "other";
}

/** Plain-language state for a failed request or job, from the backend's machine-readable code. */
export function describeGenerationError(input: { code?: string; message?: string; status?: number }): ErrorView {
  const message = input.message || "Something went wrong. Please try again.";
  switch (input.code) {
    case "PROVIDER_UNAVAILABLE":
    case "PROVIDER_AUTH":
      return { title: "AI design is unavailable", message, retryable: false, kind: "unavailable" };
    case "QUOTA_EXCEEDED":
      return { title: "Daily limit reached", message, retryable: false, kind: "quota" };
    case "RATE_LIMITED":
      return { title: "Too many requests", message, retryable: true, kind: "quota" };
    case "PROVIDER_QUOTA":
      return { title: "The design service is busy", message, retryable: true, kind: "provider" };
    case "JOB_ACTIVE":
      return { title: "A design is already in progress", message, retryable: false, kind: "busy" };
    case "INVALID_REQUEST":
      return { title: "Check your request", message, retryable: false, kind: "validation" };
    case "PROVIDER_TIMEOUT":
    case "PROVIDER_FAILED":
    case "BAD_PROVIDER_RESPONSE":
    case "INTERRUPTED":
    case "EXPIRED":
      return { title: "The design could not be created", message, retryable: true, kind: "provider" };
  }
  if (input.status === 0) return { title: "You appear to be offline", message: "Check your connection and try again.", retryable: true, kind: "network" };
  if (input.status === 400) return { title: "Check your request", message, retryable: false, kind: "validation" };
  if (input.status === 429) return { title: "Too many requests", message, retryable: true, kind: "quota" };
  return { title: "Something went wrong", message, retryable: true, kind: "other" };
}

export type VariantBadge = { label: string; tone: "ready" | "concept" | "saved" };

/** What a variant is, in words: only a converted one is a template; a concept is a picture. */
export function variantBadge(v: Pick<GenerationVariant, "ready" | "templateId">): VariantBadge {
  if (v.templateId) return { label: "Saved", tone: "saved" };
  return v.ready ? { label: "Ready to use", tone: "ready" } : { label: "Concept only", tone: "concept" };
}

/** The image to show for a variant: the converted template when there is one, else the provider's concept. */
export function variantImageKey(v: Pick<GenerationVariant, "ready" | "previewImageKey" | "conceptImageKey">): string | null {
  return (v.ready && v.previewImageKey) || v.conceptImageKey || null;
}

export function canSave(v: Pick<GenerationVariant, "ready">): boolean {
  return v.ready === true;
}

export function jobSummary(job: Pick<GenerationJob, "status" | "variants">): string {
  const ready = job.variants.filter((v) => v.ready).length;
  switch (job.status) {
    case "QUEUED":
      return "Waiting to start…";
    case "RUNNING":
      return "Designing… this usually takes a minute";
    case "SUCCEEDED":
      return ready === job.variants.length ? `${ready} design${ready === 1 ? "" : "s"} ready` : `${ready} of ${job.variants.length} designs ready to use`;
    case "CONCEPT_ONLY":
      return "The design could not be turned into a template yet";
    default:
      return "Failed";
  }
}

/** A key that makes retries of one click safe: the server returns the same job for the same key. */
export function newIdempotencyKey(): string {
  const bytes = new Uint8Array(12);
  if (typeof crypto !== "undefined" && crypto.getRandomValues) crypto.getRandomValues(bytes);
  else for (let i = 0; i < bytes.length; i++) bytes[i] = Math.floor(Math.random() * 256);
  return `k${Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("")}`;
}

/** Size labels for the picker: "Story / phone (9:16) · 1080 × 1920". */
export function presetLabel(p: { label: string; width: number; height: number }): string {
  return `${p.label} · ${p.width} × ${p.height}`;
}
