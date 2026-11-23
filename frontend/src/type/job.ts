export type JobInterestView = {
  jobId: string;
  title: string | null;
  companyName: string | null;
  companyId: string | null;
  salary: string | null;
  experience: string | null;
  workMode: string | null;
  location: string[];
  expiredAt: string | null;
  jobUrl: string | null;
};

export type JobAdminView = {
  jobId: string;
  title: string | null;
  companyName: string | null;
  missingFields: string[];
  site: string | null;
  interestCount: string;
  ignoreCount: string;
};

export type PageResponse<T> = {
  content: T[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
  first: boolean;
  last: boolean;
  empty: boolean;
};
