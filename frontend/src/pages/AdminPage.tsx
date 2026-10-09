import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import {
  LayoutDashboard, Users, FileText, ClipboardList, FolderTree,
  Shield, Ban, CheckCircle, Trash2, Eye, Search, X, Plus,
  ChevronLeft, ChevronRight, BarChart3, TrendingUp, Clock, AlertTriangle, ImageIcon,
  PanelLeft, PanelLeftClose, MessageSquare, UserCircle, Star, Phone, Mail, Crown, Pencil, Play,
  MessageSquareQuote, ZoomIn, PieChart as PieChartIcon, Wallet,
} from 'lucide-react';
import toast from 'react-hot-toast';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from 'recharts';
import client from '../api/client';
import { topPromotions } from '../api';
import type { User, Listing, RentalRequest, Category, TopPlan, TopPromotion, TopStats } from '../api';
import { formatDate } from '../utils/dates';
import { formatAmount } from '../utils/format';

interface AdminStats {
  totalUsers: number;
  activeListings: number;
  rentalRequests: number;
  completedRentals: number;
}

interface ChartPoint {
  date: string;
  count: number;
}

interface ChartGroup {
  key: string;
  count: number;
}

interface AdminChartData {
  requestsByDay: ChartPoint[];
  listingsByStatus: ChartGroup[];
  requestsByStatus: ChartGroup[];
  usersByRole: ChartGroup[];
}

interface CrmStats {
  totalUsers: number;
  activeUsers: number;
  verifiedUsers: number;
  totalListings: number;
  activeListings: number;
  unverifiedListings: number;
  totalEquipment: number;
  totalRequests: number;
  totalBookings: number;
  totalRentals: number;
  totalPayments: number;
  totalPosts: number;
  totalReviews: number;
  totalPenalties: number;
  totalRevenue: number;
}

interface CrmPipelineItem {
  type: string;
  id: number;
  title: string;
  status: string;
  amount: number | null;
  user: string | null;
  created_at: string;
}

interface CrmData {
  stats: CrmStats;
  requestsByStatus: Record<string, number>;
  bookingsByStatus: Record<string, number>;
  rentalsByStatus: Record<string, number>;
  paymentsByStatus: Record<string, number>;
  listingsByStatus: Record<string, number>;
  pipeline: CrmPipelineItem[];
  recentRequests: {
    id: number;
    listing_title: string | null;
    renter_name: string | null;
    owner_name: string | null;
    status: string;
    total_price: number;
    start_date: string;
    end_date: string;
    created_at: string;
  }[];
  recentBookings: {
    id: number;
    equipment_name: string | null;
    customer_name: string | null;
    status: string;
    total_price: number;
    start_date: string;
    end_date: string;
    created_at: string;
  }[];
  recentRentals: {
    id: number;
    equipment_name: string | null;
    customer_name: string | null;
    status: string;
    created_at: string;
  }[];
  recentPayments: {
    id: number;
    amount: number;
    payment_type: string;
    status: string;
    customer_name: string | null;
    created_at: string;
  }[];
  recentUsers: {
    id: number;
    email: string;
    display_name: string | null;
    role: string;
    is_active: boolean;
    is_verified: boolean;
    created_at: string;
  }[];
}

interface AdminPost {
  id: number;
  user_id: number;
  category_id: number | null;
  title: string;
  content: string;
  image_url: string | null;
  author_name: string | null;
  likes_count: number;
  comments_count: number;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
}

interface AdminUserProfile {
  id: number;
  email: string;
  display_name: string | null;
  avatar_url?: string | null;
  phone?: string | null;
  role: string;
  is_active: boolean;
  is_verified: boolean;
  rating_sum?: number;
  rating_count?: number;
  listing_count?: number;
  created_at: string;
}

const adminApi = {
  getStats: () => client.get<{ data: AdminStats }>('/admin/stats').then((r) => r.data.data),
  getChartData: () => client.get<{ data: AdminChartData }>('/admin/chart-data').then((r) => r.data.data),
  getUsers: () => client.get<{ data: User[] }>('/admin/users').then((r) => r.data.data),
  getUser: (id: number) => client.get(`/admin/users/${id}`).then((r) => r.data.data) as Promise<AdminUserProfile>,
  blockUser: (id: number) => client.put(`/admin/users/${id}/block`).then((r) => r.data),
  unblockUser: (id: number) => client.put(`/admin/users/${id}/unblock`).then((r) => r.data),
  verifyUser: (id: number) => client.put(`/admin/users/${id}/verify`).then((r) => r.data),
  getPosts: () => client.get('/admin/posts').then((r) => r.data.data) as Promise<AdminPost[]>,
  approvePost: (id: number) => client.put(`/admin/posts/${id}/approve`).then((r) => r.data),
  rejectPost: (id: number) => client.put(`/admin/posts/${id}/reject`).then((r) => r.data),
  deletePost: (id: number) => client.delete(`/admin/posts/${id}`).then((r) => r.data),
  getListings: () => client.get<{ data: Listing[] }>('/admin/listings').then((r) => r.data.data),
  approveListing: (id: number) => client.put(`/admin/listings/${id}/approve`).then((r) => r.data),
  rejectListing: (id: number, reason?: string) =>
    client
      .put(`/admin/listings/${id}/reject`, null, { params: reason ? { reason } : {} })
      .then((r) => r.data),
  deleteListing: (id: number) => client.delete(`/admin/listings/${id}`).then((r) => r.data),
  getRequests: () => client.get<{ data: RentalRequest[] }>('/admin/requests').then((r) => r.data.data),
  getCrm: () => client.get<{ data: CrmData }>('/admin/crm').then((r) => r.data.data),
  getCategories: () => client.get<{ data: Category[] }>('/categories').then((r) => r.data.data),
  createCategory: (data: { name: string }) => client.post('/categories', data).then((r) => r.data),
  updateCategory: (id: number, data: { name: string }) => client.put(`/categories/${id}`, data).then((r) => r.data),
  deleteCategory: (id: number) => client.delete(`/categories/${id}`).then((r) => r.data),
};

type TabKey = 'dashboard' | 'crm' | 'users' | 'listings' | 'requests' | 'top' | 'categories' | 'posts';

/** Status/payment colour chips for the TOP tables — one shared vocabulary. */
const TOP_BADGE_STYLES: Record<string, string> = {
  PENDING: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20',
  ACTIVE: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20',
  EXPIRED: 'bg-gray-100 text-gray-600 border-gray-200 dark:bg-white/5 dark:text-gray-400 dark:border-white/10',
  REJECTED: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20',
  CANCELLED: 'bg-gray-100 text-gray-600 border-gray-200 dark:bg-white/5 dark:text-gray-400 dark:border-white/10',
  PAID: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20',
  APPROVED: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20',
  UNPAID: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20',
  REFUNDED: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20',
};

