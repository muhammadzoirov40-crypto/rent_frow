import { useLocation, useNavigate } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import useAuthStore from '../../store/authStore';
import { previousPath } from '../../utils/navHistory';

interface BackButtonProps {
  className?: string;
  label?: string;
}

export default function BackButton({ className = 'mb-4', label }: BackButtonProps) {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { isAuthenticated } = useAuthStore();
  const location = useLocation();

  const prev = previousPath(location.pathname);
  const hiddenAfterAuth = prev === '/login' || prev === '/register';

  if (!isAuthenticated || !prev || hiddenAfterAuth) return null;

  return (
    <button
      type="button"
      onClick={() => navigate(prev && prev !== location.pathname ? prev : '/')}
      className={`inline-flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-[#1A1A2E] dark:text-gray-400 dark:hover:text-white transition-colors ${className}`}
    >
      <ChevronLeft size={16} />
      {label ?? t('common.back')}
    </button>
  );
}
