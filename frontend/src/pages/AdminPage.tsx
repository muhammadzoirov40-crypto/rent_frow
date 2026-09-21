import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import {
  LayoutDashboard, Users, FileText, ClipboardList, FolderTree,
  Shield, Ban, CheckCircle, Trash2, Eye, Search, X, Plus,
  ChevronLeft, ChevronRight, BarChart3, TrendingUp, Clock, AlertTriangle, ImageIcon,
} from 'lucide-react';
import toast from 'react-hot-toast';
import client from '../api/client';
import type { User, Listing, RentalRequest, Category } from '../api';

interface AdminStats {
  totalUsers: number;
  activeListings: number;
  rentalRequests: number;
  completedRentals: number;
}

const adminApi = {
  getStats: () => client.get<{ data: { data: AdminStats } }>('/admin/stats').then((r) => r.data.data),
  getUsers: () => client.get<{ data: { data: User[] } }>('/admin/users').then((r) => r.data.data),
  blockUser: (id: number) => client.put(`/admin/users/${id}/block`).then((r) => r.data),
  unblockUser: (id: number) => client.put(`/admin/users/${id}/unblock`).then((r) => r.data),
  verifyUser: (id: number) => client.put(`/admin/users/${id}/verify`).then((r) => r.data),
  getListings: () => client.get<{ data: { data: Listing[] } }>('/admin/listings').then((r) => r.data.data),
  approveListing: (id: number) => client.put(`/admin/listings/${id}/approve`).then((r) => r.data),
  rejectListing: (id: number) => client.put(`/admin/listings/${id}/reject`).then((r) => r.data),
  deleteListing: (id: number) => client.delete(`/admin/listings/${id}`).then((r) => r.data),
  getRequests: () => client.get<{ data: { data: RentalRequest[] } }>('/admin/requests').then((r) => r.data.data),
  getCategories: () => client.get<{ data: { data: Category[] } }>('/categories').then((r) => r.data.data),
  createCategory: (data: { name: string }) => client.post('/categories', data).then((r) => r.data),
  updateCategory: (id: number, data: { name: string }) => client.put(`/categories/${id}`, data).then((r) => r.data),
  deleteCategory: (id: number) => client.delete(`/categories/${id}`).then((r) => r.data),
};

const fallbackStats: AdminStats = {
  totalUsers: 1284,
  activeListings: 367,
  rentalRequests: 89,
  completedRentals: 2453,
};

const fallbackUsers: User[] = [
  { id: 1, email: 'ali@example.com', role: 'admin', display_name: 'Алишер Сатторов', avatar_url: '', created_at: '2025-01-15T10:00:00Z' },
  { id: 2, email: 'farhod@example.com', role: 'user', display_name: 'Фарход Назаров', avatar_url: '', created_at: '2025-03-20T14:30:00Z' },
  { id: 3, email: 'dilshod@example.com', role: 'user', display_name: 'Дилшод Раҳимов', avatar_url: '', created_at: '2025-06-10T08:15:00Z' },
  { id: 4, email: 'nikolay@example.com', role: 'user', display_name: 'Николай Петров', avatar_url: '', created_at: '2025-07-05T11:45:00Z' },
  { id: 5, email: 'maria@example.com', role: 'user', display_name: 'Мария Иванова', avatar_url: '', created_at: '2025-08-01T09:20:00Z' },
];

const fallbackListings: Listing[] = [
  { id: 1, title: 'Квартира в центре Душанбе', description: '', price: 800, price_unit: 'per_day', category_id: 1, city_id: 1, district_id: 1, owner_id: 2, images: [], status: 'ACTIVE', is_verified: true, views_count: 0, rating_sum: 0, rating_count: 0, created_at: '2025-08-10T10:00:00Z', updated_at: '2025-08-10T10:00:00Z' } as any,
  { id: 2, title: 'Toyota Camry 2023', description: '', price: 150, price_unit: 'per_day', category_id: 2, city_id: 1, district_id: 2, owner_id: 3, images: [], status: 'ACTIVE', is_verified: true, views_count: 0, rating_sum: 0, rating_count: 0, created_at: '2025-08-12T14:30:00Z', updated_at: '2025-08-12T14:30:00Z' } as any,
  { id: 3, title: 'Перфоратор Makita', description: '', price: 80, price_unit: 'per_day', category_id: 3, city_id: 2, district_id: 1, owner_id: 4, images: [], status: 'PAUSED', is_verified: false, views_count: 0, rating_sum: 0, rating_count: 0, created_at: '2025-08-15T08:00:00Z', updated_at: '2025-08-15T08:00:00Z' } as any,
  { id: 4, title: 'Зал для мероприятий', description: '', price: 500, price_unit: 'per_day', category_id: 4, city_id: 1, district_id: 3, owner_id: 5, images: [], status: 'ACTIVE', is_verified: true, views_count: 0, rating_sum: 0, rating_count: 0, created_at: '2025-08-20T16:00:00Z', updated_at: '2025-08-20T16:00:00Z' } as any,
];

