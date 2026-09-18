import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { authApi } from '../api/authApi'

interface RegisterPageProps {
  onLogin: (token: string, user: any) => void
}

export default function RegisterPage({ onLogin }: RegisterPageProps) {
  const { t } = useTranslation()
  const [step, setStep] = useState<'email' | 'otp'>('email')
  const [email, setEmail] = useState('')
  const [otpCode, setOtpCode] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [otpSent, setOtpSent] = useState(false)
  const [devCode, setDevCode] = useState('')

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await authApi.sendOtp({ email })
      const { is_registered, sent_via_email, dev_code } = res.data.data as any
      if (is_registered) {
        setError(t('auth.emailExists'))
        setLoading(false)
        return
      }
      if (!sent_via_email && dev_code) {
        setDevCode(dev_code)
      }
      setOtpSent(true)
      setStep('otp')
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to send OTP')
    } finally {
      setLoading(false)
    }
  }

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await authApi.register({ email, otp_code: otpCode })
      const { access_token, user } = res.data.data
      onLogin(access_token, user)
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Invalid OTP code')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-slate-950">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-12 h-12 bg-brand-600 rounded-xl flex items-center justify-center mx-auto mb-4">
            <span className="text-white font-bold text-xl">R</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('auth.rentflow')}</h1>
          <p className="text-gray-500 dark:text-slate-400 mt-1">{t('auth.createYourAccount')}</p>
        </div>
        <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-gray-200 dark:border-white/10 p-8">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">{t('auth.register')}</h2>
          {error && (
            <div className="bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 text-sm rounded-lg p-3 mb-4 border border-red-200 dark:border-red-500/20">{error}</div>
          )}

          {step === 'email' ? (
            <form onSubmit={handleSendOtp} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">{t('auth.email')}</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-white/10 rounded-lg bg-white dark:bg-white/5 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none"
                  required
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-brand-600 text-white py-2.5 rounded-lg font-medium hover:bg-brand-700 disabled:opacity-50 transition"
              >
                {loading ? t('auth.sending') : t('auth.sendOtp')}
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerifyOtp} className="space-y-4">
              <div className="bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 text-sm rounded-lg p-3">
                {t('auth.otpSentTo')} <strong>{email}</strong>
              </div>
              {devCode && (
                <div className="bg-yellow-50 dark:bg-yellow-500/10 border border-yellow-200 dark:border-yellow-500/20 text-yellow-800 dark:text-yellow-400 text-sm rounded-lg p-3">
                  <strong>{t('auth.devMode')}</strong> {t('auth.yourOtpCode')} <span className="font-mono font-bold text-lg">{devCode}</span>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">{t('auth.otpCode')}</label>
                <input
                  type="text"
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-white/10 rounded-lg bg-white dark:bg-white/5 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none text-center text-2xl tracking-[0.3em] font-mono"
                  placeholder="000000"
                  maxLength={6}
                  required
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-brand-600 text-white py-2.5 rounded-lg font-medium hover:bg-brand-700 disabled:opacity-50 transition"
              >
                {loading ? t('auth.creating') : t('auth.createAccount')}
              </button>
              <button
                type="button"
                onClick={() => { setStep('email'); setOtpCode(''); setError(''); setOtpSent(false) }}
                className="w-full text-gray-500 dark:text-slate-400 py-2 rounded-lg font-medium hover:text-gray-700 dark:hover:text-white transition text-sm"
              >
                {t('auth.backToEmail')}
              </button>
            </form>
          )}

          <p className="text-sm text-gray-500 dark:text-slate-400 mt-4 text-center">
            {t('auth.hasAccount')}{' '}
            <Link to="/login" className="text-brand-600 hover:text-brand-700 font-medium">{t('auth.signIn')}</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
