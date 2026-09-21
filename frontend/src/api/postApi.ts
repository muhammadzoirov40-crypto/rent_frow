import api from './client'

export interface Post {
  id: number
  user_id: number
  category_id: number | null
  category_name: string | null
  title: string
  content: string
  image_url: string | null
  likes_count: number
  comments_count: number
  author_name: string | null
  author_avatar: string | null
  created_at: string
  updated_at: string
}

export interface CreatePostData {
  title: string
  content: string
  image_url?: string
  category_id?: number | null
}

export interface UpdatePostData {
  title?: string
  content?: string
  image_url?: string
  category_id?: number | null
}

export const postApi = {
  list: (params?: { user_id?: number; skip?: number; limit?: number }) =>
    api.get<{ data: Post[] }>('/posts', {
      params,
      headers: { 'X-Skip-Auth-Redirect': 'true' },
    }),

  get: (id: number) =>
    api.get<{ data: Post }>(`/posts/${id}`),

  create: (data: CreatePostData) =>
    api.post<{ data: Post }>('/posts', data),

  update: (id: number, data: UpdatePostData) =>
    api.put<{ data: Post }>(`/posts/${id}`, data),

  delete: (id: number) =>
    api.delete(`/posts/${id}`),

  like: (id: number) =>
    api.post<{ data: Post }>(`/posts/${id}/like`),

  uploadImage: (file: File) => {
    const formData = new FormData()
    formData.append('file', file)
    return api.post<{ data: { image_url: string; image_key: string } }>('/posts/upload-image', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },
}
