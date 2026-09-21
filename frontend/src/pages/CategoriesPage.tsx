import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { categoryApi, Category } from '../api/dataApi'
import Toast from '../components/Toast'

export default function CategoriesPage() {
  const { t, i18n } = useTranslation()
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [startDate, setStartDate] = useState('')
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)
  const [deletingId, setDeletingId] = useState<number | null>(null)

  useEffect(() => {
    loadCategories()
  }, [])

  const loadCategories = async () => {
    setLoading(true)
    try {
      const res = await categoryApi.list()
      setCategories(res.data.data?.data || [])
    } catch {
      setCategories([])
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setName('')
    setDescription('')
    setStartDate('')
    setEditingId(null)
    setShowForm(false)
  }

  const handleSave = async () => {
    if (!name.trim()) return
    setSaving(true)
    try {
      if (editingId) {
        await categoryApi.update(editingId, { name: name.trim(), description: description.trim() || undefined, start_date: startDate || undefined })
        setToast({ message: t('categories.updated'), type: 'success' })
      } else {
        await categoryApi.create({ name: name.trim(), description: description.trim() || undefined, start_date: startDate || undefined })
        setToast({ message: t('categories.created'), type: 'success' })
      }
      resetForm()
      loadCategories()
    } catch {
      setToast({ message: editingId ? t('categories.failedToUpdate') : t('categories.failedToCreate'), type: 'error' })
    } finally {
      setSaving(false)
    }
  }

  const handleEdit = (cat: Category) => {
    setEditingId(cat.id)
    setName(cat.name)
    setDescription(cat.description || '')
    setStartDate(cat.start_date || '')
    setShowForm(true)
  }

  const handleDelete = async (id: number) => {
    setDeletingId(id)
    try {
      await categoryApi.delete(id)
      setToast({ message: t('categories.deleted'), type: 'success' })
      loadCategories()
    } catch {
      setToast({ message: t('categories.failedToDelete'), type: 'error' })
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="min-h-screen py-8 px-4 sm:px-6 lg:px-8">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight">{t('categories.title')}</h1>
            <p className="text-gray-500 dark:text-slate-400 mt-1 text-sm">{t('categories.subtitle')}</p>
          </div>
          <button
            onClick={() => { resetForm(); setShowForm(true) }}
            className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-700 hover:to-indigo-700 text-white text-sm font-semibold rounded-xl shadow-lg shadow-brand-600/25 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            {t('categories.addCategory')}
          </button>
        </div>

        {showForm && (
          <div className="bg-white dark:bg-white/[0.03] backdrop-blur-xl border border-gray-200 dark:border-white/[0.06] rounded-2xl p-6 shadow-xl shadow-black/10 mb-6 animate-in fade-in slide-in-from-top-4 duration-300">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                {editingId ? t('categories.editCategory') : t('categories.addCategory')}
              </h3>
              <button
                onClick={resetForm}
                className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 text-gray-400 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white transition"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-[11px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wider">{t('categories.name')}</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSave()}
                  className="w-full mt-2 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-3 text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500/50 transition"
                  placeholder={t('categories.namePlaceholder')}
                  autoFocus
                />
              </div>
              <div>
                <label className="text-[11px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wider">{t('categories.description')}</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  className="w-full mt-2 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-3 text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500/50 transition resize-none"
                  placeholder={t('categories.descriptionPlaceholder')}
                />
              </div>
              <div>
                <label className="text-[11px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wider">{t('categories.startDate')}</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full mt-2 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-3 text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500/50 transition"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-5">
              <button
                onClick={handleSave}
                disabled={saving || !name.trim()}
                className="px-5 py-2.5 bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium rounded-xl transition disabled:opacity-50 flex items-center gap-1.5"
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
                onClick={resetForm}
                className="px-5 py-2.5 bg-gray-100 dark:bg-white/[0.06] hover:bg-gray-200 dark:hover:bg-white/[0.1] text-gray-600 dark:text-white/70 text-sm font-medium rounded-xl transition"
              >
                {t('common.cancel')}
              </button>
            </div>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <svg className="animate-spin w-8 h-8 text-brand-500" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
          </div>
        ) : categories.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-16 h-16 rounded-2xl bg-gray-100 dark:bg-white/5 flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-gray-400 dark:text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            </div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">{t('categories.noCategories')}</h3>
            <p className="text-gray-500 dark:text-slate-400 text-sm">{t('categories.noCategoriesHint')}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {categories.map((cat) => (
              <div
                key={cat.id}
                className="bg-white dark:bg-white/[0.03] backdrop-blur-xl border border-gray-200 dark:border-white/[0.06] rounded-2xl p-5 shadow-xl shadow-black/10 transition-all duration-300 hover:border-gray-300 dark:hover:border-white/[0.1] hover:shadow-lg group"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-brand-500/20">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                    </svg>
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => handleEdit(cat)}
                      className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 text-gray-400 dark:text-slate-400 hover:text-brand-600 dark:hover:text-brand-400 transition"
                      title={t('categories.editCategory')}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => handleDelete(cat.id)}
                      disabled={deletingId === cat.id}
                      className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-500/10 text-gray-400 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 transition disabled:opacity-50"
                      title={t('categories.deleteCategory')}
                    >
                      {deletingId === cat.id ? (
                        <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                      ) : (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>
                <h4 className="text-base font-bold text-gray-900 dark:text-white mb-1">{cat.name}</h4>
                {cat.description && (
                  <p className="text-gray-500 dark:text-slate-400 text-xs line-clamp-2">{cat.description}</p>
                )}
                {cat.start_date && (
                  <p className="text-brand-500 dark:text-brand-400 text-[11px] mt-1 font-medium">
                    {t('categories.startDate')}: {new Date(cat.start_date).toLocaleDateString(i18n.language === 'ru' ? 'ru-RU' : i18n.language === 'tj' ? 'ru-TJ' : 'en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                  </p>
                )}
                <div className="mt-3 pt-3 border-t border-gray-100 dark:border-white/[0.04] flex items-center justify-between">
                  <span className="text-[11px] text-gray-400 dark:text-slate-500">
                    {new Date(cat.created_at).toLocaleDateString(i18n.language === 'ru' ? 'ru-RU' : i18n.language === 'tj' ? 'ru-TJ' : 'en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                  </span>
                  <span className="inline-flex items-center gap-1 text-[11px] font-medium text-brand-600 dark:text-brand-400 bg-brand-50 dark:bg-brand-500/10 px-2 py-0.5 rounded-full">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                    </svg>
                    {t('categories.equipmentCount', { count: cat.equipment_count })}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
