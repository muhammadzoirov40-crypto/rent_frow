import { useState, useRef, useEffect, useCallback } from 'react'
import { authApi, UserProfile } from '../api/authApi'
import Toast from '../components/Toast'

interface AdminProfilePageProps {
  user: UserProfile
  onUserUpdate: (updatedUser: UserProfile) => void
}

function getInitials(nameOrEmail: string): string {
  if (!nameOrEmail) return 'AD'
  const parts = nameOrEmail.split(/[\s@]+/).filter(Boolean)
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
  return nameOrEmail.slice(0, 2).toUpperCase()
}

function cacheBust(url: string): string {
  const separator = url.includes('?') ? '&' : '?'
  return `${url}${separator}t=${Date.now()}`
}

export default function AdminProfilePage({ user, onUserUpdate }: AdminProfilePageProps) {
  const [profile, setProfile] = useState<UserProfile>(user)
  const [editingName, setEditingName] = useState(false)
  const [nameValue, setNameValue] = useState(user.display_name || '')
  const [savingName, setSavingName] = useState(false)
  const [showAvatarModal, setShowAvatarModal] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)
  const [isDragOver, setIsDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const initials = getInitials(profile.display_name || profile.email)
  const avatarSrc = profile.avatar_url ? cacheBust(profile.avatar_url) : null

  useEffect(() => {
    authApi.me().then((res) => {
      const data = res.data.data
      setProfile(data)
      setNameValue(data.display_name || '')
      onUserUpdate(data)
    }).catch(() => {})
  }, [])

  const handleNameSave = async () => {
    if (!nameValue.trim()) return
    setSavingName(true)
    try {
      const res = await authApi.updateProfile(nameValue.trim())
      const updated = res.data.data
      setProfile(updated)
      onUserUpdate(updated)
      setEditingName(false)
      setToast({ message: 'Profile updated successfully', type: 'success' })
    } catch (err: any) {
      setToast({ message: err.response?.data?.detail || 'Failed to update profile', type: 'error' })
    } finally {
      setSavingName(false)
    }
  }

  const validateFile = (file: File): boolean => {
    if (!['image/jpeg', 'image/jpg', 'image/png'].includes(file.type)) {
      setToast({ message: 'Only JPG, JPEG, and PNG files are allowed', type: 'error' })
      return false
    }
    if (file.size > 5 * 1024 * 1024) {
      setToast({ message: 'File size must be under 5MB', type: 'error' })
      return false
    }
    return true
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!validateFile(file)) return
    setSelectedFile(file)
    setPreviewUrl(URL.createObjectURL(file))
    setShowAvatarModal(true)
  }

  const handleAvatarUpload = async () => {
    if (!selectedFile) return
    setUploadingAvatar(true)
    try {
      const res = await authApi.updateAvatar(selectedFile)
      const updated = res.data.data
      setProfile(updated)
      onUserUpdate(updated)
      setShowAvatarModal(false)
      setSelectedFile(null)
      setPreviewUrl(null)
      if (fileInputRef.current) fileInputRef.current.value = ''
      setToast({ message: 'Avatar updated successfully', type: 'success' })
    } catch (err: any) {
      setToast({ message: err.response?.data?.detail || 'Failed to upload avatar', type: 'error' })
    } finally {
      setUploadingAvatar(false)
    }
  }

  const closeAvatarModal = () => {
    setShowAvatarModal(false)
    setSelectedFile(null)
    setPreviewUrl(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    const file = e.dataTransfer.files[0]
    if (!file) return
    if (!validateFile(file)) return
    setSelectedFile(file)
    setPreviewUrl(URL.createObjectURL(file))
    setShowAvatarModal(true)
  }, [])

  return (
    <div className="min-h-screen py-8 px-4 sm:px-6 lg:px-8">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-extrabold text-white tracking-tight">Admin Profile</h1>
          <p className="text-slate-400 mt-1 text-sm">Manage your account settings and preferences</p>
        </div>

        {/* Main Profile Card */}
        <div className="bg-white/[0.03] backdrop-blur-xl border border-white/[0.06] rounded-2xl overflow-hidden shadow-2xl shadow-black/30">
          {/* Cover Banner */}
          <div className="h-40 bg-gradient-to-r from-brand-600/30 via-blue-600/20 to-indigo-600/30 relative overflow-hidden">
            <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wMyI+PHBhdGggZD0iTTM2IDM0djItSDI0di0yaDEyem0wLTRWMjhIMjR2Mmgxem0tMSA5bDktOS0xLjQtMS40TDI0IDI5LjJ2Mi44aDEydi0yLjhsLTkuNC05LjRMMTIgMjRIMHY4aDEweiIvPjwvZz48L2c+PC9zdmc+')] opacity-40" />
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-slate-950/60" />
          </div>

          {/* Avatar Section */}
          <div className="px-8 pb-8 -mt-16 relative">
            <div className="flex flex-col sm:flex-row items-center sm:items-end gap-5">
              {/* Avatar with Camera Overlay */}
              <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                {avatarSrc ? (
                  <img
                    src={avatarSrc}
                    alt="Admin avatar"
                    className="w-28 h-28 rounded-2xl object-cover border-4 border-slate-900 shadow-xl ring-2 ring-white/10 transition-transform duration-300 group-hover:scale-105"
                  />
                ) : (
                  <div className="w-28 h-28 rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center border-4 border-slate-900 shadow-xl ring-2 ring-white/10 transition-transform duration-300 group-hover:scale-105">
                    <span className="text-white text-3xl font-extrabold select-none">{initials}</span>
                  </div>
                )}
                {/* Camera Overlay */}
                <div className="absolute inset-0 rounded-2xl bg-black/60 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 border-4 border-slate-900">
                  <div className="text-center">
                    <svg className="w-7 h-7 text-white mx-auto mb-1 drop-shadow-lg" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <span className="text-xs font-semibold text-white/90 drop-shadow-lg">Change</span>
                  </div>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/jpg,image/png"
                  className="hidden"
                  onChange={handleFileSelect}
                />
              </div>

              {/* Name & Role */}
              <div className="flex-1 text-center sm:text-left pb-1">
                <h2 className="text-xl font-bold text-white">
                  {profile.display_name || 'Admin User'}
                </h2>
                <p className="text-slate-400 text-sm mt-0.5">{profile.email}</p>
                <div className="flex items-center gap-2 mt-2 justify-center sm:justify-start">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[11px] font-bold uppercase tracking-wider bg-brand-500/15 text-brand-400 border border-brand-500/20">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                    </svg>
                    {profile.role}
                  </span>
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[11px] font-bold uppercase tracking-wider bg-emerald-500/15 text-emerald-400 border border-emerald-500/20">
                    <span className="relative flex h-1.5 w-1.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
                    </span>
                    Active
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pb-1">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-2 px-4 py-2.5 bg-white/[0.06] hover:bg-white/[0.1] border border-white/[0.08] rounded-xl text-sm font-medium text-white transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  Change Avatar
                </button>
                <button
                  onClick={() => {
                    setEditingName(true)
                    setNameValue(profile.display_name || '')
                  }}
                  className="flex items-center gap-2 px-4 py-2.5 bg-brand-600/15 hover:bg-brand-600/25 border border-brand-500/20 rounded-xl text-sm font-medium text-brand-400 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  Edit Profile
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Details Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-6">
          {/* Personal Information Card */}
          <div className="bg-white/[0.03] backdrop-blur-xl border border-white/[0.06] rounded-2xl p-6 shadow-xl shadow-black/10 transition-all duration-300 hover:border-white/[0.1]">
            <h3 className="text-lg font-bold text-white mb-5 flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-brand-500/15 flex items-center justify-center">
                <svg className="w-4 h-4 text-brand-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              Personal Information
            </h3>
            <div className="space-y-5">
              {/* Full Name */}
              <div>
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Full Name</label>
                {editingName ? (
                  <div className="mt-2 flex gap-2">
                    <input
                      type="text"
                      value={nameValue}
                      onChange={(e) => setNameValue(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleNameSave()}
                      className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500/50 transition"
                      placeholder="Enter your name"
                      autoFocus
                    />
                    <button
                      onClick={handleNameSave}
                      disabled={savingName || !nameValue.trim()}
                      className="px-3 py-2 bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium rounded-lg transition disabled:opacity-50 flex items-center gap-1.5"
                    >
                      {savingName ? (
                        <>
                          <svg className="animate-spin w-3.5 h-3.5" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                          </svg>
                          Saving
                        </>
                      ) : 'Save'}
                    </button>
                    <button
                      onClick={() => { setEditingName(false); setNameValue(profile.display_name || '') }}
                      className="px-3 py-2 bg-white/[0.06] hover:bg-white/[0.1] text-white/70 text-sm font-medium rounded-lg transition"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <p className="text-white text-sm mt-2 font-medium">
                    {profile.display_name || <span className="text-slate-500 italic">Not set</span>}
                  </p>
                )}
              </div>

              {/* Email */}
              <div>
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Email</label>
                <p className="text-white text-sm mt-2 font-medium">{profile.email}</p>
              </div>

              {/* User ID */}
              <div>
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">User ID</label>
                <p className="text-slate-400 text-xs mt-2 font-mono bg-white/5 px-2.5 py-1.5 rounded-md inline-block">{profile.external_user_id}</p>
              </div>
            </div>
          </div>

          {/* Account Details Card */}
          <div className="bg-white/[0.03] backdrop-blur-xl border border-white/[0.06] rounded-2xl p-6 shadow-xl shadow-black/10 transition-all duration-300 hover:border-white/[0.1]">
            <h3 className="text-lg font-bold text-white mb-5 flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-brand-500/15 flex items-center justify-center">
                <svg className="w-4 h-4 text-brand-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              Account Details
            </h3>
            <div className="space-y-5">
              {/* Role */}
              <div>
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Role</label>
                <div className="mt-2">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider bg-brand-500/15 text-brand-400 border border-brand-500/20">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                    </svg>
                    {profile.role}
                  </span>
                </div>
              </div>

              {/* Account Status */}
              <div>
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Account Status</label>
                <div className="mt-2 flex items-center gap-2">
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
                  </span>
                  <span className="text-emerald-400 text-sm font-semibold">Active</span>
                </div>
              </div>

              {/* Last Login */}
              <div>
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Last Login</label>
                <p className="text-white text-sm mt-2 font-medium">
                  {new Date(profile.updated_at).toLocaleString('en-US', {
                    dateStyle: 'medium',
                    timeStyle: 'short',
                  })}
                </p>
              </div>

              {/* Member Since */}
              <div>
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Member Since</label>
                <p className="text-white text-sm mt-2 font-medium">
                  {new Date(profile.created_at).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Avatar Upload Modal */}
      {showAvatarModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200"
            onClick={closeAvatarModal}
          />

          {/* Modal */}
          <div className="relative bg-slate-900 border border-white/10 rounded-2xl shadow-2xl shadow-black/40 w-full max-w-md overflow-hidden animate-in zoom-in-95 fade-in duration-200">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/5">
              <h3 className="text-lg font-bold text-white">Update Avatar</h3>
              <button
                onClick={closeAvatarModal}
                className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Preview */}
            <div className="px-6 py-6">
              <div
                className="flex flex-col items-center"
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                {previewUrl ? (
                  <div className="relative">
                    <img
                      src={previewUrl}
                      alt="Avatar preview"
                      className="w-32 h-32 rounded-2xl object-cover border-2 border-white/10 shadow-xl"
                    />
                    <button
                      onClick={() => {
                        setSelectedFile(null)
                        setPreviewUrl(null)
                      }}
                      className="absolute -top-2 -right-2 p-1.5 bg-red-500/80 hover:bg-red-500 rounded-full text-white transition shadow-lg"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ) : (
                  <div
                    className={`w-32 h-32 rounded-2xl border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-all duration-200 ${
                      isDragOver
                        ? 'border-brand-500 bg-brand-500/10'
                        : 'border-white/15 hover:border-brand-500/50 hover:bg-white/[0.03]'
                    }`}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <svg className={`w-8 h-8 mb-2 transition-colors ${isDragOver ? 'text-brand-400' : 'text-slate-500'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <span className={`text-xs font-medium transition-colors ${isDragOver ? 'text-brand-400' : 'text-slate-500'}`}>
                      {isDragOver ? 'Drop here' : 'Drop or click'}
                    </span>
                  </div>
                )}

                <p className="text-xs text-slate-500 mt-3 text-center">
                  JPG, JPEG, or PNG. Max 5MB.
                </p>
              </div>
            </div>

            {/* Footer */}
            <div className="flex gap-3 px-6 py-4 border-t border-white/5 bg-white/[0.02]">
              <button
                onClick={closeAvatarModal}
                className="flex-1 px-4 py-2.5 bg-white/[0.06] hover:bg-white/[0.1] text-white/70 text-sm font-medium rounded-xl transition"
              >
                Cancel
              </button>
              <button
                onClick={handleAvatarUpload}
                disabled={!selectedFile || uploadingAvatar}
                className="flex-1 px-4 py-2.5 bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium rounded-xl transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-brand-600/20"
              >
                {uploadingAvatar ? (
                  <>
                    <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Uploading...
                  </>
                ) : (
                  'Save Avatar'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
