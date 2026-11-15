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
  id?: string;
  degMajor: string;
  degInstitution: string;
  degSignedBy: string;
  degIssuedAt: string;
  qualId: string;
  degImage?: File;
};

export type ProfileWorkExperience = {
  company: ProfileOption;
  position: ProfileOption;
  startAt: string;
  endAt: string | null;
};

export type ProfileDegree = {
  id: string;
  degMajor: string;
  degInstitution: string;
  degSignedBy: string;
  degImgPath: string;
  degIssuedAt: string;
  qual: ProfileOption;
};

export type ProfileView = {
  exptSalMin: number | null;
  skill: ProfileOption[];
  loc: ProfileOption[];
  wm: ProfileOption[];
  pos: ProfileOption[];
  workExperiences: ProfileWorkExperience[];
  degrees: ProfileDegree[];
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