function StatusBadge({ status, t }: { status: string; t: (key: string) => string }) {
  const styles: Record<string, string> = {
    pending: 'bg-amber-50 text-amber-700 border border-amber-200',
    accepted: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
    approved: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
    rejected: 'bg-red-50 text-red-700 border border-red-200',
    cancelled: 'bg-gray-100 text-gray-600 border border-gray-200',
    active: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
    inactive: 'bg-gray-100 text-gray-600 border border-gray-200',
    blocked: 'bg-red-50 text-red-700 border border-red-200',
  };
  const labelKeys: Record<string, string> = {
    pending: 'admin.pending',
    accepted: 'admin.accepted',
    approved: 'admin.approved',
    rejected: 'admin.rejected',
    cancelled: 'admin.cancelled',
    active: 'admin.active',
    inactive: 'admin.inactive',
    blocked: 'admin.blocked',
  };
  return (
    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full whitespace-nowrap ${styles[status] || styles.pending}`}>
      {t(labelKeys[status] || status)}
    </span>
  );
}

export default function AdminPage() {
  const { t, i18n } = useTranslation();
  const [activeTab, setActiveTab] = useState<TabKey>('dashboard');
  const [adminSidebarCollapsed, setAdminSidebarCollapsed] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [categoryName, setCategoryName] = useState('');
  const [profileUser, setProfileUser] = useState<AdminUserProfile | null>(null);

  // TOP promotion management: one status filter, one open detail/reject
  // sheet, and a plan editor (create vs edit is told apart by `mode`).
  const [topStatus, setTopStatus] = useState<'all' | 'PENDING' | 'ACTIVE' | 'EXPIRED' | 'REJECTED' | 'CANCELLED'>('all');
  const [topListingId, setTopListingId] = useState('');
  const [topSelected, setTopSelected] = useState<TopPromotion | null>(null);
  const [topRejectTarget, setTopRejectTarget] = useState<TopPromotion | null>(null);
  const [topRejectReason, setTopRejectReason] = useState('');
  const [planModal, setPlanModal] = useState<null | { mode: 'new' } | { mode: 'edit'; plan: TopPlan }>(null);
  const [planForm, setPlanForm] = useState({ name: '', duration_key: '1d', price: '0', is_active: true });

  // Feedback moderation: the list opens on the unprocessed queue, so a post
  // leaves the view the moment it is approved or rejected — history is never
  // deleted, it just moves behind the "All" filter.
  const [postStatus, setPostStatus] = useState<'pending' | 'approved' | 'rejected' | 'all'>('pending');
  const [postDetail, setPostDetail] = useState<AdminPost | null>(null);
  const queryClient = useQueryClient();

  const { data: stats, isLoading: statsLoading } = useQuery<AdminStats>({
    queryKey: ['admin-stats'],
    queryFn: adminApi.getStats,
  });

  const { data: chartData } = useQuery({
    queryKey: ['admin-chart'],
    queryFn: adminApi.getChartData,
    refetchInterval: 60000,
  });

  const { data: users = [], isLoading: usersLoading, isError: usersError } = useQuery({
    queryKey: ['admin-users'],
    queryFn: adminApi.getUsers,
  });

  const { data: listings = [], isLoading: listingsLoading, isError: listingsError } = useQuery({
    queryKey: ['admin-listings'],
    queryFn: adminApi.getListings,
  });

  const { data: requests = [], isLoading: requestsLoading, isError: requestsError } = useQuery({
    queryKey: ['admin-requests'],
    queryFn: adminApi.getRequests,
  });

  const { data: categories = [], isLoading: categoriesLoading, isError: categoriesError } = useQuery({
    queryKey: ['admin-categories'],
    queryFn: adminApi.getCategories,
  });

  // When the admin API itself is unreachable, say so instead of pretending
  // the lists are simply empty.
  const adminApiDown = usersError || listingsError || requestsError || categoriesError;

  const { data: crm, isLoading: crmLoading } = useQuery({
    queryKey: ['admin-crm'],
    queryFn: adminApi.getCrm,
    enabled: activeTab === 'crm',
  });

  const { data: posts = [], isLoading: postsLoading } = useQuery<AdminPost[]>({
    queryKey: ['admin-posts'],
    queryFn: adminApi.getPosts,
    enabled: activeTab === 'posts',
  });

  // TOP: only fetched while the tab is open — nothing here loads for a
  // browser that never asks, and every value is read straight from the API.
  const { data: topStats, isLoading: topStatsLoading } = useQuery<TopStats>({
    queryKey: ['admin-top-stats'],
    queryFn: topPromotions.admin.stats,
    enabled: activeTab === 'top',
  });

  const { data: topRows = [], isLoading: topListLoading } = useQuery({
    queryKey: ['admin-top-list', topStatus, topListingId],
    queryFn: () =>
      topPromotions.admin.list({
        status: topStatus === 'all' ? undefined : topStatus,
        listing_id: topListingId ? Number(topListingId) : undefined,
        page: 1,
        page_size: 200,
      }),
    enabled: activeTab === 'top',
    select: (page) => page.items,
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
    mutationFn: ({ id, reason }: { id: number; reason?: string }) => adminApi.rejectListing(id, reason),
    onSuccess: () => { toast.success(t('admin.rejectedSuccess')); queryClient.invalidateQueries({ queryKey: ['admin-listings'] }); },
    onError: () => toast.error(t('admin.failedAction')),
  });

  const deleteListingMutation = useMutation({
    mutationFn: adminApi.deleteListing,
    onSuccess: () => { toast.success(t('admin.deletedSuccess')); queryClient.invalidateQueries({ queryKey: ['admin-listings'] }); },
    onError: () => toast.error(t('admin.failedAction')),
  });

  const approvePostMutation = useMutation({
    mutationFn: adminApi.approvePost,
    onSuccess: () => { toast.success(t('admin.approvedSuccess')); queryClient.invalidateQueries({ queryKey: ['admin-posts'] }); },
    onError: () => toast.error(t('admin.failedAction')),
  });

  const rejectPostMutation = useMutation({
    mutationFn: adminApi.rejectPost,
    onSuccess: () => { toast.success(t('admin.rejectedSuccess')); queryClient.invalidateQueries({ queryKey: ['admin-posts'] }); },
    onError: () => toast.error(t('admin.failedAction')),
  });

  const deletePostMutation = useMutation({
    mutationFn: adminApi.deletePost,
    onSuccess: () => { toast.success(t('admin.deletedSuccess')); queryClient.invalidateQueries({ queryKey: ['admin-posts'] }); },
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

  // ---- TOP promotions ----------------------------------------------------
  // Every action goes straight to the API and then re-reads the lists; the
  // UI never flips a status or a price on its own.
  const invalidateTop = () => {
    queryClient.invalidateQueries({ queryKey: ['admin-top-list'] });
    queryClient.invalidateQueries({ queryKey: ['admin-top-stats'] });
    queryClient.invalidateQueries({ queryKey: ['topListings'] });
    queryClient.invalidateQueries({ queryKey: ['top-mine'] });
    queryClient.invalidateQueries({ queryKey: ['admin-listings'] });
  };

  const topApproveMutation = useMutation({
    mutationFn: topPromotions.admin.approve,
    onSuccess: () => {
      toast.success(t('admin.topApproved'));
      invalidateTop();
      setTopSelected(null);
    },
    onError: () => toast.error(t('admin.failedAction')),
  });

  const topRejectMutation = useMutation({
    mutationFn: ({ id, reason }: { id: number; reason?: string }) =>
      topPromotions.admin.reject(id, reason),
    onSuccess: () => {
      toast.success(t('admin.topRejected'));
      invalidateTop();
      setTopRejectTarget(null);
      setTopRejectReason('');
      setTopSelected(null);
    },
    onError: () => toast.error(t('admin.failedAction')),
  });

  const topCancelMutation = useMutation({
    mutationFn: topPromotions.admin.cancel,
    onSuccess: () => {
      toast.success(t('admin.topCancelled'));
      invalidateTop();
      setTopSelected(null);
    },
    onError: () => toast.error(t('admin.failedAction')),
  });

  const topActivateMutation = useMutation({
    mutationFn: topPromotions.admin.activate,
    onSuccess: () => {
      toast.success(t('admin.topActivated'));
      invalidateTop();
      setTopSelected(null);
    },
    onError: () => toast.error(t('admin.failedAction')),
  });

  const planSaveMutation = useMutation({
    mutationFn: () => {
      const payload = {
        name: planForm.name.trim(),
        duration_key: planForm.duration_key,
        price: Number(planForm.price) || 0,
        is_active: planForm.is_active,
      };
      return planModal && planModal.mode === 'edit'
        ? topPromotions.admin.updatePlan(planModal.plan.id, payload)
        : topPromotions.admin.createPlan(payload);
    },
    onSuccess: () => {
      toast.success(t('admin.topPlanSaved'));
      queryClient.invalidateQueries({ queryKey: ['admin-top-stats'] });
      queryClient.invalidateQueries({ queryKey: ['top-plans'] });
      setPlanModal(null);
    },
    onError: () => toast.error(t('admin.failedAction')),
  });

  const openPlanModal = (mode: 'new' | { mode: 'edit'; plan: TopPlan }) => {
    if (mode === 'new') {
      setPlanForm({ name: '', duration_key: '1d', price: '0', is_active: true });
      setPlanModal({ mode: 'new' });
    } else {
      setPlanForm({
        name: mode.plan.name,
        duration_key: mode.plan.duration_key,
        price: String(mode.plan.price),
        is_active: mode.plan.is_active,
      });
      setPlanModal({ mode: 'edit', plan: mode.plan });
    }
  };

  const handleSavePlan = () => {
    if (!planForm.name.trim()) {
      toast.error(t('admin.fillAllFields'));
      return;
    }
    planSaveMutation.mutate();
  };

  const filteredUsers = users.filter(
    (u) => (u.display_name || '').toLowerCase().includes(searchQuery.toLowerCase()) || u.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredPosts = posts.filter((p) => {
    if (postStatus !== 'all' && p.status !== postStatus) return false;
    return (
      p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.author_name || '').toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  const openProfile = async (u: User) => {
    setProfileUser({
      id: u.id,
      email: u.email,
      display_name: u.display_name,
      avatar_url: u.avatar_url,
      role: u.role,
      is_active: (u as any).is_active ?? true,
      is_verified: (u as any).is_verified ?? false,
      created_at: u.created_at,
    });
    try {
      const full = await adminApi.getUser(u.id);
      setProfileUser(full);
    } catch {
      /* keep data from the row */
    }
  };

  const filteredListings = listings.filter((l) => l.title.toLowerCase().includes(searchQuery.toLowerCase()));

  const filteredRequests = requests.filter((r) => {
    const listing = listings.find((l) => l.id === r.listing_id);
    return listing?.title.toLowerCase().includes(searchQuery.toLowerCase()) || false;
  });

  const tabs: { key: TabKey; label: string; icon: React.ReactNode }[] = [
    { key: 'dashboard', label: t('admin.overview'), icon: <LayoutDashboard className="w-5 h-5" /> },
    { key: 'crm', label: t('admin.crm'), icon: <BarChart3 className="w-5 h-5" /> },
    { key: 'users', label: t('admin.users'), icon: <Users className="w-5 h-5" /> },
    { key: 'listings', label: t('admin.listings'), icon: <FileText className="w-5 h-5" /> },
    { key: 'requests', label: t('admin.requests'), icon: <ClipboardList className="w-5 h-5" /> },
    { key: 'top', label: t('admin.topTab'), icon: <Crown className="w-5 h-5" /> },
    { key: 'categories', label: t('admin.categories'), icon: <FolderTree className="w-5 h-5" /> },
    { key: 'posts', label: t('admin.posts'), icon: <MessageSquare className="w-5 h-5" /> },
  ];

  const statCards = [
    { label: t('admin.totalUsers'), value: stats?.totalUsers ?? 0, icon: <Users className="w-6 h-6" />, color: 'from-blue-500 to-indigo-600', shadow: 'shadow-blue-500/20' },
    { label: t('admin.activeListings'), value: stats?.activeListings ?? 0, icon: <FileText className="w-6 h-6" />, color: 'from-emerald-500 to-teal-600', shadow: 'shadow-emerald-500/20' },
    { label: t('admin.rentalRequests'), value: stats?.rentalRequests ?? 0, icon: <ClipboardList className="w-6 h-6" />, color: 'from-amber-500 to-[var(--accent-hover)]', shadow: 'shadow-amber-500/20' },
    { label: t('admin.completedRentals'), value: stats?.completedRentals ?? 0, icon: <TrendingUp className="w-6 h-6" />, color: 'from-purple-500 to-pink-600', shadow: 'shadow-purple-500/20' },
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0f0f23]">
      <div className="flex">
        <aside
          className={`${
            adminSidebarCollapsed ? 'w-[76px]' : 'w-64'
          } flex-shrink-0 bg-white dark:bg-gradient-to-b dark:from-[#1A1A2E] dark:via-[#171730] dark:to-[#12122a] border-r border-gray-200 dark:border-white/10 min-h-[calc(100vh_-_var(--header-h))] sticky top-[var(--header-h)] transition-[width] duration-300 ease-out overflow-hidden`}
        >
          <div className={adminSidebarCollapsed ? 'p-3' : 'p-4'}>
            <div
              className={`relative overflow-hidden rounded-2xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/[0.04] mb-5 ${
                adminSidebarCollapsed ? 'p-2.5 flex flex-col items-center gap-3' : 'p-4 flex items-center gap-3'
              }`}
            >
              <div className="pointer-events-none absolute -top-10 -right-8 w-28 h-28 bg-[rgb(var(--accent-rgb)/0.2)] rounded-full blur-2xl" />
              <div className="relative w-10 h-10 rounded-2xl bg-gradient-to-br from-[var(--accent)] to-[#ff9a66] flex items-center justify-center shrink-0 shadow-lg shadow-[rgb(var(--accent-rgb)/0.3)]">
                <Shield className="w-5 h-5 text-white" />
              </div>
              {!adminSidebarCollapsed && (
                <div className="relative flex-1 min-w-0">
                  <h2 className="font-extrabold text-[15px] text-gray-900 dark:text-white truncate">{t('admin.panel')}</h2>
                  <p className="text-[11px] text-gray-500 dark:text-gray-400 truncate">{t('admin.platformManagement')}</p>
                </div>
              )}
              <button
                onClick={() => setAdminSidebarCollapsed(!adminSidebarCollapsed)}
                aria-label="Toggle sidebar"
                title={adminSidebarCollapsed ? t('nav.expandSidebar') : t('nav.collapseSidebar')}
                className={`relative p-2 rounded-xl text-gray-500 dark:text-gray-400 hover:text-[var(--accent)] hover:bg-[rgb(var(--accent-rgb)/0.1)] dark:hover:bg-[rgb(var(--accent-rgb)/0.1)] transition ${
                  adminSidebarCollapsed ? '' : 'shrink-0'
                }`}
              >
                {adminSidebarCollapsed ? <PanelLeft className="w-5 h-5" /> : <PanelLeftClose className="w-5 h-5" />}
              </button>
            </div>
            <nav className="space-y-1.5">
              {!adminSidebarCollapsed && (
                <p className="px-4 pb-2 text-[10px] font-bold uppercase tracking-[0.15em] text-gray-400 dark:text-gray-500">
                  {t('admin.menu')}
                </p>
              )}
              {tabs.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => { setActiveTab(tab.key); setSearchQuery(''); }}
                  title={adminSidebarCollapsed ? tab.label : undefined}
                  className={`w-full flex items-center rounded-2xl text-sm font-semibold transition-all duration-200 ${
                    adminSidebarCollapsed ? 'justify-center px-0 py-3' : 'gap-3 px-4 py-3'
                  } ${
                    activeTab === tab.key
                      ? 'bg-gradient-to-r from-[var(--accent)] to-[var(--accent-light)] text-white shadow-lg shadow-[rgb(var(--accent-rgb)/0.3)]'
                      : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5 hover:text-gray-900 dark:hover:text-white'
                  }`}
                >
                  <span className="shrink-0">{tab.icon}</span>
                  {!adminSidebarCollapsed && <span>{tab.label}</span>}
                </button>
              ))}
            </nav>
          </div>
        </aside>

        <main className="flex-1 min-w-0 p-6">
          {activeTab === 'dashboard' && (
            <div>
              <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white inline-flex items-center gap-2.5">
                  <LayoutDashboard className="w-6 h-6 text-[var(--accent)] shrink-0" aria-hidden="true" />
                  {t('admin.overview')}
                </h1>
                <p className="text-sm text-gray-500 mt-0.5">{t('admin.platformStats')}</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                {statCards.map((card) => (
                  <div key={card.label} className="bg-white dark:bg-[#1A1A2E] rounded-2xl p-5 border border-gray-200 dark:border-white/10 shadow-sm">
                    <div className="flex items-center justify-between mb-3">
                      <div className="w-12 h-12 rounded-xl bg-[rgb(var(--accent-rgb)/0.1)] flex items-center justify-center text-[var(--accent)]">
                        {card.icon}
                      </div>
                      <BarChart3 className="w-4 h-4 text-gray-300 dark:text-gray-600" />
                    </div>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">{formatAmount(card.value)}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{card.label}</p>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-8">
                <div className="lg:col-span-2 bg-white dark:bg-[#1A1A2E] rounded-2xl border border-gray-200 dark:border-white/10 p-6">
                  <h3 className="font-bold text-gray-900 dark:text-white mb-4 inline-flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-[var(--accent)]" aria-hidden="true" />
                    {t('admin.chartRequests')}
                  </h3>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={chartData?.requestsByDay || []} margin={{ top: 5, right: 10, left: -18, bottom: 0 }}>
                        <defs>
                          <linearGradient id="orangeArea" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="var(--accent)" stopOpacity={0.35} />
                            <stop offset="100%" stopColor="var(--accent)" stopOpacity={0.02} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 4" stroke="rgba(148,163,184,0.15)" vertical={false} />
                        <XAxis
                          dataKey="date"
                          axisLine={false}
                          tickLine={false}
                          interval={4}
                          tick={{ fill: '#94a3b8', fontSize: 11 }}
                          tickFormatter={(v: string) => v.slice(8) + '.' + v.slice(5, 7)}
                        />
                        <YAxis axisLine={false} tickLine={false} allowDecimals={false} width={40} tick={{ fill: '#94a3b8', fontSize: 11 }} />
                        <Tooltip
                          contentStyle={{ borderRadius: 12, border: '1px solid #e5e7eb', fontSize: 12 }}
                          labelStyle={{ color: '#6b7280' }}
                        />
                        <Area type="monotone" dataKey="count" stroke="var(--accent)" strokeWidth={2.5} fill="url(#orangeArea)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="bg-white dark:bg-[#1A1A2E] rounded-2xl border border-gray-200 dark:border-white/10 p-6">
                  <h3 className="font-bold text-gray-900 dark:text-white mb-4 inline-flex items-center gap-2">
                    <PieChartIcon className="w-5 h-5 text-[var(--accent)]" aria-hidden="true" />
                    {t('admin.chartListingsStatus')}
                  </h3>
                  <div className="h-48">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={(chartData?.listingsByStatus || []).map((g: ChartGroup) => ({ name: g.key, value: g.count }))}
                          dataKey="value"
                          nameKey="name"
                          innerRadius={45}
                          outerRadius={70}
                          paddingAngle={2}
                        >
                          {(chartData?.listingsByStatus || []).map((_: ChartGroup, i: number) => (
                            <Cell key={i} fill={['var(--accent)', '#1A1A2E', 'var(--accent-light)', '#94A3B8', '#22C55E', '#F59E0B'][i % 6]} />
                          ))}
                        </Pie>
                        <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #e5e7eb', fontSize: 12 }} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="space-y-1.5 mt-2">
                    {(chartData?.listingsByStatus || []).map((g: ChartGroup, i: number) => (
                      <div key={g.key} className="flex items-center justify-between text-xs">
                        <span className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                          <span className="w-2.5 h-2.5 rounded-full" style={{ background: ['var(--accent)', '#1A1A2E', 'var(--accent-light)', '#94A3B8', '#22C55E', '#F59E0B'][i % 6] }} />
                          {g.key}
                        </span>
                        <span className="font-bold text-gray-900 dark:text-white">{g.count}</span>
                      </div>
                    ))}
                    {(chartData?.listingsByStatus || []).length === 0 && (
                      <p className="text-xs text-gray-400 text-center py-4">—</p>
                    )}
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-[#1A1A2E] rounded-2xl border border-gray-200 dark:border-white/10 p-6">
                <h3 className="font-bold text-gray-900 dark:text-white mb-4 inline-flex items-center gap-2">
                  <Clock className="w-5 h-5 text-[var(--accent)]" aria-hidden="true" />
                  {t('admin.recentActivity')}
                </h3>
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

          {activeTab === 'crm' && (
            <div>
              <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white inline-flex items-center gap-2.5">
                  <BarChart3 className="w-6 h-6 text-[var(--accent)] shrink-0" aria-hidden="true" />
                  {t('admin.crm')}
                </h1>
                <p className="text-sm text-gray-500 mt-0.5">{t('admin.crmSubtitle')}</p>
              </div>

              {crmLoading ? (
                <div className="flex justify-center py-16">
                  <div className="w-10 h-10 border-4 border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
                </div>
              ) : crm ? (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {[
                      { label: t('admin.totalUsers'), value: crm.stats.totalUsers, icon: <Users className="w-6 h-6" />, color: 'from-blue-500 to-indigo-600', shadow: 'shadow-blue-500/20' },
                      { label: t('admin.activeListings'), value: crm.stats.activeListings, icon: <FileText className="w-6 h-6" />, color: 'from-emerald-500 to-teal-600', shadow: 'shadow-emerald-500/20' },
                      { label: t('admin.totalRequests'), value: crm.stats.totalRequests, icon: <ClipboardList className="w-6 h-6" />, color: 'from-amber-500 to-[var(--accent-hover)]', shadow: 'shadow-amber-500/20' },
                      { label: t('admin.totalRevenue'), value: crm.stats.totalRevenue, icon: <TrendingUp className="w-6 h-6" />, color: 'from-purple-500 to-pink-600', shadow: 'shadow-purple-500/20' },
                      { label: t('admin.totalBookings'), value: crm.stats.totalBookings, icon: <Clock className="w-6 h-6" />, color: 'from-cyan-500 to-sky-600', shadow: 'shadow-cyan-500/20' },
                      { label: t('admin.totalRentals'), value: crm.stats.totalRentals, icon: <CheckCircle className="w-6 h-6" />, color: 'from-teal-500 to-green-600', shadow: 'shadow-teal-500/20' },
                      { label: t('admin.totalPayments'), value: crm.stats.totalPayments, icon: <BarChart3 className="w-6 h-6" />, color: 'from-rose-500 to-red-600', shadow: 'shadow-rose-500/20' },
                      { label: t('admin.unverifiedListings'), value: crm.stats.unverifiedListings, icon: <AlertTriangle className="w-6 h-6" />, color: 'from-yellow-500 to-amber-600', shadow: 'shadow-yellow-500/20' },
                    ].map((card) => (
                      <div key={card.label} className="bg-white dark:bg-[#1A1A2E] rounded-2xl p-5 border border-gray-200 dark:border-white/10 shadow-sm">
                        <div className="flex items-center justify-between mb-3">
                          <div className="w-12 h-12 rounded-xl bg-[rgb(var(--accent-rgb)/0.1)] flex items-center justify-center text-[var(--accent)]">
                            {card.icon}
                          </div>
                          <BarChart3 className="w-4 h-4 text-gray-300 dark:text-gray-600" />
                        </div>
                        <p className="text-2xl font-bold text-gray-900 dark:text-white">
                          {card.label === t('admin.totalRevenue')
                            ? `${formatAmount(card.value, i18n.language)} ${t('common.somoni')}`
                            : formatAmount(card.value, i18n.language)}
                        </p>
                        <p className="text-xs text-gray-500 mt-0.5">{card.label}</p>
                      </div>
                    ))}
                  </div>

                  <div className="bg-white dark:bg-[#1A1A2E] rounded-2xl border border-gray-200 dark:border-white/10 p-6">
                    <h3 className="font-bold text-gray-900 dark:text-white mb-4 inline-flex items-center gap-2">
                      <TrendingUp className="w-5 h-5 text-[var(--accent)]" aria-hidden="true" />
                      {t('admin.pipeline')}
                    </h3>
                    {crm.pipeline.length === 0 ? (
                      <div className="py-8 text-center text-sm text-gray-400">{t('admin.notFound')}</div>
                    ) : (
                      <div className="space-y-3">
                        {crm.pipeline.map((item) => (
                          <div key={`${item.type}-${item.id}`} className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-white/5 transition">
                            <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${
                              item.type === 'request' ? 'bg-amber-100 text-amber-600' :
                              item.type === 'booking' ? 'bg-blue-100 text-blue-600' :
                              item.type === 'rental' ? 'bg-emerald-100 text-emerald-600' :
                              item.type === 'payment' ? 'bg-purple-100 text-purple-600' :
                              'bg-gray-100 text-gray-600'
                            }`}>
                              {item.type === 'user' ? <Users className="w-4 h-4" /> : <FileText className="w-4 h-4" />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{item.title}</p>
                                <StatusBadge status={item.status.toLowerCase()} t={t} />
                              </div>
                              <p className="text-xs text-gray-400 mt-0.5">
                                {t(`admin.crmType_${item.type}`)} · {item.user || '—'}
                                {item.amount != null ? ` · ${formatAmount(item.amount, i18n.language)} ${t('common.somoni')}` : ''}
                              </p>
                            </div>
                            <p className="text-xs text-gray-400 whitespace-nowrap">
                              {formatDate(item.created_at)}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="bg-white dark:bg-[#1A1A2E] rounded-2xl border border-gray-200 dark:border-white/10 overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-200 dark:border-white/10">
                      <h3 className="font-bold text-gray-900 dark:text-white inline-flex items-center gap-2">
                        <ClipboardList className="w-5 h-5 text-[var(--accent)]" aria-hidden="true" />
                        {t('admin.recentRequests')}
                      </h3>
                    </div>
                    {crm.recentRequests.length === 0 ? (
                      <div className="py-8 text-center text-sm text-gray-400">{t('admin.notFound')}</div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead>
                            <tr className="border-b border-gray-200 dark:border-white/10">
                              <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">{t('admin.listing')}</th>
                              <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">{t('admin.user')}</th>
                              <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">{t('admin.period')}</th>
                              <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">{t('admin.status')}</th>
                              <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">{t('admin.price')}</th>
                              <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">{t('admin.date')}</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                            {crm.recentRequests.map((r) => (
                              <tr key={r.id} className="hover:bg-gray-50 dark:hover:bg-white/5 transition">
                                <td className="px-6 py-3 text-sm text-gray-900 dark:text-white">{r.listing_title || `#${r.id}`}</td>
                                <td className="px-6 py-3 text-sm text-gray-500">{r.renter_name || '—'}</td>
                                <td className="px-6 py-3 text-sm text-gray-500">{r.start_date} — {r.end_date}</td>
                                <td className="px-6 py-3"><StatusBadge status={r.status.toLowerCase()} t={t} /></td>
                                <td className="px-6 py-3 text-sm font-semibold text-gray-900 dark:text-white">{formatAmount(r.total_price, i18n.language)} {t('common.somoni')}</td>
                                <td className="px-6 py-3 text-sm text-gray-400">{formatDate(r.created_at)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>

                  <div className="bg-white dark:bg-[#1A1A2E] rounded-2xl border border-gray-200 dark:border-white/10 overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-200 dark:border-white/10">
                      <h3 className="font-bold text-gray-900 dark:text-white inline-flex items-center gap-2">
                        <Wallet className="w-5 h-5 text-[var(--accent)]" aria-hidden="true" />
                        {t('admin.recentPayments')}
                      </h3>
                    </div>
                    {crm.recentPayments.length === 0 ? (
                      <div className="py-8 text-center text-sm text-gray-400">{t('admin.notFound')}</div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead>
                            <tr className="border-b border-gray-200 dark:border-white/10">
                              <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">ID</th>
                              <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">{t('admin.user')}</th>
                              <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">{t('admin.price')}</th>
                              <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">{t('admin.status')}</th>
                              <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">{t('admin.date')}</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                            {crm.recentPayments.map((p) => (
                              <tr key={p.id} className="hover:bg-gray-50 dark:hover:bg-white/5 transition">
                                <td className="px-6 py-3 text-sm text-gray-900 dark:text-white">#{p.id}</td>
                                <td className="px-6 py-3 text-sm text-gray-500">{p.customer_name || '—'}</td>
                                <td className="px-6 py-3 text-sm font-semibold text-gray-900 dark:text-white">{formatAmount(p.amount, i18n.language)} {t('common.somoni')}</td>
                                <td className="px-6 py-3"><StatusBadge status={p.status.toLowerCase()} t={t} /></td>
                                <td className="px-6 py-3 text-sm text-gray-400">{formatDate(p.created_at)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>

                  <div className="bg-white dark:bg-[#1A1A2E] rounded-2xl border border-gray-200 dark:border-white/10 overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-200 dark:border-white/10">
                      <h3 className="font-bold text-gray-900 dark:text-white inline-flex items-center gap-2">
                        <Users className="w-5 h-5 text-[var(--accent)]" aria-hidden="true" />
                        {t('admin.recentUsers')}
                      </h3>
                    </div>
                    {crm.recentUsers.length === 0 ? (
                      <div className="py-8 text-center text-sm text-gray-400">{t('admin.notFound')}</div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead>
                            <tr className="border-b border-gray-200 dark:border-white/10">
                              <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">{t('admin.user')}</th>
                              <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">{t('admin.email')}</th>
                              <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">{t('admin.role')}</th>
                              <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">{t('admin.status')}</th>
                              <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">{t('admin.date')}</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                            {crm.recentUsers.map((u) => (
                              <tr key={u.id} className="hover:bg-gray-50 dark:hover:bg-white/5 transition">
                                <td className="px-6 py-3 text-sm font-medium text-gray-900 dark:text-white">{u.display_name || u.email}</td>
                                <td className="px-6 py-3 text-sm text-gray-500">{u.email}</td>
                                <td className="px-6 py-3">
                                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${u.role === 'ADMIN' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-700'}`}>
                                    {u.role === 'ADMIN' ? t('admin.admin') : t('admin.customer')}
                                  </span>
                                </td>
                                <td className="px-6 py-3"><StatusBadge status={u.is_active ? 'active' : 'blocked'} t={t} /></td>
                                <td className="px-6 py-3 text-sm text-gray-400">{formatDate(u.created_at)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="py-12 text-center text-sm text-gray-400">{t('admin.notFound')}</div>
              )}
            </div>
          )}

          {activeTab === 'users' && (
            <div>
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h1 className="text-2xl font-bold text-gray-900 dark:text-white inline-flex items-center gap-2.5">
                    <Users className="w-6 h-6 text-[var(--accent)] shrink-0" aria-hidden="true" />
                    {t('admin.usersManagement')}
                  </h1>
                  <p className="text-sm text-gray-500 mt-0.5">{t('admin.platformManagement')}</p>
                </div>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder={t('admin.search')}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 pr-4 py-2 bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[var(--accent)] transition w-64"
                  />
                </div>
              </div>

              {usersLoading ? (
                <div className="flex justify-center py-16">
                  <div className="w-10 h-10 border-4 border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
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
                          <tr
                            key={u.id}
                            onClick={() => openProfile(u)}
                            className="hover:bg-gray-50 dark:hover:bg-white/5 transition cursor-pointer"
                          >
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                {u.avatar_url ? (
                                  <img src={u.avatar_url} alt="" className="w-9 h-9 rounded-full object-cover" />
                                ) : (
                                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[var(--accent)] to-[#1A1A2E] flex items-center justify-center text-white text-xs font-semibold">
                                    {(u.display_name || u.email).charAt(0)}
                                  </div>
                                )}
                                <span className="font-medium text-sm text-gray-900 dark:text-white">{u.display_name || u.email}</span>
                              </div>
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-500">{u.email}</td>
                            <td className="px-6 py-4">
                              <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${u.role === 'ADMIN' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-700'}`}>
                                {u.role === 'ADMIN' ? t('admin.admin') : t('admin.customer')}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <StatusBadge
                                status={((u as any).is_active ?? true) ? 'active' : 'blocked'}
                                t={t}
                              />
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center justify-end gap-1">
                                <button
                                  onClick={(e) => { e.stopPropagation(); openProfile(u); }}
                                  className="p-2 rounded-lg text-blue-600 hover:bg-blue-50 transition"
                                  title={t('admin.viewProfile')}
                                >
                                  <Eye className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={(e) => { e.stopPropagation(); verifyMutation.mutate(u.id); }}
                                  className="p-2 rounded-lg text-emerald-600 hover:bg-emerald-50 transition"
                                  title={t('admin.verifyUser')}
                                >
                                  <CheckCircle className="w-4 h-4" />
                                </button>
                                {(u as any).is_active === false ? (
                                  <button
                                    onClick={(e) => { e.stopPropagation(); unblockMutation.mutate(u.id); }}
                                    className="p-2 rounded-lg text-amber-600 hover:bg-amber-50 transition"
                                    title={t('admin.unblockUser')}
                                  >
                                    <Shield className="w-4 h-4" />
                                  </button>
                                ) : (
                                  <button
                                    onClick={(e) => { e.stopPropagation(); blockMutation.mutate(u.id); }}
                                    className="p-2 rounded-lg text-red-600 hover:bg-red-50 transition"
                                    title={t('admin.blockUser')}
                                  >
                                    <Ban className="w-4 h-4" />
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {filteredUsers.length === 0 && (
                    <div className="py-12 text-center text-sm text-gray-400">{adminApiDown ? t('common.error') : t('admin.notFound')}</div>
                  )}
                </div>
              )}
            </div>
          )}

          {activeTab === 'listings' && (
            <div>
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h1 className="text-2xl font-bold text-gray-900 dark:text-white inline-flex items-center gap-2.5">
                    <FileText className="w-6 h-6 text-[var(--accent)] shrink-0" aria-hidden="true" />
                    {t('admin.listingsManagement')}
                  </h1>
                  <p className="text-sm text-gray-500 mt-0.5">{t('admin.platformManagement')}</p>
                </div>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder={t('admin.search')}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 pr-4 py-2 bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[var(--accent)] transition w-64"
                  />
                </div>
              </div>

              {listingsLoading ? (
                <div className="flex justify-center py-16">
                  <div className="w-10 h-10 border-4 border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
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
                                {(l as any).primary_image ? (
                                  <img src={(l as any).primary_image} alt="" className="w-12 h-12 rounded-xl object-cover" />
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
                              {formatAmount(l.price, i18n.language)} {t('common.somoni')}
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
                                  onClick={() => {
                                    const reason = window.prompt(t('admin.rejectReasonLabel'))
                                    rejectMutation.mutate({ id: l.id, reason: reason || undefined })
                                  }}
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
                    <div className="py-12 text-center text-sm text-gray-400">{adminApiDown ? t('common.error') : t('admin.notFound')}</div>
                  )}
                </div>
              )}
            </div>
          )}

          {activeTab === 'requests' && (
            <div>
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h1 className="text-2xl font-bold text-gray-900 dark:text-white inline-flex items-center gap-2.5">
                    <ClipboardList className="w-6 h-6 text-[var(--accent)] shrink-0" aria-hidden="true" />
                    {t('admin.requestsManagement')}
                  </h1>
                  <p className="text-sm text-gray-500 mt-0.5">{t('admin.platformManagement')}</p>
                </div>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder={t('admin.search')}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 pr-4 py-2 bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[var(--accent)] transition w-64"
                  />
                </div>
              </div>

              {requestsLoading ? (
                <div className="flex justify-center py-16">
                  <div className="w-10 h-10 border-4 border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
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
                                {formatDate(r.created_at)}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  {filteredRequests.length === 0 && (
                    <div className="py-12 text-center text-sm text-gray-400">{adminApiDown ? t('common.error') : t('admin.notFound')}</div>
                  )}
                </div>
              )}
            </div>
          )}

          {activeTab === 'top' && (
            <div>
              <div className="flex items-center justify-between mb-6 gap-3 flex-wrap">
                <div>
                  <h1 className="text-2xl font-bold text-gray-900 dark:text-white inline-flex items-center gap-2">
                    <Crown className="w-6 h-6 text-amber-500" aria-hidden="true" />
                    {t('admin.topManagement')}
                  </h1>
                  <p className="text-sm text-gray-500 mt-0.5">{t('admin.topHint')}</p>
                </div>
                <button
                  type="button"
                  onClick={() => openPlanModal('new')}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 transition"
                  data-testid="top-add-plan"
                >
                  <Plus className="w-4 h-4" />
                  {t('admin.topAddPlan')}
                </button>
              </div>

              {/* Stats — read from /promotions/admin/stats, revenue counts PAID only */}
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
                {[
                  { label: t('admin.topStats.total'), value: topStats?.total ?? 0, cls: 'from-blue-500 to-indigo-600' },
                  { label: t('admin.topStats.active'), value: topStats?.active ?? 0, cls: 'from-emerald-500 to-teal-600' },
                  { label: t('admin.topStats.pending'), value: topStats?.pending ?? 0, cls: 'from-amber-500 to-orange-500' },
                  { label: t('admin.topStats.expired'), value: topStats?.expired ?? 0, cls: 'from-gray-400 to-gray-500' },
                  { label: t('admin.topStats.rejected'), value: topStats?.rejected ?? 0, cls: 'from-red-400 to-rose-500' },
                  {
                    label: t('admin.topRevenue'),
                    value: `${formatAmount(topStats?.revenue ?? 0)} ${t('common.currency')}`,
                    cls: 'from-amber-400 to-yellow-500',
                  },
                ].map((c) => (
                  <div key={c.label} className="bg-white dark:bg-[#1A1A2E] rounded-2xl border border-gray-200 dark:border-white/10 p-4">
                    <div className={`inline-flex w-9 h-9 rounded-xl bg-gradient-to-r ${c.cls} text-white items-center justify-center mb-2`}>
                      <Crown className="w-4 h-4" aria-hidden="true" />
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{c.label}</p>
                    <p className="text-xl font-extrabold text-gray-900 dark:text-white tabular-nums">
                      {topStatsLoading ? '…' : c.value}
                    </p>
                  </div>
                ))}
              </div>

              {/* Filters: status chips + optional listing id lookup */}
              <div className="flex items-center gap-2 flex-wrap mb-4">
                {(['all', 'PENDING', 'ACTIVE', 'EXPIRED', 'REJECTED', 'CANCELLED'] as const).map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setTopStatus(s)}
                    className={`px-3.5 py-1.5 rounded-full text-xs font-bold border transition ${
                      topStatus === s
                        ? 'bg-[var(--accent)] text-white border-transparent shadow'
                        : 'bg-white dark:bg-white/5 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-white/10 hover:border-amber-300'
                    }`}
                  >
                    {s === 'all' ? t('admin.topFilterAll') : t(`admin.topStatus.${s}`)}
                  </button>
                ))}
                <div className="relative ml-auto">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder={t('admin.topSearchPlaceholder')}
                    value={topListingId}
                    onChange={(e) => setTopListingId(e.target.value.replace(/[^0-9]/g, ''))}
                    className="pl-10 pr-4 py-2 bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[var(--accent)] transition w-44"
                  />
                </div>
              </div>

              {/* Promotions table */}
              {topListLoading ? (
                <div className="flex justify-center py-16">
                  <div className="w-10 h-10 border-4 border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
                </div>
              ) : (
                <div className="bg-white dark:bg-[#1A1A2E] rounded-2xl border border-gray-200 dark:border-white/10 overflow-hidden mb-8">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-gray-200 dark:border-white/10">
                          <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">{t('admin.topTable.listing')}</th>
                          <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">{t('admin.topTable.user')}</th>
                          <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">{t('admin.topTable.plan')}</th>
                          <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">{t('admin.topTable.price')}</th>
                          <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">{t('admin.topTable.status')}</th>
                          <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">{t('admin.topTable.payment')}</th>
                          <th className="text-right px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">{t('admin.actions')}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                        {topRows.map((p) => (
                          <tr key={p.id} className="hover:bg-gray-50 dark:hover:bg-white/5 transition" data-testid={`top-row-${p.id}`}>
                            <td className="px-6 py-4">
                              <div>
                                <p className="font-medium text-sm text-gray-900 dark:text-white">{p.listing_title ?? `#${p.listing_id}`}</p>
                                <p className="text-xs text-gray-400">#{p.id} · {formatDate(p.created_at)}</p>
                              </div>
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-300">
                              {p.user_name ?? `#${p.user_id}`}
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-300">
                              {p.plan_name}
                              <span className="block text-xs text-gray-400">{t(`top.dur_${p.duration_key}`)}</span>
                            </td>
                            <td className="px-6 py-4 text-sm font-bold text-gray-900 dark:text-white tabular-nums">
                              {formatAmount(p.price)} {t('common.currency')}
                            </td>
                            <td className="px-6 py-4">
                              <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${TOP_BADGE_STYLES[p.status] || TOP_BADGE_STYLES.CANCELLED}`}>
                                {t(`admin.topStatus.${p.status}`)}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${TOP_BADGE_STYLES[p.payment_status] || TOP_BADGE_STYLES.UNPAID}`}>
                                {t(`admin.topPayment.${p.payment_status}`)}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => setTopSelected(p)}
                                  title={t('admin.topActions.detail')}
                                  className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-white/10 transition"
                                >
                                  <Eye className="w-4 h-4" />
                                </button>
                                {p.status === 'PENDING' && (
                                  <>
                                    <button
                                      type="button"
                                      onClick={() => topApproveMutation.mutate(p.id)}
                                      disabled={topApproveMutation.isPending}
                                      title={t('admin.topActions.approve')}
                                      className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 transition disabled:opacity-50"
                                      data-testid={`top-approve-${p.id}`}
                                    >
                                      <CheckCircle className="w-4 h-4" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => { setTopRejectTarget(p); setTopRejectReason(''); }}
                                      title={t('admin.topActions.reject')}
                                      className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition"
                                      data-testid={`top-reject-${p.id}`}
                                    >
                                      <X className="w-4 h-4" />
                                    </button>
                                  </>
                                )}
                                {p.status === 'ACTIVE' && (
                                  <button
                                    type="button"
                                    onClick={() => topCancelMutation.mutate(p.id)}
                                    disabled={topCancelMutation.isPending}
                                    title={t('admin.topActions.cancel')}
                                    className="p-1.5 rounded-lg text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-500/10 transition disabled:opacity-50"
                                    data-testid={`top-cancel-${p.id}`}
                                  >
                                    <Ban className="w-4 h-4" />
                                  </button>
                                )}
                                {(p.status === 'EXPIRED' || p.status === 'REJECTED' || p.status === 'CANCELLED') && (
                                  <button
                                    type="button"
                                    onClick={() => topActivateMutation.mutate(p.id)}
                                    disabled={topActivateMutation.isPending}
                                    title={t('admin.topActions.activate')}
                                    className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-500/10 transition disabled:opacity-50"
                                    data-testid={`top-activate-${p.id}`}
                                  >
                                    <Play className="w-4 h-4" />
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {topRows.length === 0 && (
                    <div className="py-12 text-center text-sm text-gray-400">{t('admin.notFound')}</div>
                  )}
                </div>
              )}

              {/* Plans */}
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-lg font-bold text-gray-900 dark:text-white inline-flex items-center gap-2">
                  <Crown className="w-5 h-5 text-amber-500" aria-hidden="true" />
                  {t('admin.topPlansTitle')}
                </h2>
              </div>
              <div className="bg-white dark:bg-[#1A1A2E] rounded-2xl border border-gray-200 dark:border-white/10 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200 dark:border-white/10">
                        <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">{t('admin.topTable.plan')}</th>
                        <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">{t('admin.topTable.price')}</th>
                        <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">{t('admin.status')}</th>
                        <th className="text-right px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">{t('admin.actions')}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                      {(topStats?.plans ?? []).map((plan) => (
                        <tr key={plan.id} className="hover:bg-gray-50 dark:hover:bg-white/5 transition" data-testid={`top-plan-${plan.id}`}>
                          <td className="px-6 py-4">
                            <p className="font-medium text-sm text-gray-900 dark:text-white">{plan.name}</p>
                            <p className="text-xs text-gray-400">{t(`top.dur_${plan.duration_key}`)}</p>
                          </td>
                          <td className="px-6 py-4 text-sm font-bold text-gray-900 dark:text-white tabular-nums">
                            {plan.price > 0 ? `${formatAmount(plan.price)} ${t('common.currency')}` : t('top.free')}
                          </td>
                          <td className="px-6 py-4">
                            <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${plan.is_active ? TOP_BADGE_STYLES.ACTIVE : TOP_BADGE_STYLES.CANCELLED}`}>
                              {plan.is_active ? t('admin.active') : t('admin.inactive')}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <button
                              type="button"
                              onClick={() => openPlanModal({ mode: 'edit', plan })}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-[var(--accent)] bg-[var(--accent)]/10 hover:bg-[var(--accent)]/20 transition"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                              {t('admin.topEdit')}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {(topStats?.plans ?? []).length === 0 && !topStatsLoading && (
                  <div className="py-10 text-center text-sm text-gray-400">{t('top.plansEmpty')}</div>
                )}
              </div>

              {/* Detail sheet */}
              {topSelected && (
                <div
                  className="fixed inset-0 z-[70] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
                  onClick={() => setTopSelected(null)}
                >
                  <div
                    role="dialog"
                    aria-modal="true"
                    data-testid="top-detail-modal"
                    className="bg-white dark:bg-[#1a1d24] rounded-2xl border border-gray-200 dark:border-white/10 p-6 w-full max-w-lg shadow-2xl max-h-[85vh] overflow-y-auto"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="flex items-start justify-between gap-3 mb-4">
                      <div>
                        <h3 className="text-lg font-bold text-[#1A1A2E] dark:text-white inline-flex items-center gap-2">
                          <Crown className="w-5 h-5 text-amber-500" aria-hidden="true" />
                          {t('admin.topDetailTitle')} #{topSelected.id}
                        </h3>
                        <p className="text-sm text-gray-500 truncate">{topSelected.listing_title ?? `#${topSelected.listing_id}`}</p>
                      </div>
                      <button type="button" onClick={() => setTopSelected(null)} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-white/10">
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div><span className="text-gray-400 text-xs block">{t('admin.topTable.user')}</span><span className="font-medium text-[#1A1A2E] dark:text-white">{topSelected.user_name ?? `#${topSelected.user_id}`}</span></div>
                      <div><span className="text-gray-400 text-xs block">{t('admin.topTable.plan')}</span><span className="font-medium text-[#1A1A2E] dark:text-white">{topSelected.plan_name}</span></div>
                      <div><span className="text-gray-400 text-xs block">{t('top.durationLabel')}</span><span className="font-medium text-[#1A1A2E] dark:text-white">{t(`top.dur_${topSelected.duration_key}`)}</span></div>
                      <div><span className="text-gray-400 text-xs block">{t('admin.topTable.price')}</span><span className="font-bold text-[#1A1A2E] dark:text-white tabular-nums">{formatAmount(topSelected.price)} {t('common.currency')}</span></div>
                      <div><span className="text-gray-400 text-xs block">{t('admin.status')}</span><span className={`text-xs font-semibold px-2.5 py-1 rounded-full border inline-block ${TOP_BADGE_STYLES[topSelected.status] || ''}`}>{t(`admin.topStatus.${topSelected.status}`)}</span></div>
                      <div><span className="text-gray-400 text-xs block">{t('admin.topTable.payment')}</span><span className={`text-xs font-semibold px-2.5 py-1 rounded-full border inline-block ${TOP_BADGE_STYLES[topSelected.payment_status] || ''}`}>{t(`admin.topPayment.${topSelected.payment_status}`)}</span></div>
                      <div><span className="text-gray-400 text-xs block">{t('admin.topField.created')}</span><span className="text-[#1A1A2E] dark:text-white">{formatDate(topSelected.created_at)}</span></div>
                      <div><span className="text-gray-400 text-xs block">{t('admin.topField.started')}</span><span className="text-[#1A1A2E] dark:text-white">{topSelected.started_at ? formatDate(topSelected.started_at) : '—'}</span></div>
                      <div><span className="text-gray-400 text-xs block">{t('admin.topField.expires')}</span><span className="text-[#1A1A2E] dark:text-white">{topSelected.expires_at ? formatDate(topSelected.expires_at) : '—'}</span></div>
                      <div><span className="text-gray-400 text-xs block">{t('admin.topField.listingId')}</span><span className="text-[#1A1A2E] dark:text-white">#{topSelected.listing_id}</span></div>
                      {topSelected.reject_reason && (
                        <div className="col-span-2 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-100 dark:border-red-500/20 p-3">
                          <span className="text-xs text-red-500 block">{t('admin.topField.rejectReason')}</span>
                          <span className="text-sm text-red-700 dark:text-red-300">{topSelected.reject_reason}</span>
                        </div>
                      )}
                    </div>
                    <div className="flex justify-end gap-2 mt-5">
                      {topSelected.status === 'PENDING' && (
                        <>
                          <button
                            type="button"
                            onClick={() => topRejectMutation.mutate({ id: topSelected.id, reason: '' })}
                            className="px-4 py-2.5 rounded-xl text-sm font-semibold text-red-600 bg-red-50 dark:bg-red-500/10 hover:bg-red-100 dark:hover:bg-red-500/20 transition"
                          >
                            {t('admin.topActions.reject')}
                          </button>
                          <button
                            type="button"
                            onClick={() => topApproveMutation.mutate(topSelected.id)}
                            className="px-4 py-2.5 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 transition"
                          >
                            {t('admin.topActions.approve')}
                          </button>
                        </>
                      )}
                      {topSelected.status === 'ACTIVE' && (
                        <button
                          type="button"
                          onClick={() => topCancelMutation.mutate(topSelected.id)}
                          className="px-4 py-2.5 rounded-xl text-sm font-semibold text-amber-600 bg-amber-50 dark:bg-amber-500/10 hover:bg-amber-100 dark:hover:bg-amber-500/20 transition"
                        >
                          {t('admin.topActions.cancel')}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Reject with a reason */}
              {topRejectTarget && (
                <div
                  className="fixed inset-0 z-[70] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
                  onClick={() => setTopRejectTarget(null)}
                >
                  <div
                    role="dialog"
                    aria-modal="true"
                    data-testid="top-reject-modal"
                    className="bg-white dark:bg-[#1a1d24] rounded-2xl border border-gray-200 dark:border-white/10 p-6 w-full max-w-md shadow-2xl"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <h3 className="text-lg font-bold text-[#1A1A2E] dark:text-white mb-1">{t('admin.topRejectTitle')}</h3>
                    <p className="text-sm text-gray-500 mb-3">{topRejectTarget.listing_title ?? `#${topRejectTarget.listing_id}`}</p>
                    <textarea
                      value={topRejectReason}
                      onChange={(e) => setTopRejectReason(e.target.value)}
                      rows={3}
                      placeholder={t('admin.topRejectPlaceholder')}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[var(--accent)] resize-none"
                      data-testid="top-reject-reason"
                    />
                    <div className="flex justify-end gap-2 mt-4">
                      <button
                        type="button"
                        onClick={() => setTopRejectTarget(null)}
                        className="px-4 py-2.5 rounded-xl text-sm font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/5 transition"
                      >
                        {t('common.cancel')}
                      </button>
                      <button
                        type="button"
                        onClick={() => topRejectMutation.mutate({ id: topRejectTarget.id, reason: topRejectReason.trim() })}
                        disabled={topRejectMutation.isPending}
                        className="px-4 py-2.5 rounded-xl text-sm font-bold text-white bg-red-500 hover:bg-red-600 disabled:opacity-60 transition"
                        data-testid="top-reject-confirm"
                      >
                        {t('common.confirm')}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Plan create / edit */}
              {planModal && (
                <div
                  className="fixed inset-0 z-[70] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
                  onClick={() => setPlanModal(null)}
                >
                  <div
                    role="dialog"
                    aria-modal="true"
                    data-testid="top-plan-modal"
                    className="bg-white dark:bg-[#1a1d24] rounded-2xl border border-gray-200 dark:border-white/10 p-6 w-full max-w-md shadow-2xl space-y-4"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <h3 className="text-lg font-bold text-[#1A1A2E] dark:text-white">
                      {planModal.mode === 'new' ? t('admin.topAddPlan') : t('admin.topEditPlan')}
                    </h3>
                    <label className="block text-sm">
                      <span className="text-gray-500 dark:text-gray-400 text-xs">{t('admin.topPlanName')}</span>
                      <input
                        type="text"
                        value={planForm.name}
                        onChange={(e) => setPlanForm((f) => ({ ...f, name: e.target.value }))}
                        className="mt-1 w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
                      />
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      <label className="block text-sm">
                        <span className="text-gray-500 dark:text-gray-400 text-xs">{t('top.durationLabel')}</span>
                        <select
                          value={planForm.duration_key}
                          onChange={(e) => setPlanForm((f) => ({ ...f, duration_key: e.target.value }))}
                          className="mt-1 w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
                        >
                          {['3h', '1d', '1w', '1m'].map((d) => (
                            <option key={d} value={d}>{t(`top.dur_${d}`)}</option>
                          ))}
                        </select>
                      </label>
                      <label className="block text-sm">
                        <span className="text-gray-500 dark:text-gray-400 text-xs">{t('top.priceLabel')}</span>
                        <input
                          type="number"
                          min={0}
                          step={1}
                          value={planForm.price}
                          onChange={(e) => setPlanForm((f) => ({ ...f, price: e.target.value }))}
                          className="mt-1 w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
                        />
                      </label>
                    </div>
                    <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                      <input
                        type="checkbox"
                        checked={planForm.is_active}
                        onChange={(e) => setPlanForm((f) => ({ ...f, is_active: e.target.checked }))}
                        className="w-4 h-4 accent-[var(--accent)]"
                      />
                      {t('admin.topPlanVisible')}
                    </label>
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setPlanModal(null)}
                        className="px-4 py-2.5 rounded-xl text-sm font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/5 transition"
                      >
                        {t('common.cancel')}
                      </button>
                      <button
                        type="button"
                        onClick={handleSavePlan}
                        disabled={planSaveMutation.isPending}
                        className="px-4 py-2.5 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 disabled:opacity-60 transition"
                        data-testid="top-plan-save"
                      >
                        {t('common.confirm')}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'categories' && (
            <div>
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h1 className="text-2xl font-bold text-gray-900 dark:text-white inline-flex items-center gap-2.5">
                    <FolderTree className="w-6 h-6 text-[var(--accent)] shrink-0" aria-hidden="true" />
                    {t('admin.categoriesManagement')}
                  </h1>
                  <p className="text-sm text-gray-500 mt-0.5">{t('admin.platformManagement')}</p>
                </div>
                <button
                  onClick={() => { setEditingCategory(null); setCategoryName(''); setShowCategoryModal(true); }}
                  className="flex items-center gap-2 bg-[var(--accent)] text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-[var(--accent-hover)] transition shadow-lg shadow-[rgb(var(--accent-rgb)/0.2)]"
                >
                  <Plus className="w-4 h-4" />
                  {t('admin.add')}
                </button>
              </div>

              {categoriesLoading ? (
                <div className="flex justify-center py-16">
                  <div className="w-10 h-10 border-4 border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
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
                                  className="p-2 rounded-lg text-[var(--accent)] hover:bg-[rgb(var(--accent-rgb)/0.1)] transition"
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
                    <div className="py-12 text-center text-sm text-gray-400">{adminApiDown ? t('common.error') : t('admin.notFound')}</div>
                  )}
                </div>
              )}
            </div>
          )}
          {activeTab === 'posts' && (
            <div>
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h1 className="text-2xl font-bold text-gray-900 dark:text-white inline-flex items-center gap-2.5">
                    <MessageSquare className="w-6 h-6 text-[var(--accent)] shrink-0" aria-hidden="true" />
                    {t('admin.postsManagement')}
                  </h1>
                  <p className="text-sm text-gray-500 mt-0.5">{t('admin.postsSubtitle')}</p>
                </div>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder={t('admin.search')}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 pr-4 py-2 bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[var(--accent)] transition w-64"
                  />
                </div>
              </div>

              {/* Status queue: opens on the unprocessed feedback, so anything
                  already handled drops out of the view on its own. */}
              <div className="flex items-center gap-2 flex-wrap mb-4">
                {(
                  [
                    ['pending', 'admin.pending'],
                    ['approved', 'admin.approved'],
                    ['rejected', 'admin.rejected'],
                    ['all', 'admin.filterAll'],
                  ] as const
                ).map(([key, labelKey]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setPostStatus(key)}
                    className={`px-3.5 py-1.5 rounded-full text-xs font-bold border transition ${
                      postStatus === key
                        ? 'bg-[var(--accent)] text-white border-transparent shadow'
                        : 'bg-white dark:bg-white/5 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-white/10 hover:border-amber-300'
                    }`}
                    data-testid={`post-filter-${key}`}
                  >
                    {t(labelKey)}
                  </button>
                ))}
              </div>

              {postsLoading ? (
                <div className="flex justify-center py-16">
                  <div className="w-10 h-10 border-4 border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
                </div>
              ) : (
                <div className="bg-white dark:bg-[#1A1A2E] rounded-2xl border border-gray-200 dark:border-white/10 overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-gray-200 dark:border-white/10">
                          <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">{t('admin.post')}</th>
                          <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">{t('admin.author')}</th>
                          <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">{t('admin.status')}</th>
                          <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">{t('admin.date')}</th>
                          <th className="text-right px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">{t('admin.actions')}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                        {filteredPosts.map((p) => (
                          <tr key={p.id} className="hover:bg-gray-50 dark:hover:bg-white/5 transition" data-testid={`post-row-${p.id}`}>
                            <td
                              className="px-6 py-4 cursor-pointer"
                              onClick={() => setPostDetail(p)}
                              title={t('admin.postDetail')}
                            >
                              <div className="flex items-center gap-3">
                                {p.image_url ? (
                                  /* The 48px thumbnail can never show a real
                                     screenshot, so it wears a zoom badge that
                                     says out loud: click me, the full photo
                                     lives in the detail sheet. */
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setPostDetail(p);
                                    }}
                                    title={t('admin.viewPhoto')}
                                    className="relative w-12 h-12 rounded-xl overflow-hidden shrink-0 group"
                                    data-testid={`post-photo-${p.id}`}
                                  >
                                    <img src={p.image_url} alt="" className="w-full h-full object-cover" />
                                    <span className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                                      <ZoomIn className="w-4 h-4 text-white" aria-hidden="true" />
                                    </span>
                                  </button>
                                ) : (
                                  <div className="w-12 h-12 rounded-xl bg-gray-100 dark:bg-white/5 flex items-center justify-center shrink-0">
                                    <ImageIcon className="w-5 h-5 text-gray-400" />
                                  </div>
                                )}
                                <div className="min-w-0 max-w-xs">
                                  {p.category_id == null && (
                                    <span
                                      className="inline-flex items-center gap-1 px-1.5 py-0.5 mb-1 rounded-md text-[10px] font-bold uppercase tracking-wide bg-[rgb(var(--accent-rgb)/0.12)] text-[var(--accent)]"
                                      data-testid={`post-feedback-badge-${p.id}`}
                                    >
                                      <MessageSquareQuote className="w-3 h-3" aria-hidden="true" />
                                      {t('admin.feedbackBadge')}
                                    </span>
                                  )}
                                  <p className="font-medium text-sm text-gray-900 dark:text-white truncate">{p.title}</p>
                                  <p className="text-xs text-gray-400 truncate">{p.content}</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-500 dark:text-slate-400">{p.author_name || '—'}</td>
                            <td className="px-6 py-4">
                              <StatusBadge status={p.status} t={t} />
                            </td>
                            <td className="px-6 py-4 text-xs text-gray-400">
                              {formatDate(p.created_at)}
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center justify-end gap-1">
                                {p.status !== 'approved' && (
                                  <button
                                    onClick={() => approvePostMutation.mutate(p.id)}
                                    className="p-2 rounded-lg text-emerald-600 hover:bg-emerald-50 transition"
                                    title={t('admin.approvePost')}
                                  >
                                    <CheckCircle className="w-4 h-4" />
                                  </button>
                                )}
                                {p.status !== 'rejected' && (
                                  <button
                                    onClick={() => rejectPostMutation.mutate(p.id)}
                                    className="p-2 rounded-lg text-amber-600 hover:bg-amber-50 transition"
                                    title={t('admin.rejectPost')}
                                  >
                                    <X className="w-4 h-4" />
                                  </button>
                                )}
                                <button
                                  onClick={() => {
                                    if (confirm(`${t('admin.deleteAction')} "${p.title}"?`)) {
                                      deletePostMutation.mutate(p.id);
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
                  {filteredPosts.length === 0 && (
                    <div className="py-12 text-center text-sm text-gray-400">
                      {adminApiDown
                        ? t('common.error')
                        : posts.length === 0
                          ? t('admin.notFound')
                          : t('admin.filterEmpty')}
                    </div>
                  )}
                </div>
              )}

              {/* Full feedback: click a row to read the whole note and see the
                  photo at a real size — the table only fits a preview line. */}
              {postDetail && (
                <div
                  className="fixed inset-0 z-[70] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
                  onClick={() => setPostDetail(null)}
                >
                  <div
                    role="dialog"
                    aria-modal="true"
                    data-testid="post-detail-modal"
                    className="bg-white dark:bg-[#1a1d24] rounded-2xl border border-gray-200 dark:border-white/10 p-6 w-full max-w-2xl shadow-2xl max-h-[85vh] overflow-y-auto"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="min-w-0">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 mb-1.5 rounded-md text-[10px] font-bold uppercase tracking-wide bg-[rgb(var(--accent-rgb)/0.12)] text-[var(--accent)]">
                          <MessageSquareQuote className="w-3 h-3" aria-hidden="true" />
                          {postDetail.category_id == null ? t('admin.feedbackBadge') : t('admin.post')}
                        </span>
                        <h3 className="text-lg font-bold text-[#1A1A2E] dark:text-white">{postDetail.title}</h3>
                        <p className="text-xs text-gray-400">
                          {postDetail.author_name || '—'} · {formatDate(postDetail.created_at)}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setPostDetail(null)}
                        className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-white/10"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>

                    <div className="mb-3">
                      <StatusBadge status={postDetail.status} t={t} />
                    </div>

                    {postDetail.image_url && (
                      <a href={postDetail.image_url} target="_blank" rel="noreferrer" className="block mb-3 group">
                        <img
                          src={postDetail.image_url}
                          alt=""
                          className="w-full max-h-[60vh] object-contain rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/10"
                        />
                        <span className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-[var(--accent)]">
                          <ZoomIn className="w-3.5 h-3.5" aria-hidden="true" />
                          {t('admin.viewPhoto')}
                        </span>
                      </a>
                    )}

                    <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-line leading-relaxed">
                      {postDetail.content}
                    </p>

                    <div className="flex justify-end gap-2 mt-5">
                      {postDetail.status !== 'approved' && (
                        <button
                          type="button"
                          onClick={() => {
                            approvePostMutation.mutate(postDetail.id);
                            setPostDetail(null);
                          }}
                          className="px-4 py-2.5 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 transition"
                          data-testid="post-detail-approve"
                        >
                          {t('admin.approvePost')}
                        </button>
                      )}
                      {postDetail.status !== 'rejected' && (
                        <button
                          type="button"
                          onClick={() => {
                            rejectPostMutation.mutate(postDetail.id);
                            setPostDetail(null);
                          }}
                          className="px-4 py-2.5 rounded-xl text-sm font-semibold text-red-600 bg-red-50 dark:bg-red-500/10 hover:bg-red-100 dark:hover:bg-red-500/20 transition"
                          data-testid="post-detail-reject"
                        >
                          {t('admin.rejectPost')}
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setPostDetail(null)}
                        className="px-4 py-2.5 rounded-xl text-sm font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/5 transition"
                      >
                        {t('common.close')}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </main>
      </div>

      {showCategoryModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[70] flex items-center justify-center p-4" onClick={closeCategoryModal}>
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
                  className="w-full px-4 py-2.5 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[var(--accent)] transition"
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
                  className="flex-1 py-2.5 bg-[var(--accent)] text-white rounded-xl text-sm font-semibold hover:bg-[var(--accent-hover)] disabled:opacity-50 transition shadow-lg shadow-[rgb(var(--accent-rgb)/0.2)]"
                >
                  {saveCategoryMutation.isPending ? t('admin.saving') : t('admin.save')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {profileUser && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[70] flex items-center justify-center p-4" onClick={() => setProfileUser(null)}>
          <div className="bg-white dark:bg-[#1A1A2E] rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-gray-200 dark:border-white/10" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">{t('admin.userProfile')}</h2>
              <button onClick={() => setProfileUser(null)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 transition">
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            <div className="flex items-center gap-4 mb-5">
              {profileUser.avatar_url ? (
                <img src={profileUser.avatar_url} alt="" className="w-16 h-16 rounded-2xl object-cover border border-gray-200 dark:border-white/10" />
              ) : (
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[var(--accent)] to-[#1A1A2E] flex items-center justify-center text-white text-xl font-bold shrink-0">
                  {(profileUser.display_name || profileUser.email).charAt(0).toUpperCase()}
                </div>
              )}
              <div className="min-w-0">
                <p className="text-lg font-bold text-gray-900 dark:text-white truncate">{profileUser.display_name || profileUser.email}</p>
                <p className="text-sm text-gray-500 dark:text-slate-400 truncate">{profileUser.email}</p>
                <div className="flex flex-wrap items-center gap-2 mt-2">
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${profileUser.role === 'ADMIN' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-700'}`}>
                    {profileUser.role === 'ADMIN' ? t('admin.admin') : t('admin.customer')}
                  </span>
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${profileUser.is_verified ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                    {profileUser.is_verified ? t('admin.verifiedUser') : t('admin.notVerified')}
                  </span>
                  <StatusBadge status={profileUser.is_active ? 'active' : 'blocked'} t={t} />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-5">
              <div className="bg-gray-50 dark:bg-white/5 rounded-xl p-3">
                <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1">
                  <Star className="w-3.5 h-3.5" /> {t('admin.rating')}
                </p>
                <p className="text-sm font-bold text-gray-900 dark:text-white mt-1">
                  {profileUser.rating_count
                    ? `${(Number(profileUser.rating_sum) / Number(profileUser.rating_count)).toFixed(1)} (${profileUser.rating_count})`
                    : '—'}
                </p>
              </div>
              <div className="bg-gray-50 dark:bg-white/5 rounded-xl p-3">
                <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1">
                  <FileText className="w-3.5 h-3.5" /> {t('admin.listingsCount')}
                </p>
                <p className="text-sm font-bold text-gray-900 dark:text-white mt-1">{profileUser.listing_count ?? 0}</p>
              </div>
              <div className="bg-gray-50 dark:bg-white/5 rounded-xl p-3">
                <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1">
                  <Phone className="w-3.5 h-3.5" /> {t('admin.phone')}
                </p>
                <p className="text-sm font-bold text-gray-900 dark:text-white mt-1 truncate">{profileUser.phone || '—'}</p>
              </div>
              <div className="bg-gray-50 dark:bg-white/5 rounded-xl p-3">
                <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" /> {t('admin.joinedDate')}
                </p>
                <p className="text-sm font-bold text-gray-900 dark:text-white mt-1">
                  {formatDate(profileUser.created_at)}
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => verifyMutation.mutate(profileUser.id)}
                className="flex-1 py-2.5 border border-emerald-300 text-emerald-700 rounded-xl text-sm font-semibold hover:bg-emerald-50 transition flex items-center justify-center gap-1.5"
              >
                <CheckCircle className="w-4 h-4" /> {t('admin.verifyUser')}
              </button>
              {profileUser.is_active ? (
                <button
                  onClick={() => { blockMutation.mutate(profileUser.id); setProfileUser(null); }}
                  className="flex-1 py-2.5 bg-red-500 text-white rounded-xl text-sm font-semibold hover:bg-red-600 transition flex items-center justify-center gap-1.5"
                >
                  <Ban className="w-4 h-4" /> {t('admin.blockUser')}
                </button>
              ) : (
                <button
                  onClick={() => { unblockMutation.mutate(profileUser.id); setProfileUser(null); }}
                  className="flex-1 py-2.5 bg-[var(--accent)] text-white rounded-xl text-sm font-semibold hover:bg-[var(--accent-hover)] transition flex items-center justify-center gap-1.5"
                >
                  <Shield className="w-4 h-4" /> {t('admin.unblockUser')}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
