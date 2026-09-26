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

export interface UserProfile {
  id: number
  email: string
  external_user_id: string
  role: string
  display_name: string | null
  avatar_url: string | null
  created_at: string
  updated_at: string
}

export interface GoogleAuthData {
  token: string
}

export const authApi = {
  sendOtp: (data: SendOtpData) => api.post<{ data: { email: string; sent_via_email: boolean; is_registered: boolean; dev_code?: string | null } }>('/auth/send-otp', data),
  verifyOtp: (data: VerifyOtpData) => api.post<{ data: { valid: boolean } }>('/auth/verify-otp', data),
  login: (data: LoginData) => api.post<{ data: TokenResponse }>('/auth/login', data),
  register: (data: RegisterData) => api.post<{ data: TokenResponse }>('/auth/register', data),
  me: () => api.get<{ data: UserProfile }>('/auth/me'),
  updateProfile: (displayName: string) =>
    api.patch<{ data: UserProfile }>('/auth/profile', { display_name: displayName }),
  updateAvatar: (file: File) => {
    const formData = new FormData()
    formData.append('file', file)
    return api.post<{ data: UserProfile }>('/auth/avatar', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },
  googleAuth: (data: GoogleAuthData) =>
    api.post<{ data: TokenResponse }>('/auth/google', data),
}