const fallbackRequests: RentalRequest[] = [
  { id: 1, listing_id: 1, renter_id: 3, owner_id: 2, status: 'PENDING', start_date: '2025-09-01', end_date: '2025-09-30', total_days: 29, total_price: 23200, deposit_amount: 0, message: null, owner_response: null, created_at: '2025-08-25T10:00:00Z', updated_at: '2025-08-25T10:00:00Z', listing_title: null, renter_name: null, owner_name: null },
  { id: 2, listing_id: 2, renter_id: 4, owner_id: 3, status: 'ACCEPTED', start_date: '2025-09-05', end_date: '2025-09-12', total_days: 7, total_price: 1050, deposit_amount: 0, message: null, owner_response: null, created_at: '2025-08-22T14:00:00Z', updated_at: '2025-08-22T14:00:00Z', listing_title: null, renter_name: null, owner_name: null },
  { id: 3, listing_id: 3, renter_id: 5, owner_id: 4, status: 'REJECTED', start_date: '2025-09-10', end_date: '2025-09-15', total_days: 5, total_price: 400, deposit_amount: 0, message: null, owner_response: null, created_at: '2025-08-20T09:00:00Z', updated_at: '2025-08-20T09:00:00Z', listing_title: null, renter_name: null, owner_name: null },
];

const fallbackCategories: Category[] = [
  { id: 1, name: 'Недвижимость', name_tj: null, description: null, icon: null, image_url: null, is_active: true, sort_order: 0, created_at: '2025-01-01T00:00:00Z', subcategories: [] },
  { id: 2, name: 'Транспорт', name_tj: null, description: null, icon: null, image_url: null, is_active: true, sort_order: 0, created_at: '2025-01-01T00:00:00Z', subcategories: [] },
  { id: 3, name: 'Инструменты', name_tj: null, description: null, icon: null, image_url: null, is_active: true, sort_order: 0, created_at: '2025-01-01T00:00:00Z', subcategories: [] },
  { id: 4, name: 'Мероприятия', name_tj: null, description: null, icon: null, image_url: null, is_active: true, sort_order: 0, created_at: '2025-01-01T00:00:00Z', subcategories: [] },
  { id: 5, name: 'Электроника', name_tj: null, description: null, icon: null, image_url: null, is_active: true, sort_order: 0, created_at: '2025-01-01T00:00:00Z', subcategories: [] },
];

type TabKey = 'dashboard' | 'users' | 'listings' | 'requests' | 'categories';

