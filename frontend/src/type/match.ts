export type MatchAction = "interest" | "ignore";

export type MatchingView = {
  jobId: string;
  companyId: string | null;
  companyName: string | null;
  jobTitle: string | null;
  matchScore: number | null;
  location: string | null;
  workMode: string | null;
  salary: string | null;
  experience: string | null;
  match: string[];
  unmatch: string[];
  jobExpDate: string | null;
};

export type JobDetailView = {
  title: string | null;
  companyName: string | null;
  companyId: string | null;
  salary: string | null;
  experience: string | null;
  description: string | null;
  requirements: string | null;
  benefits: string | null;
  location: string[];
  workMode: string | null;
  skills: string[];
  position: string | null;
  qualification: string | null;
  postedAt: string | null;
  expiredAt: string | null;
  jobUrl: string | null;
};

export type MatchResponse = {
  matches: MatchingView[];
  missingProfileFields: string[];
};
