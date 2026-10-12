import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { CalendarClock, History, Loader2, ClipboardList } from 'lucide-react';
import toast from 'react-hot-toast';
import { rentalRequests, messages } from '../api';
import type { RentalRequest } from '../api';
import BackButton from '../components/ui/BackButton';
import { RequestCard } from './RentalRequestsPage';

/**
 * The rentals this account has actually taken — the owner has already said
 * yes, so the item is (or was) in the renter's hands.
 *
 * The request feed in "Rental requests" mixes everything together: offers
 * still waiting, rejected ones, and the rentals themselves. Once a deal is
 * done it is easy to lose between the rest, and this page exists so a renter
 * always has one obvious place for "what am I holding, until when, and did
 * I pay for it" — the deadline counting the30-minute grace included.
 */
type Tab = 'active' | 'history';

const statusOf = (r: RentalRequest) => (r.status || 'PENDING').toUpperCase();

function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** "18.10.2026 00:30" — the moment the rental really ends: midnight of the
 *  day after the last rental day, Dushanbe time, plus the30-minute grace. */
function deadlineLabel(endDate: string): string {
  const [y, m, d] = endDate.split('-').map(Number);
  const end = new Date(y, (m || 1) - 1, (d || 1) + 1);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(end.getDate())}.${pad(end.getMonth() + 1)}.${end.getFullYear()} 00:30`;
}

export default function MyRentalsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<Tab>('active');

  const { data: mine = [], isLoading } = useQuery({
    queryKey: ['my-requests'],
    queryFn: () => rentalRequests.getMyRequests().then((r) => r.items),
  });

  const cancelMutation = useMutation({
    mutationFn: rentalRequests.cancel,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-requests'] });
      toast.success(t('rentalRequests.requestCancelled'));
    },
    onError: () => toast.error(t('rentalRequests.failedCancel')),
  });

  const messageOwner = async (req: RentalRequest) => {
    try {
      const conv = await messages.createConversation({
        user_id: req.owner_id,
        listing_id: req.listing_id,
      });
      navigate(`/messages?conversation=${conv.id}`);
    } catch {
      toast.error(t('listing.failedToCreate'));
    }
  };

  // Taken means the owner has said yes. Pending offers are not rentals yet
  // and stay in "Rental requests" — this page is about items in hand.
  const today = todayISO();
  const active = mine.filter((r) => statusOf(r) === 'ACCEPTED' && r.end_date >= today);
  const history = mine.filter(
    (r) => statusOf(r) === 'COMPLETED' || (statusOf(r) === 'ACCEPTED' && r.end_date < today),
  );
  const pendingCount = mine.filter((r) => statusOf(r) === 'PENDING').length;

  const list = tab === 'active' ? active : history;
  const isMutating = cancelMutation.isPending;

  const tabs: { key: Tab; label: string; icon: typeof CalendarClock; count: number }[] = [
    { key: 'active', label: t('myRentals.active'), icon: CalendarClock, count: active.length },
    { key: 'history', label: t('myRentals.history'), icon: History, count: history.length },
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0a0a1a] py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <BackButton className="mb-4" />
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-[#1A1A2E] dark:text-white">{t('myRentals.title')}</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">{t('myRentals.subtitle')}</p>
        </div>

        {pendingCount > 0 && (
          <Link
            to="/rental-requests"
            className="flex items-center gap-2.5 mb-6 text-sm font-medium text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 px-4 py-3 rounded-xl hover:bg-amber-100 dark:hover:bg-amber-500/20 transition"
          >
            <ClipboardList className="w-4 h-4 shrink-0" />
            {t('myRentals.pendingNote', { count: pendingCount })}
          </Link>
        )}

        <div className="flex flex-wrap gap-1 glass-section rounded-xl p-1 border border-gray-100 dark:border-white/10 mb-6">
          {tabs.map((tb) => (
            <button
              key={tb.key}
              onClick={() => setTab(tb.key)}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg text-sm font-semibold transition ${
                tab === tb.key
                  ? 'bg-[var(--accent)] text-white shadow-md shadow-[rgb(var(--accent-rgb)/0.2)]'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5'
              }`}
            >
              <tb.icon className="w-4 h-4" />
              {tb.label}
              {tb.count > 0 && (
                <span
                  className={`text-xs px-2 py-0.5 rounded-full ${
                    tab === tb.key ? 'bg-white/20' : 'bg-gray-100 dark:bg-white/10 text-gray-500'
                  }`}
                >
                  {tb.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center gap-2 py-16 text-gray-500 dark:text-gray-400">
            <Loader2 className="w-5 h-5 animate-spin" />
            {t('payment.checking')}
          </div>
        ) : list.length === 0 ? (
          <div className="glass-section rounded-2xl border border-gray-100 dark:border-white/10 py-16 px-6 text-center">
            <CalendarClock className="w-10 h-10 mx-auto text-gray-300 dark:text-gray-600 mb-3" />
            <p className="text-gray-500 dark:text-gray-400 mb-5">
              {tab === 'active' ? t('myRentals.emptyActive') : t('myRentals.emptyHistory')}
            </p>
            <Link
              to="/"
              className="inline-flex items-center gap-2 text-sm font-semibold text-white bg-[var(--accent)] hover:bg-[var(--accent-hover)] px-5 py-2.5 rounded-xl transition shadow-sm shadow-[rgb(var(--accent-rgb)/0.2)]"
            >
              {t('myRentals.browse')}
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {list.map((req) => (
              <RequestCard
                key={req.id}
                req={req}
                type="renter"
                onCancel={tab === 'active' ? cancelMutation.mutate : undefined}
                onMessage={messageOwner}
                isMutating={isMutating}
                deadlineNote={
                  tab === 'active'
                    ? t('myRentals.endsAt', { date: deadlineLabel(req.end_date) })
                    : null
                }
                t={t}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
