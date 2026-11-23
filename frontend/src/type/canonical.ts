export type CanonicalKind = "skill" | "position" | "location" | "work-mode";

export type CanonicalItemView = {
  id: string;
  name: string;
  type: CanonicalKind;
  jobCount: number;
  rawCount: number;
};

export type CanonicalUpdateRequest = {
  name: string;
  targetType: CanonicalKind;
};
