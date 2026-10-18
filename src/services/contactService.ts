import { apiClient } from "./apiClient";
import { interpretContactResponse, toContactPayload, type ContactFormValues, type ContactOutcome } from "@/utils/contactForm";

export const contactService = {
  /**
   * Send a message through the real backend (POST /api/v1/public/contact, no auth).
   * Resolves with a UI-ready outcome; `success` is only ever returned after the API confirms the
   * message was durably accepted.
   */
  async submit(values: ContactFormValues): Promise<ContactOutcome> {
    const res = await apiClient("/api/v1/public/contact", {
      method: "POST",
      body: JSON.stringify(toContactPayload(values)),
    });
    return interpretContactResponse(res);
  },
};
