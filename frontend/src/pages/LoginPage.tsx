import { useState, useRef, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Mail, Lock, User, ArrowLeft, Loader2, CheckCircle2, Eye, EyeOff } from 'lucide-react';
import toast from 'react-hot-toast';
import { auth } from '../api';
import useAuthStore from '../store/authStore';

type AuthMode = 'login' | 'register';
type Step = 'email' | 'otp';

export default function LoginPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { login: storeLogin, isAuthenticated } = useAuthStore();
  const [mode, setMode] = useState<AuthMode>('login');
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [otpDigits, setOtpDigits] = useState(['', '', '', '', '', '']);
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  useEffect(() => {
    if (resendTimer <= 0) return;
    const timer = setTimeout(() => setResendTimer((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendTimer]);

  const sendOtpMutation = useMutation({
    mutationFn: auth.sendOtp,
    onSuccess: (data) => {
      setStep('otp');
      setResendTimer(60);
      toast.success(t('auth.otpSentTo'));
      setTimeout(() => otpRefs.current[0]?.focus(), 300);
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || t('auth.emailNotFound'));
    },
  });

  const verifyOtpMutation = useMutation({
    mutationFn: (code: string) => auth.login(email, code),
    onSuccess: (data) => {
      storeLogin(data.access_token, data.user);
      toast.success(t('auth.welcome'));
      navigate('/');
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || t('auth.invalidOtp'));
      setOtpDigits(['', '', '', '', '', '']);
      setTimeout(() => otpRefs.current[0]?.focus(), 100);
    },
  });

  const registerMutation = useMutation({
    mutationFn: (code: string) =>
      auth.register({ email, otp_code: code, display_name: displayName }),
    onSuccess: (data) => {
      storeLogin(data.access_token, data.user);
      toast.success(t('auth.accountCreated'));
      navigate('/');
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || t('auth.registrationError'));
    },
  });

  const loginMutation = useMutation({
    mutationFn: ({ email: e, password: p }: { email: string; password: string }) =>
      auth.login(e, p),
    onSuccess: (data) => {
      storeLogin(data.access_token, data.user);
      toast.success(t('auth.welcome'));
      navigate('/');
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || t('auth.invalidCredentials'));
    },
  });

  const handleSendOtp = (e: React.FormEvent) => {
    e.preventDefault();
    sendOtpMutation.mutate(email);
  };

  const handleOtpChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    const newDigits = [...otpDigits];
    newDigits[index] = value.slice(-1);
    setOtpDigits(newDigits);
    if (value && index < 5) {
      otpRefs.current[index + 1]?.focus();
    }
    const full = newDigits.join('');
    if (full.length === 6) {
      setTimeout(() => {
        if (mode === 'login') {
          verifyOtpMutation.mutate(full);
        } else {
          registerMutation.mutate(full);
        }
      }, 300);
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace') {
      e.preventDefault();
      if (!otpDigits[index] && index > 0) {
        const newDigits = [...otpDigits];
        newDigits[index - 1] = '';
        setOtpDigits(newDigits);
        otpRefs.current[index - 1]?.focus();
      } else {
        const newDigits = [...otpDigits];
        newDigits[index] = '';
        setOtpDigits(newDigits);
      }
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!pasted) return;
    const newDigits = pasted.split('').concat(Array(6 - pasted.length).fill('')).slice(0, 6);
    setOtpDigits(newDigits);
    const nextEmpty = newDigits.findIndex((d) => d === '');
    otpRefs.current[nextEmpty === -1 ? 5 : nextEmpty]?.focus();
    if (pasted.length === 6) {
      setTimeout(() => {
        if (mode === 'login') {
          verifyOtpMutation.mutate(pasted);
        } else {
          registerMutation.mutate(pasted);
        }
      }, 300);
    }
  };

  const handleResend = () => {
    if (resendTimer > 0) return;
    setOtpDigits(['', '', '', '', '', '']);
    sendOtpMutation.mutate(email);
  };

  const goBack = () => {
    setStep('email');
    setOtpDigits(['', '', '', '', '', '']);
  };

  const toggleMode = () => {
    setMode(mode === 'login' ? 'register' : 'login');
    setStep('email');
    setOtpDigits(['', '', '', '', '', '']);
    setEmail('');
    setDisplayName('');
    setPassword('');
  };

  const isSending = sendOtpMutation.isPending;
  const isVerifying = verifyOtpMutation.isPending || registerMutation.isPending;
  const otpCode = otpDigits.join('');

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#1A1A2E] dark:bg-[#1A1A2E] px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4"
            style={{ background: 'linear-gradient(135deg, #FF6B35, #e85d2c)' }}>
            <span className="text-white font-bold text-2xl">R</span>
          </div>
          <h1 className="text-2xl font-bold text-white">{t('auth.rentflow')}</h1>
          <p className="text-gray-400 mt-1 text-sm">{t('auth.equipmentRentalMgmt')}</p>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <h2 className="text-lg font-bold text-[#1A1A2E] mb-1">
            {step === 'otp'
              ? t('auth.enterCode')
              : mode === 'login'
                ? t('auth.signIn')
                : t('auth.signUp')}
          </h2>
          {step === 'email' && (
            <p className="text-sm text-gray-500 mb-6">
              {mode === 'login'
                ? t('auth.signInSubtitle')
                : t('auth.signUpSubtitle')}
            </p>
          )}
          {step === 'otp' && (
            <p className="text-sm text-gray-500 mb-6">
              {t('auth.codeSentTo')} <span className="font-medium text-[#1A1A2E]">{email}</span>
            </p>
          )}

          {step === 'email' ? (
            <form onSubmit={handleSendOtp} className="space-y-4">
              {mode === 'register' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('auth.name')}</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      placeholder={t('auth.namePlaceholder')}
                      className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl bg-gray-50 dark:bg-gray-50 text-[#1A1A2E] focus:ring-2 focus:ring-[#FF6B35]/30 focus:border-[#FF6B35] outline-none text-sm transition"
                      required
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('auth.email')}</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={t('auth.emailPlaceholder')}
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl bg-gray-50 dark:bg-gray-50 text-[#1A1A2E] focus:ring-2 focus:ring-[#FF6B35]/30 focus:border-[#FF6B35] outline-none text-sm transition"
                    autoFocus
                    required
                  />
                </div>
              </div>

              {mode === 'register' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('auth.password')}</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder={t('auth.passwordPlaceholder')}
                      className="w-full pl-10 pr-10 py-2.5 border border-gray-200 rounded-xl bg-gray-50 dark:bg-gray-50 text-[#1A1A2E] focus:ring-2 focus:ring-[#FF6B35]/30 focus:border-[#FF6B35] outline-none text-sm transition"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={isSending}
                className="w-full bg-[#FF6B35] text-white py-2.5 rounded-xl font-semibold text-sm hover:bg-[#e85d2c] disabled:opacity-50 transition flex items-center justify-center gap-2"
              >
                {isSending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  t('auth.sendOtp')
                )}
              </button>
            </form>
          ) : (
            <div className="space-y-5">
              <div className="flex justify-center gap-2.5">
                {otpDigits.map((digit, i) => (
                  <input
                    key={i}
                    ref={(el) => { otpRefs.current[i] = el; }}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleOtpChange(i, e.target.value)}
                    onKeyDown={(e) => handleOtpKeyDown(i, e)}
                    onPaste={handleOtpPaste}
                    onFocus={(e) => e.target.select()}
                    className="w-11 h-13 text-center text-xl font-bold rounded-xl border-2 border-gray-200 bg-gray-50 dark:bg-gray-50 text-[#1A1A2E] focus:ring-2 focus:ring-[#FF6B35]/30 focus:border-[#FF6B35] outline-none transition"
                  />
                ))}
              </div>

              <button
                onClick={() => {
                  if (otpCode.length === 6) {
                    if (mode === 'login') {
                      verifyOtpMutation.mutate(otpCode);
                    } else {
                      registerMutation.mutate(otpCode);
                    }
                  }
                }}
                disabled={otpCode.length !== 6 || isVerifying}
                className="w-full bg-[#FF6B35] text-white py-2.5 rounded-xl font-semibold text-sm hover:bg-[#e85d2c] disabled:opacity-50 transition flex items-center justify-center gap-2"
              >
                {isVerifying ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : mode === 'login' ? (
                  t('auth.signIn')
                ) : (
                  t('auth.signUp')
                )}
              </button>

              <div className="text-center">
                {resendTimer > 0 ? (
                  <p className="text-gray-400 text-xs">
                    {t('auth.resendIn')}{' '}
                    <span className="font-mono font-semibold text-gray-600">
                      {String(Math.floor(resendTimer / 60)).padStart(2, '0')}:{String(resendTimer % 60).padStart(2, '0')}
                    </span>
                  </p>
                ) : (
                  <button
                    onClick={handleResend}
                    className="text-[#FF6B35] text-xs font-semibold hover:underline"
                  >
                    {t('auth.resendOtp')}
                  </button>
                )}
              </div>

              <button
                onClick={goBack}
                className="w-full text-gray-500 py-2 rounded-xl text-sm font-medium hover:text-[#1A1A2E] transition flex items-center justify-center gap-1.5"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                {t('auth.changeEmail')}
              </button>
            </div>
          )}

          <div className="mt-6 pt-5 border-t border-gray-100 text-center">
            <p className="text-sm text-gray-500">
              {mode === 'login' ? t('auth.noAccount') : t('auth.hasAccount')}{' '}
              <button
                onClick={toggleMode}
                className="text-[#FF6B35] font-semibold hover:underline"
              >
                {mode === 'login' ? t('auth.register') : t('auth.signIn')}
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
