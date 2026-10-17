import { apiClient, ApiResponse } from "./apiClient";

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

export const templateService = {
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
