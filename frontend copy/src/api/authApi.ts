import api from './client'

export interface SendOtpData {
  email: string
}

export interface VerifyOtpData {
  email: string
  code: string
}

export interface LoginData {
  email: string
  otp_code: string
}

export interface RegisterData {
  email: string
  role?: 'CUSTOMER' | 'ADMIN'
  otp_code: string
}

export interface TokenResponse {
  access_token: string
  token_type: string
  user: { id: number; email: string; role: string }
}

export const authApi = {
  sendOtp: (data: SendOtpData) => api.post<{ data: { email: string; sent_via_email: boolean; is_registered: boolean } }>('/auth/send-otp', data),
  verifyOtp: (data: VerifyOtpData) => api.post<{ data: { valid: boolean } }>('/auth/verify-otp', data),
  login: (data: LoginData) => api.post<{ data: TokenResponse }>('/auth/login', data),
  register: (data: RegisterData) => api.post<{ data: TokenResponse }>('/auth/register', data),
  me: () => api.get('/auth/me'),
}
