export type RegisterRequest = {
  email: string;
  password: string;
};

export type LoginRequest = RegisterRequest;

export type VerifyEmailRequest = {
  token: string;
};

export type LoginResponse = {
  accessToken: string;
  tokenType: string;
  expiresIn: number;
  id: string;
  email: string;
  role: string | null;
};

export type ApiErrorResponse = {
  message?: string;
  detail?: string;
  title?: string;
};
