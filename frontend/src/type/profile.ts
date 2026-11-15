export type ProfileOption = {
  id: string;
  name: string;
};

export type QualificationOption = ProfileOption & { level: number };

export type WorkExperienceInput = {
  companyName: string;
  posId: string;
  startAt: string;
  endAt: string | null;
};

export type DegreeInput = {
  degMajor: string;
  degInstitution: string;
  degSignedBy: string;
  degIssuedAt: string;
  qualId: string;
  degImage: File;
};

export type ProfileOnboardingRequest = {
  exptSalMin: number | null;
  skillIds: string[];
  locIds: string[];
  wmIds: string[];
  posIds: string[];
  workExperiences: WorkExperienceInput[];
  degrees: DegreeInput[];
};

export type ProfileOnboardingOptions = {
  skills: ProfileOption[];
  positions: ProfileOption[];
  locations: ProfileOption[];
  workModes: ProfileOption[];
  qualifications: QualificationOption[];
};
