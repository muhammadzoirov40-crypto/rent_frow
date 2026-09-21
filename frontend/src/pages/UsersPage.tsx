import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { adminUserApi, AdminUser } from '../api/dataApi'
import Toast from '../components/Toast'

function getInitials(nameOrEmail: string): string {
  if (!nameOrEmail) return '??'
  const parts = nameOrEmail.split(/[\s@]+/).filter(Boolean)
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
  return nameOrEmail.slice(0, 2).toUpperCase()
}

export default function UsersPage() {
  const { t } = useTranslation()
  const [users, setUsers] = useState<AdminUser[]>([])
  const [loading, setLoading] = useState(true)
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null)
  const [editName, setEditName] = useState('')
  const [editRole, setEditRole] = useState('')
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

  useEffect(() => {
    loadUsers()
  }, [])

  const loadUsers = async () => {
    setLoading(true)
    try {
      const res = await adminUserApi.list({ limit: 100 })
      setUsers(res.data.data || [])
    } catch {
      setUsers([])
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = (user: AdminUser) => {
    setEditingUser(user)
    setEditName(user.display_name || '')
    setEditRole(user.role)
  }

  const handleSave = async () => {
    if (!editingUser) return
    setSaving(true)
    try {
      await adminUserApi.update(editingUser.id, {
        display_name: editName.trim() || undefined,
        role: editRole,
      })
      setToast({ message: t('users.updated'), type: 'success' })
      setEditingUser(null)
      loadUsers()
    } catch {
      setToast({ message: t('users.failedToUpdate'), type: 'error' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen py-8 px-4 sm:px-6 lg:px-8">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <div className="max-w-5xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight">{t('users.title')}</h1>
          <p className="text-gray-500 dark:text-slate-400 mt-1 text-sm">{t('users.subtitle')}</p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <svg className="animate-spin w-8 h-8 text-brand-500" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
          </div>
        ) : users.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-16 h-16 rounded-2xl bg-gray-100 dark:bg-white/5 flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-gray-400 dark:text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">{t('users.noUsers')}</h3>
          </div>
        ) : (
          <>
            <p className="text-sm text-gray-500 dark:text-slate-400 mb-4">{t('users.total', { count: users.length })}</p>
            <div className="space-y-3">
              {users.map((user) => (
                <div
                  key={user.id}
                  className="bg-white dark:bg-white/[0.03] backdrop-blur-xl border border-gray-200 dark:border-white/[0.06] rounded-2xl p-5 shadow-xl shadow-black/10 transition-all duration-300 hover:border-gray-300 dark:hover:border-white/[0.1]"
                >
                  {editingUser?.id === user.id ? (
                    <div className="space-y-4">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-brand-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-brand-500/20 shrink-0">
                          <span className="text-white text-sm font-bold">{getInitials(editName || user.email)}</span>
                        </div>
                        <div className="flex-1">
                          <label className="text-[11px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wider">{t('users.name')}</label>
                          <input
                            type="text"
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            className="w-full mt-1 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-2.5 text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500/50 transition"
                            placeholder={t('users.namePlaceholder')}
                            autoFocus
                          />
                        </div>
                        <div className="shrink-0">
                          <label className="text-[11px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wider">{t('users.role')}</label>
                          <select
                            value={editRole}
                            onChange={(e) => setEditRole(e.target.value)}
                            className="mt-1 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-2.5 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500/50 transition"
                          >
                            <option value="CUSTOMER">{t('users.customer')}</option>
                            <option value="ADMIN">{t('users.admin')}</option>
                          </select>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={handleSave}
                          disabled={saving}
                          className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium rounded-xl transition disabled:opacity-50 flex items-center gap-1.5"
                        >
                          {saving ? (
                            <>
                              <svg className="animate-spin w-3.5 h-3.5" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                              </svg>
                              {t('common.save')}...
                            </>
                          ) : t('common.save')}
                        </button>
                        <button
                          onClick={() => setEditingUser(null)}
                          className="px-4 py-2 bg-gray-100 dark:bg-white/[0.06] hover:bg-gray-200 dark:hover:bg-white/[0.1] text-gray-600 dark:text-white/70 text-sm font-medium rounded-xl transition"
                        >
                          {t('common.cancel')}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-4">
                      {user.avatar_url ? (
                        <img
                          src={user.avatar_url}
                          alt={user.display_name || user.email}
                          className="w-12 h-12 rounded-xl object-cover border border-gray-300 dark:border-white/10 shrink-0"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-brand-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-brand-500/20 shrink-0">
                          <span className="text-white text-sm font-bold">{getInitials(user.display_name || user.email)}</span>
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-base font-bold text-gray-900 dark:text-white truncate">
                          {user.display_name || <span className="text-gray-400 dark:text-slate-500 italic">{user.email}</span>}
                        </p>
                        <p className="text-sm text-gray-500 dark:text-slate-400 truncate">{user.email}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-[11px] font-bold uppercase tracking-wider border ${
                          user.role === 'ADMIN'
                            ? 'bg-brand-500/15 text-brand-600 dark:text-brand-400 border-brand-500/20'
                            : 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                        }`}>
                          {user.role === 'ADMIN' ? t('users.admin') : t('users.customer')}
                        </span>
                        <span className="text-xs text-gray-400 dark:text-slate-500">
                          {new Date(user.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                        </span>
                        <button
                          onClick={() => handleEdit(user)}
                          className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-white/10 text-gray-400 dark:text-slate-400 hover:text-brand-600 dark:hover:text-brand-400 transition"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
