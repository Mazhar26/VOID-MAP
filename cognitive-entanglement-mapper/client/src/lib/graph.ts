export type ConceptCategory = "skill" | "interest" | "project" | "idea";

export type GraphConcept = {
  id: number;
  title: string;
  description: string | null;
  category: ConceptCategory;
  confidence: number;
  tags: string[];
  urls: string[];
  positionX: number;
  positionY: number;
  createdAt: Date | string;
  updatedAt: Date | string;
};

export type GraphEntanglement = {
  id: number;
  sourceId: number;
  targetId: number;
  relationship: string;
  strength: number;
  createdAt: Date | string;
  updatedAt: Date | string;
};

export const categoryMeta: Record<ConceptCategory, { label: string; color: string; accent: string }> = {
  skill: { label: "Skill", color: "#9DE8FF", accent: "rgba(79, 209, 255, .18)" },
  interest: { label: "Interest", color: "#D5B9FF", accent: "rgba(181, 132, 255, .18)" },
  project: { label: "Project", color: "#A9F593", accent: "rgba(120, 235, 107, .18)" },
  idea: { label: "Idea", color: "#FFCF75", accent: "rgba(255, 183, 77, .18)" },
};

export function categoryLabel(category: ConceptCategory) {
  return categoryMeta[category].label;
}