function StatusBadge({ status, t }: { status: string; t: (key: string) => string }) {
  const styles: Record<string, string> = {
    pending: 'bg-amber-50 text-amber-700 border border-amber-200',
    accepted: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
    rejected: 'bg-red-50 text-red-700 border border-red-200',
    cancelled: 'bg-gray-100 text-gray-600 border border-gray-200',
    active: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
    inactive: 'bg-gray-100 text-gray-600 border border-gray-200',
    blocked: 'bg-red-50 text-red-700 border border-red-200',
  };
  const labelKeys: Record<string, string> = {
    pending: 'admin.pending',
    accepted: 'admin.accepted',
    rejected: 'admin.rejected',
    cancelled: 'admin.cancelled',
    active: 'admin.active',
    inactive: 'admin.active',
    blocked: 'admin.blocked',
  };
  return (
    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${styles[status] || styles.pending}`}>
      {t(labelKeys[status] || status)}
    </span>
  );
}

export default function AdminPage() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<TabKey>('dashboard');
  const [searchQuery, setSearchQuery] = useState('');
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [categoryName, setCategoryName] = useState('');
  const queryClient = useQueryClient();

  const { data: stats, isLoading: statsLoading } = useQuery<AdminStats>({
    queryKey: ['admin-stats'],
    queryFn: adminApi.getStats,
    placeholderData: fallbackStats,
    meta: { usePlaceholder: true },
  });

  const { data: users = fallbackUsers, isLoading: usersLoading } = useQuery({
    queryKey: ['admin-users'],
    queryFn: adminApi.getUsers,
    placeholderData: fallbackUsers,
  });

  const { data: listings = fallbackListings, isLoading: listingsLoading } = useQuery({
    queryKey: ['admin-listings'],
    queryFn: adminApi.getListings,
    placeholderData: fallbackListings,
  });

  const { data: requests = fallbackRequests, isLoading: requestsLoading } = useQuery({
    queryKey: ['admin-requests'],
    queryFn: adminApi.getRequests,
    placeholderData: fallbackRequests,
  });

  const { data: categories = fallbackCategories, isLoading: categoriesLoading } = useQuery({
    queryKey: ['admin-categories'],
    queryFn: adminApi.getCategories,
    placeholderData: fallbackCategories,
  });

  const blockMutation = useMutation({
    mutationFn: adminApi.blockUser,
    onSuccess: () => { toast.success(t('admin.blockedSuccess')); queryClient.invalidateQueries({ queryKey: ['admin-users'] }); },
    onError: () => toast.error(t('admin.failedAction')),
  });

  const unblockMutation = useMutation({
    mutationFn: adminApi.unblockUser,
    onSuccess: () => { toast.success(t('admin.unblockedSuccess')); queryClient.invalidateQueries({ queryKey: ['admin-users'] }); },
    onError: () => toast.error(t('admin.failedAction')),
  });

  const verifyMutation = useMutation({
    mutationFn: adminApi.verifyUser,
    onSuccess: () => { toast.success(t('admin.verifiedSuccess')); queryClient.invalidateQueries({ queryKey: ['admin-users'] }); },
    onError: () => toast.error(t('admin.failedAction')),
  });

  const approveMutation = useMutation({
    mutationFn: adminApi.approveListing,
    onSuccess: () => { toast.success(t('admin.approvedSuccess')); queryClient.invalidateQueries({ queryKey: ['admin-listings'] }); },
    onError: () => toast.error(t('admin.failedAction')),
  });

  const rejectMutation = useMutation({
    mutationFn: adminApi.rejectListing,
    onSuccess: () => { toast.success(t('admin.rejectedSuccess')); queryClient.invalidateQueries({ queryKey: ['admin-listings'] }); },
    onError: () => toast.error(t('admin.failedAction')),
  });

  const deleteListingMutation = useMutation({
    mutationFn: adminApi.deleteListing,
    onSuccess: () => { toast.success(t('admin.deletedSuccess')); queryClient.invalidateQueries({ queryKey: ['admin-listings'] }); },
    onError: () => toast.error(t('admin.failedAction')),
  });

  const saveCategoryMutation = useMutation({
    mutationFn: ({ id, data }: { id?: number; data: { name: string } }) =>
      id ? adminApi.updateCategory(id, data) : adminApi.createCategory(data),
    onSuccess: () => {
      toast.success(t('admin.categorySaved'));
      queryClient.invalidateQueries({ queryKey: ['admin-categories'] });
      closeCategoryModal();
    },
    onError: () => toast.error(t('admin.failedAction')),
  });

  const deleteCategoryMutation = useMutation({
    mutationFn: adminApi.deleteCategory,
    onSuccess: () => { toast.success(t('admin.categoryDeleted')); queryClient.invalidateQueries({ queryKey: ['admin-categories'] }); },
    onError: () => toast.error(t('admin.failedAction')),
  });

  const closeCategoryModal = () => {
    setShowCategoryModal(false);
    setEditingCategory(null);
    setCategoryName('');
  };

  const openEditCategory = (cat: Category) => {
    setEditingCategory(cat);
    setCategoryName(cat.name);
    setShowCategoryModal(true);
  };

  const handleSaveCategory = () => {
    if (!categoryName.trim()) {
      toast.error(t('admin.fillAllFields'));
      return;
    }
    saveCategoryMutation.mutate({
      id: editingCategory?.id,
      data: { name: categoryName.trim() },
    });
  };

  const filteredUsers = users.filter(
    (u) => u.display_name.toLowerCase().includes(searchQuery.toLowerCase()) || u.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredListings = listings.filter((l) => l.title.toLowerCase().includes(searchQuery.toLowerCase()));

  const filteredRequests = requests.filter((r) => {
    const listing = listings.find((l) => l.id === r.listing_id);
    return listing?.title.toLowerCase().includes(searchQuery.toLowerCase()) || false;
  });

  const tabs: { key: TabKey; label: string; icon: React.ReactNode }[] = [
    { key: 'dashboard', label: t('admin.overview'), icon: <LayoutDashboard className="w-5 h-5" /> },
    { key: 'users', label: t('admin.users'), icon: <Users className="w-5 h-5" /> },
    { key: 'listings', label: t('admin.listings'), icon: <FileText className="w-5 h-5" /> },
    { key: 'requests', label: t('admin.requests'), icon: <ClipboardList className="w-5 h-5" /> },
    { key: 'categories', label: t('admin.categories'), icon: <FolderTree className="w-5 h-5" /> },
  ];

  const statCards = [
    { label: t('admin.platformStats') || t('admin.overview'), value: stats?.totalUsers ?? 0, icon: <Users className="w-6 h-6" />, color: 'from-blue-500 to-indigo-600', shadow: 'shadow-blue-500/20' },
    { label: t('admin.activeListings') || t('admin.overview'), value: stats?.activeListings ?? 0, icon: <FileText className="w-6 h-6" />, color: 'from-emerald-500 to-teal-600', shadow: 'shadow-emerald-500/20' },
    { label: t('admin.rentalRequests') || t('admin.overview'), value: stats?.rentalRequests ?? 0, icon: <ClipboardList className="w-6 h-6" />, color: 'from-amber-500 to-orange-600', shadow: 'shadow-amber-500/20' },
    { label: t('admin.completedRentals') || t('admin.overview'), value: stats?.completedRentals ?? 0, icon: <TrendingUp className="w-6 h-6" />, color: 'from-purple-500 to-pink-600', shadow: 'shadow-purple-500/20' },
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0f0f23]">
      <div className="flex">
        <aside className="w-64 flex-shrink-0 bg-white dark:bg-[#1A1A2E] border-r border-gray-200 dark:border-white/10 min-h-[calc(100vh-4rem)] sticky top-16">
          <div className="p-6">
            <div className="flex items-center gap-3 mb-8">
              <div className="w-10 h-10 bg-gradient-to-br from-[#FF6B35] to-[#1A1A2E] rounded-xl flex items-center justify-center">
                <Shield className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="font-bold text-gray-900 dark:text-white text-sm">{t('admin.panel')}</h2>
                <p className="text-[11px] text-gray-500">{t('admin.platformManagement')}</p>
              </div>
            </div>
            <nav className="space-y-1">
              {tabs.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => { setActiveTab(tab.key); setSearchQuery(''); }}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition ${
                    activeTab === tab.key
                      ? 'bg-[#FF6B35]/10 text-[#FF6B35]'
                      : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5 hover:text-gray-900 dark:hover:text-white'
                  }`}
                >
                  {tab.icon}
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>
        </aside>

        <main className="flex-1 p-6">
          {activeTab === 'dashboard' && (
            <div>
              <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('admin.overview')}</h1>
                <p className="text-sm text-gray-500 mt-0.5">{t('admin.platformStats')}</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                {statCards.map((card) => (
                  <div key={card.label} className="bg-white dark:bg-[#1A1A2E] rounded-2xl p-5 border border-gray-200 dark:border-white/10 shadow-sm">
                    <div className="flex items-center justify-between mb-3">
                      <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${card.color} flex items-center justify-center text-white shadow-lg ${card.shadow}`}>
                        {card.icon}
                      </div>
                      <BarChart3 className="w-4 h-4 text-gray-300 dark:text-gray-600" />
                    </div>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">{card.value.toLocaleString()}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{card.label}</p>
                  </div>
                ))}
              </div>

              <div className="bg-white dark:bg-[#1A1A2E] rounded-2xl border border-gray-200 dark:border-white/10 p-6">
                <h3 className="font-bold text-gray-900 dark:text-white mb-4">{t('admin.recentActivity')}</h3>
                <div className="space-y-3">
                  {[
                    { icon: <Users className="w-4 h-4" />, text: t('admin.newUser'), time: `5 ${t('admin.minutesAgo')}`, color: 'bg-blue-100 text-blue-600' },
                    { icon: <FileText className="w-4 h-4" />, text: t('admin.newListing'), time: `12 ${t('admin.minutesAgo')}`, color: 'bg-emerald-100 text-emerald-600' },
                    { icon: <ClipboardList className="w-4 h-4" />, text: t('admin.rentalRequest'), time: `30 ${t('admin.minutesAgo')}`, color: 'bg-amber-100 text-amber-600' },
                    { icon: <CheckCircle className="w-4 h-4" />, text: t('admin.rentalCompleted'), time: `1 ${t('admin.hoursAgo')}`, color: 'bg-purple-100 text-purple-600' },
                    { icon: <AlertTriangle className="w-4 h-4" />, text: t('admin.complaint'), time: `2 ${t('admin.hoursAgo')}`, color: 'bg-red-100 text-red-600' },
                  ].map((item, i) => (
                    <div key={i} className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-white/5 transition">
                      <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${item.color}`}>
                        {item.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-gray-900 dark:text-white truncate">{item.text}</p>
                        <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                          <Clock className="w-3 h-3" />{item.time}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'users' && (
            <div>
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('admin.usersManagement')}</h1>
                  <p className="text-sm text-gray-500 mt-0.5">{t('admin.platformManagement')}</p>
                </div>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder={t('admin.search')}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 pr-4 py-2 bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#FF6B35] transition w-64"
                  />
                </div>
              </div>

              {usersLoading ? (
                <div className="flex justify-center py-16">
                  <div className="w-10 h-10 border-4 border-[#FF6B35] border-t-transparent rounded-full animate-spin" />
                </div>
              ) : (
                <div className="bg-white dark:bg-[#1A1A2E] rounded-2xl border border-gray-200 dark:border-white/10 overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-gray-200 dark:border-white/10">
                          <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">{t('admin.user')}</th>
                          <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">{t('admin.email')}</th>
                          <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">{t('admin.role')}</th>
                          <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">{t('admin.status')}</th>
                          <th className="text-right px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">{t('admin.actions')}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                        {filteredUsers.map((u) => (
                          <tr key={u.id} className="hover:bg-gray-50 dark:hover:bg-white/5 transition">
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                {u.avatar_url ? (
                                  <img src={u.avatar_url} alt="" className="w-9 h-9 rounded-full object-cover" />
                                ) : (
                                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#FF6B35] to-[#1A1A2E] flex items-center justify-center text-white text-xs font-semibold">
                                    {u.display_name.charAt(0)}
                                  </div>
                                )}
                                <span className="font-medium text-sm text-gray-900 dark:text-white">{u.display_name}</span>
                              </div>
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-500">{u.email}</td>
                            <td className="px-6 py-4">
                              <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${u.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-700'}`}>
                                {u.role === 'admin' ? t('admin.admin') : t('admin.customer')}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <StatusBadge status="active" t={t} />
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center justify-end gap-1">
                                <button
                                  onClick={() => verifyMutation.mutate(u.id)}
                                  className="p-2 rounded-lg text-emerald-600 hover:bg-emerald-50 transition"
                                  title={t('admin.verifyUser')}
                                >
                                  <CheckCircle className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => blockMutation.mutate(u.id)}
                                  className="p-2 rounded-lg text-red-600 hover:bg-red-50 transition"
                                  title={t('admin.blockUser')}
                                >
                                  <Ban className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {filteredUsers.length === 0 && (
                    <div className="py-12 text-center text-sm text-gray-400">{t('admin.notFound')}</div>
                  )}
                </div>
              )}
            </div>
          )}

          {activeTab === 'listings' && (
            <div>
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('admin.listingsManagement')}</h1>
                  <p className="text-sm text-gray-500 mt-0.5">{t('admin.platformManagement')}</p>
                </div>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder={t('admin.search')}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 pr-4 py-2 bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#FF6B35] transition w-64"
                  />
                </div>
              </div>

              {listingsLoading ? (
                <div className="flex justify-center py-16">
                  <div className="w-10 h-10 border-4 border-[#FF6B35] border-t-transparent rounded-full animate-spin" />
                </div>
              ) : (
                <div className="bg-white dark:bg-[#1A1A2E] rounded-2xl border border-gray-200 dark:border-white/10 overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-gray-200 dark:border-white/10">
                          <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">{t('admin.listing')}</th>
                          <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">{t('admin.price')}</th>
                          <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">{t('admin.status')}</th>
                          <th className="text-right px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">{t('admin.actions')}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                        {filteredListings.map((l) => (
                          <tr key={l.id} className="hover:bg-gray-50 dark:hover:bg-white/5 transition">
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                {l.images?.[0] ? (
                                  <img src={l.images[0]} alt="" className="w-12 h-12 rounded-xl object-cover" />
                                ) : (
                                  <div className="w-12 h-12 rounded-xl bg-gray-100 dark:bg-white/5 flex items-center justify-center">
                                    <ImageIcon className="w-5 h-5 text-gray-400" />
                                  </div>
                                )}
                                <div>
                                  <p className="font-medium text-sm text-gray-900 dark:text-white">{l.title}</p>
                                  <p className="text-xs text-gray-400">ID: {l.id}</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 text-sm font-semibold text-gray-900 dark:text-white">
                              {l.price} сом
                            </td>
                            <td className="px-6 py-4">
                              <StatusBadge status={l.status === 'ACTIVE' ? 'active' : l.status === 'PAUSED' ? 'inactive' : 'pending'} t={t} />
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center justify-end gap-1">
                                {!l.is_verified && (
                                  <button
                                    onClick={() => approveMutation.mutate(l.id)}
                                    className="p-2 rounded-lg text-emerald-600 hover:bg-emerald-50 transition"
                                    title={t('admin.approve')}
                                  >
                                    <CheckCircle className="w-4 h-4" />
                                  </button>
                                )}
                                <button
                                  onClick={() => rejectMutation.mutate(l.id)}
                                  className="p-2 rounded-lg text-amber-600 hover:bg-amber-50 transition"
                                  title={t('admin.rejectAction')}
                                >
                                  <X className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => deleteListingMutation.mutate(l.id)}
                                  className="p-2 rounded-lg text-red-600 hover:bg-red-50 transition"
                                  title={t('admin.deleteAction')}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {filteredListings.length === 0 && (
                    <div className="py-12 text-center text-sm text-gray-400">{t('admin.notFound')}</div>
                  )}
                </div>
              )}
            </div>
          )}

          {activeTab === 'requests' && (
            <div>
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('admin.requestsManagement')}</h1>
                  <p className="text-sm text-gray-500 mt-0.5">{t('admin.platformManagement')}</p>
                </div>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder={t('admin.search')}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 pr-4 py-2 bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#FF6B35] transition w-64"
                  />
                </div>
              </div>

              {requestsLoading ? (
                <div className="flex justify-center py-16">
                  <div className="w-10 h-10 border-4 border-[#FF6B35] border-t-transparent rounded-full animate-spin" />
                </div>
              ) : (
                <div className="bg-white dark:bg-[#1A1A2E] rounded-2xl border border-gray-200 dark:border-white/10 overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-gray-200 dark:border-white/10">
                          <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">{t('admin.requests')}</th>
                          <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">{t('admin.period')}</th>
                          <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">{t('admin.status')}</th>
                          <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">{t('admin.date')}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                        {filteredRequests.map((r) => {
                          const listing = listings.find((l) => l.id === r.listing_id);
                          return (
                            <tr key={r.id} className="hover:bg-gray-50 dark:hover:bg-white/5 transition">
                              <td className="px-6 py-4">
                                <div>
                                  <p className="font-medium text-sm text-gray-900 dark:text-white">{listing?.title || `${t('admin.listing')} #${r.listing_id}`}</p>
                                  <p className="text-xs text-gray-400">{t('admin.requests')} #{r.id}</p>
                                </div>
                              </td>
                              <td className="px-6 py-4 text-sm text-gray-600">
                                {r.start_date} — {r.end_date}
                              </td>
                              <td className="px-6 py-4">
                                <StatusBadge status={r.status} t={t} />
                              </td>
                              <td className="px-6 py-4 text-sm text-gray-400">
                                {new Date(r.created_at).toLocaleDateString('ru-RU')}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  {filteredRequests.length === 0 && (
                    <div className="py-12 text-center text-sm text-gray-400">{t('admin.notFound')}</div>
                  )}
                </div>
              )}
            </div>
          )}

          {activeTab === 'categories' && (
            <div>
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('admin.categoriesManagement')}</h1>
                  <p className="text-sm text-gray-500 mt-0.5">{t('admin.platformManagement')}</p>
                </div>
                <button
                  onClick={() => { setEditingCategory(null); setCategoryName(''); setShowCategoryModal(true); }}
                  className="flex items-center gap-2 bg-[#FF6B35] text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-[#e55a2b] transition shadow-lg shadow-[#FF6B35]/20"
                >
                  <Plus className="w-4 h-4" />
                  {t('admin.add')}
                </button>
              </div>

              {categoriesLoading ? (
                <div className="flex justify-center py-16">
                  <div className="w-10 h-10 border-4 border-[#FF6B35] border-t-transparent rounded-full animate-spin" />
                </div>
              ) : (
                <div className="bg-white dark:bg-[#1A1A2E] rounded-2xl border border-gray-200 dark:border-white/10 overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-gray-200 dark:border-white/10">
                          <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">{t('admin.name')}</th>
                          <th className="text-right px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">{t('admin.actions')}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                        {categories.map((cat) => (
                          <tr key={cat.id} className="hover:bg-gray-50 dark:hover:bg-white/5 transition">
                            <td className="px-6 py-4 font-medium text-sm text-gray-900 dark:text-white">{cat.name}</td>
                            <td className="px-6 py-4">
                              <div className="flex items-center justify-end gap-1">
                                <button
                                  onClick={() => openEditCategory(cat)}
                                  className="p-2 rounded-lg text-[#FF6B35] hover:bg-[#FF6B35]/10 transition"
                                  title={t('admin.editCategory')}
                                >
                                  <FileText className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => {
                                    if (confirm(`${t('admin.deleteAction')} "${cat.name}"?`)) {
                                      deleteCategoryMutation.mutate(cat.id);
                                    }
                                  }}
                                  className="p-2 rounded-lg text-red-600 hover:bg-red-50 transition"
                                  title={t('admin.deleteAction')}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {categories.length === 0 && (
                    <div className="py-12 text-center text-sm text-gray-400">{t('admin.notFound')}</div>
                  )}
                </div>
              )}
            </div>
          )}
        </main>
      </div>

      {showCategoryModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={closeCategoryModal}>
          <div className="bg-white dark:bg-[#1A1A2E] rounded-2xl max-w-md w-full p-6 shadow-2xl border border-gray-200 dark:border-white/10" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                {editingCategory ? t('admin.editCategory') : t('admin.newCategory')}
              </h2>
              <button onClick={closeCategoryModal} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 transition">
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">{t('admin.name')}</label>
                <input
                  type="text"
                  value={categoryName}
                  onChange={(e) => setCategoryName(e.target.value)}
                  placeholder={t('admin.namePlaceholder')}
                  className="w-full px-4 py-2.5 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#FF6B35] transition"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">{t('admin.slug')}</label>
                <input
                  type="text"
                  value={categorySlug}
                  onChange={(e) => setCategorySlug(e.target.value)}
                  placeholder={t('admin.slugPlaceholder')}
                  className="w-full px-4 py-2.5 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#FF6B35] font-mono transition"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  onClick={closeCategoryModal}
                  className="flex-1 py-2.5 border border-gray-300 dark:border-white/10 rounded-xl text-sm font-medium text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-white/5 transition"
                >
                  {t('admin.cancel')}
                </button>
                <button
                  onClick={handleSaveCategory}
                  disabled={saveCategoryMutation.isPending}
                  className="flex-1 py-2.5 bg-[#FF6B35] text-white rounded-xl text-sm font-semibold hover:bg-[#e55a2b] disabled:opacity-50 transition shadow-lg shadow-[#FF6B35]/20"
                >
                  {saveCategoryMutation.isPending ? t('admin.saving') : t('admin.save')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
