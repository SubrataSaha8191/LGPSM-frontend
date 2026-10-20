import { apiClient, ApiResponse, API_BASE_URL } from "./apiClient";
import { tokenStorage } from "./tokenStorage";

// Mirrors CARD_DESIGNS in the backend's Template model — the actual server-rendered invitation
// card layout a template produces, independent of its name/category/preview image.
export const CARD_DESIGNS = [
  "CLASSIC",
  "CORPORATE_V1",
  "CORPORATE_V2",
  "WEDDING",
  "RICE_CEREMONY",
  "BIRTHDAY",
] as const;
export type CardDesign = (typeof CARD_DESIGNS)[number];

export const CARD_DESIGN_LABELS: Record<CardDesign, string> = {
  CLASSIC: "Classic",
  CORPORATE_V1: "Corporate — Award",
  CORPORATE_V2: "Corporate — Summit",
  WEDDING: "Wedding",
  RICE_CEREMONY: "Rice Ceremony",
  BIRTHDAY: "Birthday",
};

export interface Template {
  _id: string;
  id?: string;
  name: string;
  categoryId?: string | any;
  subcategoryId?: string;
  previewImageKey?: string;
  templateData?: Record<string, any>;
  cardDesign?: CardDesign;
  isSystemTemplate: boolean;
  isActive: boolean;
  isPublished?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface DefaultTemplatePlan {
  templatesToCreate: { name: string; cardDesign: string; category: string; subcategory?: string }[];
  templatesPresent: string[];
  categoriesToCreate: string[];
  subcategoriesToCreate: { category: string; subcategory: string }[];
}

export interface DefaultTemplateInstallResult extends DefaultTemplatePlan {
  created: string[];
}

export interface TemplatePreviewPayload {
  title?: string;
  startIso?: string;
  endIso?: string;
  venue?: string;
  locationSub?: string;
  isVirtual?: boolean;
  categoryName?: string;
  subcategoryName?: string;
  /** an uploaded image only ("media:<id>") */
  logoKey?: string;
}

export const templateService = {
  /**
   * The card this template makes for the event being entered, rendered by the server (nothing is saved).
   * POST /api/v1/templates/:id/preview
   */
  async previewCard(templateId: string, payload: TemplatePreviewPayload, signal?: AbortSignal): Promise<Blob> {
    const token = tokenStorage.getAccessToken();
    const res = await fetch(`${API_BASE_URL}/api/v1/templates/${templateId}/preview`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify(payload),
      signal,
    });
    if (!res.ok) throw new Error(`Preview failed (${res.status})`);
    return res.blob();
  },

  /** What installing the designers' default templates would add (admin only; changes nothing). */
  async previewDefaults(): Promise<ApiResponse<DefaultTemplatePlan>> {
    return apiClient<DefaultTemplatePlan>("/api/v1/templates/defaults", { method: "GET" }, true);
  },

  /** Adds the designers' default templates (and any category they need) that do not exist yet. */
  async installDefaults(): Promise<ApiResponse<DefaultTemplateInstallResult>> {
    return apiClient<DefaultTemplateInstallResult>("/api/v1/templates/defaults", { method: "POST" }, true);
  },

  async getTemplates(categoryId?: string): Promise<ApiResponse<Template[]>> {
    const url = categoryId ? `/api/v1/templates?categoryId=${categoryId}` : "/api/v1/templates";
    return apiClient<Template[]>(url, { method: "GET" }, true);
  },

  async getTemplateById(id: string): Promise<ApiResponse<Template>> {
    return apiClient<Template>(`/api/v1/templates/${id}`, { method: "GET" }, true);
  },

  async createTemplate(payload: {
    name: string;
    categoryId?: string;
    subcategoryId?: string;
    previewImageKey?: string;
    templateData?: Record<string, any>;
    cardDesign?: CardDesign;
    isSystemTemplate?: boolean;
    isPublished?: boolean;
  }): Promise<ApiResponse<Template>> {
    return apiClient<Template>("/api/v1/templates", { method: "POST", body: JSON.stringify(payload) }, true);
  },

  async updateTemplate(
    id: string,
    payload: {
      name?: string;
      categoryId?: string;
      subcategoryId?: string;
      previewImageKey?: string;
      templateData?: Record<string, any>;
      cardDesign?: CardDesign;
      isSystemTemplate?: boolean;
      isPublished?: boolean;
    }
  ): Promise<ApiResponse<Template>> {
    return apiClient<Template>(`/api/v1/templates/${id}`, { method: "PATCH", body: JSON.stringify(payload) }, true);
  },

  async deleteTemplate(id: string): Promise<ApiResponse<Template>> {
    return apiClient<Template>(
      `/api/v1/templates/${id}`,
      {
        method: "DELETE",
      },
      true
    );
  },
};
