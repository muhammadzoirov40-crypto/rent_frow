import { useState, useRef, useEffect } from 'react'
import { authApi } from '../api/authApi'

type AuthView =
  | 'login-email'
  | 'login-verification'
  | 'login-success'
  | 'register-email'
  | 'register-verification'
  | 'register-success'

interface AuthPageProps {
  onAuth: (token: string, user: any) => void
}

export default function AuthPage({ onAuth }: AuthPageProps) {
  const [view, setView] = useState<AuthView>('login-email')
  const viewRef = useRef(view)
  viewRef.current = view

  const [email, setEmail] = useState('')
  const emailRef = useRef(email)
  emailRef.current = email

  const [otpDigits, setOtpDigits] = useState(['', '', '', '', '', ''])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [resendTimer, setResendTimer] = useState(0)
  const [shakeOtp, setShakeOtp] = useState(false)
  const [devCode, setDevCode] = useState('')
  const otpRefs = useRef<(HTMLInputElement | null)[]>([])

  useEffect(() => {
    if (resendTimer <= 0) return
    const t = setTimeout(() => setResendTimer((s) => s - 1), 1000)
    return () => clearTimeout(t)
  }, [resendTimer])

  const resetOtp = () => {
    setOtpDigits(['', '', '', '', '', ''])
    setError('')
    setShakeOtp(false)
  }

  const goBackToEmail = () => {
    resetOtp()
    setResendTimer(0)
    setDevCode('')
    if (viewRef.current === 'login-verification') setView('login-email')
    else if (viewRef.current === 'register-verification') setView('register-email')
  }

  const isLogin = view.startsWith('login')
  const isVerification = view === 'login-verification' || view === 'register-verification'
  const isSuccess = view === 'login-success' || view === 'register-success'
  const otpCode = otpDigits.join('')

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!email.trim()) {
      setError('Please enter your email address')
      return
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Please enter a valid email address')
      return
    }
    setLoading(true)
    try {
      const res = await authApi.sendOtp({ email: email.trim() })
      const { is_registered, sent_via_email, dev_code } = res.data.data as any

      if (isLogin && !is_registered) {
        setError('Email not found. Please register first.')
        setLoading(false)
        return
      }
      if (!isLogin && is_registered) {
        setError('Email already registered. Please sign in instead.')
        setLoading(false)
        return
      }

      if (!sent_via_email && dev_code) {
        setDevCode(dev_code)
      }

      resetOtp()
      setResendTimer(45)
      if (isLogin) {
        setView('login-verification')
      } else {
        setView('register-verification')
      }
      setTimeout(() => otpRefs.current[0]?.focus(), 300)
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to send OTP')
    } finally {
      setLoading(false)
    }
  }

  const verifyCode = async (code: string) => {
    setError('')
    setLoading(true)
    try {
      let res
      if (isLogin) {
        res = await authApi.login({ email: emailRef.current, otp_code: code })
      } else {
        res = await authApi.register({ email: emailRef.current, otp_code: code })
      }
      const { access_token, user } = res.data.data
      if (isLogin) {
        setView('login-success')
      } else {
        setView('register-success')
      }
      setTimeout(() => {
        onAuth(access_token, user)
      }, 1500)
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Invalid or expired OTP code')
      setShakeOtp(true)
      setTimeout(() => setShakeOtp(false), 500)
      setOtpDigits(['', '', '', '', '', ''])
      setTimeout(() => otpRefs.current[0]?.focus(), 100)
    } finally {
      setLoading(false)
    }
  }

  const handleOtpChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return
    const newDigits = [...otpDigits]
    newDigits[index] = value.slice(-1)
    setOtpDigits(newDigits)
    setError('')

    if (value && index < 5) {
      otpRefs.current[index + 1]?.focus()
    }

    const full = newDigits.join('')
    if (full.length === 6) {
      setTimeout(() => verifyCode(full), 300)
    }
  }

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace') {
      e.preventDefault()
      if (!otpDigits[index] && index > 0) {
        const newDigits = [...otpDigits]
        newDigits[index - 1] = ''
        setOtpDigits(newDigits)
        otpRefs.current[index - 1]?.focus()
      } else {
        const newDigits = [...otpDigits]
        newDigits[index] = ''
        setOtpDigits(newDigits)
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      otpRefs.current[index - 1]?.focus()
    } else if (e.key === 'ArrowRight' && index < 5) {
      otpRefs.current[index + 1]?.focus()
    }
  }

  const handleOtpPaste = (e: React.ClipboardEvent) => {
    e.preventDefault()
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    if (!pasted) return
    const newDigits = pasted.split('').concat(Array(6 - pasted.length).fill('')).slice(0, 6)
    setOtpDigits(newDigits)
    const nextEmpty = newDigits.findIndex((d) => d === '')
    otpRefs.current[nextEmpty === -1 ? 5 : nextEmpty]?.focus()

    if (pasted.length === 6) {
      setTimeout(() => verifyCode(pasted), 300)
    }
  }

  const handleResend = async () => {
    if (resendTimer > 0) return
    resetOtp()
    setDevCode('')
    setLoading(true)
    try {
      const res = await authApi.sendOtp({ email: emailRef.current })
      const { sent_via_email, dev_code } = res.data.data as any
      if (!sent_via_email && dev_code) {
        setDevCode(dev_code)
      }
      setResendTimer(45)
      otpRefs.current[0]?.focus()
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to resend OTP')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative min-h-screen overflow-hidden flex items-center justify-center"
      style={{ background: 'linear-gradient(135deg, #c8a96e 0%, #d4a843 25%, #e8c96a 50%, #d4a843 75%, #c8a96e 100%)' }}
    >
      {/* Floating Spheres */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {[
          { size: 180, x: '10%', y: '15%', delay: 0, dur: 7, color: 'rgba(255,213,79,0.35)' },
          { size: 120, x: '75%', y: '10%', delay: 1.5, dur: 9, color: 'rgba(255,183,77,0.3)' },
          { size: 200, x: '60%', y: '65%', delay: 0.8, dur: 8, color: 'rgba(255,236,179,0.4)' },
          { size: 90, x: '20%', y: '75%', delay: 2, dur: 6, color: 'rgba(255,179,0,0.25)' },
          { size: 150, x: '85%', y: '45%', delay: 0.5, dur: 10, color: 'rgba(255,224,130,0.35)' },
          { size: 100, x: '40%', y: '5%', delay: 3, dur: 7.5, color: 'rgba(255,213,79,0.3)' },
          { size: 70, x: '50%', y: '85%', delay: 1, dur: 6.5, color: 'rgba(255,183,77,0.25)' },
          { size: 220, x: '30%', y: '40%', delay: 2.5, dur: 11, color: 'rgba(255,236,179,0.25)' },
        ].map((s, i) => (
          <div
            key={i}
            className="absolute rounded-full"
            style={{
              width: s.size,
              height: s.size,
              left: s.x,
              top: s.y,
              background: `radial-gradient(circle at 30% 30%, ${s.color}, transparent 70%)`,
              filter: 'blur(1px)',
              animation: `floatSphere ${s.dur}s ease-in-out ${s.delay}s infinite alternate`,
              boxShadow: `0 0 ${s.size / 2}px ${s.color}`,
            }}
          />
        ))}
      </div>

      <style>{`
        @keyframes floatSphere {
          0% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(15px, -20px) scale(1.05); }
          66% { transform: translate(-10px, 15px) scale(0.95); }
          100% { transform: translate(5px, -10px) scale(1.02); }
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(30px) scale(0.97); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes successPulse {
          0% { transform: scale(0.5); opacity: 0; }
          50% { transform: scale(1.15); }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          20% { transform: translateX(-8px); }
          40% { transform: translateX(8px); }
          60% { transform: translateX(-5px); }
          80% { transform: translateX(5px); }
        }
      `}</style>

      {/* Glass Card */}
      <div className="relative z-10 w-full max-w-md mx-4" style={{ animation: 'slideUp 0.6s ease-out' }}>
        <div
          className="rounded-[2rem] p-8 sm:p-10"
          style={{
            background: 'rgba(255, 255, 255, 0.12)',
            backdropFilter: 'blur(24px)',
            WebkitBackdropFilter: 'blur(24px)',
            border: '1px solid rgba(255, 255, 255, 0.25)',
            boxShadow: '0 8px 60px rgba(0, 0, 0, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.2)',
          }}
        >
          {isSuccess ? (
            <div className="text-center py-6" style={{ animation: 'fadeIn 0.5s ease-out' }}>
              <div className="w-20 h-20 mx-auto mb-5 rounded-full flex items-center justify-center"
                style={{ background: 'linear-gradient(135deg, #4ade80, #22c55e)', boxShadow: '0 8px 30px rgba(34,197,94,0.4)', animation: 'successPulse 0.6s ease-out' }}>
                <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">
                {isLogin ? 'Email verified' : 'Account created successfully'}
              </h2>
              <p className="text-white/70 text-sm">Redirecting you to the app...</p>
            </div>
          ) : isVerification ? (
            <div style={{ animation: 'fadeIn 0.4s ease-out' }}>
              <div className="text-center mb-8">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center"
                  style={{ background: 'rgba(255, 255, 255, 0.15)', border: '1px solid rgba(255, 255, 255, 0.2)' }}>
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold text-white mb-2">Verify your email</h2>
                <p className="text-white/70 text-sm">We sent a verification code to</p>
                <p className="text-white font-semibold text-sm mt-1">{email}</p>
              </div>

              {devCode && (
                <div className="mb-5 px-4 py-3 rounded-xl text-sm font-medium text-center"
                  style={{ background: 'rgba(255, 179, 0, 0.2)', border: '1px solid rgba(255, 179, 0, 0.3)', color: '#fde68a' }}>
                  <strong>Dev mode:</strong> Your OTP code is <span className="font-mono font-bold text-lg">{devCode}</span>
                </div>
              )}

              {error && (
                <div className="mb-5 px-4 py-3 rounded-xl text-sm font-medium text-center"
                  style={{
                    background: 'rgba(239, 68, 68, 0.2)',
                    border: '1px solid rgba(239, 68, 68, 0.3)',
                    color: '#fca5a5',
                    animation: shakeOtp ? 'shake 0.5s ease-in-out' : 'none',
                  }}>
                  {error}
                </div>
              )}

              <div className="flex justify-center gap-2.5 sm:gap-3 mb-6"
                style={{ animation: shakeOtp ? 'shake 0.5s ease-in-out' : 'none' }}>
                {otpDigits.map((digit, i) => (
                  <input
                    key={i}
                    ref={(el) => { otpRefs.current[i] = el }}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleOtpChange(i, e.target.value)}
                    onKeyDown={(e) => handleOtpKeyDown(i, e)}
                    onPaste={handleOtpPaste}
                    onFocus={(e) => e.target.select()}
                    className="w-11 h-14 sm:w-12 sm:h-16 text-center text-xl sm:text-2xl font-bold rounded-xl outline-none transition-all duration-200"
                    style={{
                      background: digit ? 'rgba(255, 255, 255, 0.95)' : 'rgba(255, 255, 255, 0.8)',
                      color: '#1a1a2e',
                      caretColor: '#d97706',
                      border: digit ? '2px solid rgba(255, 213, 79, 0.8)' : '2px solid rgba(255, 255, 255, 0.3)',
                      boxShadow: digit
                        ? '0 0 0 3px rgba(255, 213, 79, 0.15), 0 4px 12px rgba(0,0,0,0.08)'
                        : '0 4px 12px rgba(0,0,0,0.06)',
                    }}
                  />
                ))}
              </div>

              <button
                onClick={() => { if (otpCode.length === 6) verifyCode(otpCode) }}
                disabled={otpCode.length !== 6 || loading}
                className="w-full py-3.5 rounded-xl font-semibold text-sm transition-all duration-200 mb-4"
                style={{
                  background: otpCode.length === 6 ? 'linear-gradient(135deg, #f59e0b, #d97706)' : 'rgba(255, 255, 255, 0.15)',
                  color: otpCode.length === 6 ? 'white' : 'rgba(255, 255, 255, 0.4)',
                  cursor: otpCode.length === 6 && !loading ? 'pointer' : 'not-allowed',
                  boxShadow: otpCode.length === 6 ? '0 4px 20px rgba(245, 158, 11, 0.35)' : 'none',
                  border: 'none',
                }}
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Verifying...
                  </span>
                ) : 'Verify'}
              </button>

              <div className="text-center mb-4">
                {resendTimer > 0 ? (
                  <p className="text-white/50 text-xs">
                    Resend code in{' '}
                    <span className="text-white/70 font-mono font-semibold">
                      {String(Math.floor(resendTimer / 60)).padStart(2, '0')}:{String(resendTimer % 60).padStart(2, '0')}
                    </span>
                  </p>
                ) : (
                  <button onClick={handleResend} className="text-white/80 hover:text-white text-xs font-semibold transition underline underline-offset-2">
                    Resend Code
                  </button>
                )}
              </div>

              <button onClick={goBackToEmail} className="w-full text-center text-white/60 hover:text-white text-xs font-medium transition py-2">
                Change email
              </button>
            </div>
          ) : (
            <div style={{ animation: 'fadeIn 0.4s ease-out' }}>
              <div className="text-center mb-8">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center"
                  style={{ background: 'linear-gradient(135deg, rgba(255,213,79,0.4), rgba(255,183,77,0.3))', border: '1px solid rgba(255, 255, 255, 0.2)', boxShadow: '0 4px 20px rgba(255, 179, 0, 0.2)' }}>
                  <span className="text-white font-bold text-2xl">R</span>
                </div>
                <h2 className="text-2xl font-bold text-white mb-2">
                  {isLogin ? 'Login' : 'Create account'}
                </h2>
                <p className="text-white/60 text-sm">We'll send a verification code to your email.</p>
              </div>

              {error && (
                <div className="mb-5 px-4 py-3 rounded-xl text-sm font-medium text-center"
                  style={{ background: 'rgba(239, 68, 68, 0.2)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#fca5a5' }}>
                  {error}
                </div>
              )}

              <form onSubmit={handleEmailSubmit} className="space-y-5">
                <div>
                  <label className="block text-white/70 text-xs font-semibold mb-2 uppercase tracking-wider">Email Address</label>
                  <div className="relative">
                    <div className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none">
                      <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => { setEmail(e.target.value); setError('') }}
                      placeholder="you@example.com"
                      className="w-full pl-11 pr-4 py-3.5 rounded-xl text-sm outline-none transition-all duration-200"
                      style={{ background: 'rgba(255, 255, 255, 0.9)', color: '#1a1a2e', border: '2px solid transparent', boxShadow: '0 4px 16px rgba(0,0,0,0.06)' }}
                      onFocus={(e) => { e.currentTarget.style.borderColor = 'rgba(255, 213, 79, 0.6)'; e.currentTarget.style.boxShadow = '0 0 0 4px rgba(255, 213, 79, 0.12), 0 4px 16px rgba(0,0,0,0.06)' }}
                      onBlur={(e) => { e.currentTarget.style.borderColor = 'transparent'; e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.06)' }}
                      autoFocus
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading || !email.trim()}
                  className="w-full py-3.5 rounded-xl font-semibold text-sm transition-all duration-200"
                  style={{
                    background: email.trim() ? 'linear-gradient(135deg, #f59e0b, #d97706)' : 'rgba(255, 255, 255, 0.15)',
                    color: email.trim() ? 'white' : 'rgba(255, 255, 255, 0.4)',
                    cursor: email.trim() && !loading ? 'pointer' : 'not-allowed',
                    boxShadow: email.trim() ? '0 4px 20px rgba(245, 158, 11, 0.35)' : 'none',
                    border: 'none',
                  }}
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Sending code...
                    </span>
                  ) : 'Continue'}
                </button>
              </form>

              <div className="mt-6 text-center">
                <p className="text-white/50 text-xs">
                  {isLogin ? "Don't have an account? " : 'Already have an account? '}
                  <button onClick={() => { setView(isLogin ? 'register-email' : 'login-email'); resetOtp(); setError(''); setDevCode('') }}
                    className="text-white font-semibold hover:underline underline-offset-2 transition">
                    {isLogin ? 'Register' : 'Login'}
                  </button>
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
