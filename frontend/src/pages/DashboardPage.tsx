import { useTranslation } from 'react-i18next';
import {
  ArrowDownRight,
  ArrowUpRight,
  DollarSign,
  FolderKanban,
  Ticket,
  Users,
} from 'lucide-react';
import DashboardLayout from '../components/dashboard/DashboardLayout';

const STATS = [
  { key: 'revenue', icon: DollarSign, value: '₅ 248 500', trend: '+12.4%', up: true },
  { key: 'activeUsers', icon: Users, value: '3 482', trend: '+8.1%', up: true },
  { key: 'openTickets', icon: Ticket, value: '46', trend: '-3.2%', up: false },
  { key: 'inProgress', icon: FolderKanban, value: '18', trend: '+5.0%', up: true },
] as const;

const ACTIVITY = [
  { id: 1, user: 'Азиз Каримов', status: 'active', date: '28.09.2026', amount: '₅ 45 000' },
  { id: 2, user: 'Давлат Шерози', status: 'pending', date: '27.09.2026', amount: '₅ 12 800' },
  { id: 3, user: 'Малика Носирова', status: 'active', date: '27.09.2026', amount: '₅ 78 200' },
  { id: 4, user: 'Фаррух Азизов', status: 'closed', date: '26.09.2026', amount: '₅ 9 400' },
  { id: 5, user: 'Зулайхо Рустамова', status: 'pending', date: '25.09.2026', amount: '₅ 33 100' },
];

const PROJECTS = [
  { name: 'Marketplace v2', progress: 78 },
  { name: 'Mobile App', progress: 54 },
  { name: 'Payments API', progress: 92 },
  { name: 'Analytics', progress: 36 },
];

const STATUS_STYLES: Record<string, string> = {
  active: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
  pending: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
  closed: 'bg-gray-500/10 text-gray-500 dark:text-gray-400 border-gray-500/20',
};

export default function DashboardPage() {
  const { t } = useTranslation();

  return (
    <DashboardLayout>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {STATS.map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.key}
              className="rounded-2xl bg-white dark:bg-[#1a1d24] border border-gray-200 dark:border-white/10 p-5 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-black/5 dark:hover:shadow-black/20 transition-all duration-200"
            >
              <div className="flex items-center justify-between mb-4">
                <span className="w-10 h-10 rounded-xl bg-[#FF6B35]/10 text-[#FF6B35] flex items-center justify-center">
                  <Icon className="w-5 h-5" />
                </span>
                <span
                  className={`inline-flex items-center gap-0.5 text-xs font-semibold px-2 py-1 rounded-lg border ${
                    stat.up
                      ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                      : 'bg-red-500/10 text-red-500 border-red-500/20'
                  }`}
                >
                  {stat.up ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
                  {stat.trend}
                </span>
              </div>
              <p className="text-2xl font-bold tracking-tight">{stat.value}</p>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                {t(`dashboard.stats.${stat.key}`)}
                <span className="text-gray-400 dark:text-gray-600"> · {t('dashboard.period')}</span>
              </p>
            </div>
          );
        })}
      </div>

      <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6">
        <div className="lg:col-span-2 rounded-2xl bg-white dark:bg-[#1a1d24] border border-gray-200 dark:border-white/10 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-white/10">
            <h2 className="font-semibold">{t('dashboard.activity')}</h2>
            <span className="text-xs text-gray-400 dark:text-gray-500">{t('dashboard.period')}</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wider text-gray-400 dark:text-gray-500">
                  <th className="px-5 py-3 font-medium">{t('dashboard.table.user')}</th>
                  <th className="px-5 py-3 font-medium">{t('dashboard.table.status')}</th>
                  <th className="px-5 py-3 font-medium">{t('dashboard.table.date')}</th>
                  <th className="px-5 py-3 font-medium text-right">{t('dashboard.table.amount')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                {ACTIVITY.map((row) => (
                  <tr key={row.id} className="hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                    <td className="px-5 py-3.5 font-medium">{row.user}</td>
                    <td className="px-5 py-3.5">
                      <span className={`inline-block px-2.5 py-1 rounded-lg text-xs font-medium border ${STATUS_STYLES[row.status]}`}>
                        {t(`dashboard.statuses.${row.status}`)}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-gray-500 dark:text-gray-400">{row.date}</td>
                    <td className="px-5 py-3.5 text-right font-semibold tabular-nums">{row.amount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="rounded-2xl bg-white dark:bg-[#1a1d24] border border-gray-200 dark:border-white/10 p-5">
          <h2 className="font-semibold mb-5">{t('dashboard.projectProgress')}</h2>
          <div className="space-y-5">
            {PROJECTS.map((project) => (
              <div key={project.name}>
                <div className="flex items-center justify-between mb-2 text-sm">
                  <span className="font-medium truncate">{project.name}</span>
                  <span className="text-gray-400 dark:text-gray-500 tabular-nums ml-2">{project.progress}%</span>
                </div>
                <div className="h-2 rounded-full bg-gray-100 dark:bg-white/10 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-[#FF6B35] to-[#ff9162] transition-all duration-500"
                    style={{ width: `${project.progress}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
