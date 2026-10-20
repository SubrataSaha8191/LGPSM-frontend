// Picks the template that suits an event type, so the organizer starts with the right design instead of an empty
// choice. Dependency-free so it can be unit-tested.

export interface SuggestableTemplate {
  _id: string;
  name: string;
  categoryId?: string | { _id: string } | null;
  subcategoryId?: string | null;
  previewImageKey?: string;
  isPublished?: boolean;
  isActive?: boolean;
}

const categoryOf = (t: SuggestableTemplate): string => (typeof t.categoryId === "object" && t.categoryId ? t.categoryId._id : t.categoryId || "");

/**
 * Best published template for the chosen category and subcategory, or null:
 *   1. made for exactly this subcategory
 *   2. made for this category as a whole (no subcategory)
 *   3. any other template of this category
 * Templates for a different subcategory are never suggested, and neither are drafts or deleted ones.
 */
export function suggestTemplate(templates: SuggestableTemplate[], categoryId: string, subcategoryId: string): SuggestableTemplate | null {
  if (!categoryId) return null;
  const usable = templates.filter((t) => t.isPublished !== false && t.isActive !== false && categoryOf(t) === categoryId);
  if (subcategoryId) {
    const exact = usable.find((t) => t.subcategoryId === subcategoryId);
    if (exact) return exact;
  }
  const wholeCategory = usable.find((t) => !t.subcategoryId);
  if (wholeCategory) return wholeCategory;
  // A category with only subcategory-specific templates: suggest one only when the subcategory is not chosen yet
  return subcategoryId ? null : usable[0] || null;
}
