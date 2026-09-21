import api from './client'

export interface Comment {
  id: number
  post_id: number
  user_id: number
  content: string
  author_name: string | null
  author_avatar: string | null
  created_at: string
  updated_at: string
}

export interface CreateCommentData {
  content: string
}

export const commentApi = {
  list: (postId: number, params?: { skip?: number; limit?: number }) =>
    api.get<{ data: Comment[] }>(`/posts/${postId}/comments`, { params }),

  create: (postId: number, data: CreateCommentData) =>
    api.post<{ data: Comment }>(`/posts/${postId}/comments`, data),

  update: (postId: number, commentId: number, data: CreateCommentData) =>
    api.put<{ data: Comment }>(`/posts/${postId}/comments/${commentId}`, data),

  delete: (postId: number, commentId: number) =>
    api.delete(`/posts/${postId}/comments/${commentId}`),
}
