import { useState, useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { authApi, UserProfile } from './api/authApi'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import EquipmentPage from './pages/EquipmentPage'
import BookingsPage from './pages/BookingsPage'
import RentalsPage from './pages/RentalsPage'
import AdminProfilePage from './pages/AdminProfilePage'
import Sidebar from './components/Sidebar'
import Topbar from './components/Navbar'

function App() {
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'))
  const [user, setUser] = useState<UserProfile | null>(null)

  useEffect(() => {
    if (token) {
      localStorage.setItem('token', token)
      authApi.me().then((res) => {
        setUser(res.data.data)
        localStorage.setItem('user', JSON.stringify(res.data.data))
      }).catch(() => {
        setToken(null)
      })
    } else {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      setUser(null)
    }
  }, [token])

  const login = (newToken: string, newUser: any) => {
    setToken(newToken)
    setUser(newUser)
    localStorage.setItem('user', JSON.stringify(newUser))
  }

  const logout = () => {
    setToken(null)
    setUser(null)
    localStorage.removeItem('token')
    localStorage.removeItem('user')
  }

  const handleUserUpdate = (updatedUser: UserProfile) => {
    setUser(updatedUser)
    localStorage.setItem('user', JSON.stringify(updatedUser))
  }

  if (!token) {
    return (
      <Routes>
        <Route path="/login" element={<LoginPage onLogin={login} />} />
        <Route path="/register" element={<RegisterPage onLogin={login} />} />
        <Route path="*" element={<Navigate to="/login" />} />
      </Routes>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-slate-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <svg className="animate-spin w-8 h-8 text-brand-500" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <p className="text-slate-400 text-sm font-medium">Loading...</p>
        </div>
      </div>
    )
  }

  const isAdmin = user.role === 'ADMIN'

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-950">
      <Sidebar user={user} />
      <div className="pl-64">
        <Topbar user={user} onLogout={logout} />
        <main className="p-0">
          <Routes>
            {isAdmin ? (
              <>
                <Route path="/" element={<EquipmentPage />} />
                <Route path="/equipment" element={<EquipmentPage />} />
                <Route path="/bookings" element={<BookingsPage />} />
                <Route path="/rentals" element={<RentalsPage />} />
                <Route path="/admin/profile" element={<AdminProfilePage user={user} onUserUpdate={handleUserUpdate} />} />
                <Route path="*" element={<Navigate to="/" />} />
              </>
            ) : (
              <>
                <Route path="/" element={<EquipmentPage />} />
                <Route path="/equipment" element={<EquipmentPage />} />
                <Route path="/bookings" element={<BookingsPage />} />
                <Route path="/rentals" element={<RentalsPage />} />
                <Route path="/profile" element={<AdminProfilePage user={user} onUserUpdate={handleUserUpdate} />} />
                <Route path="*" element={<Navigate to="/" />} />
              </>
            )}
          </Routes>
        </main>
      </div>
    </div>
  )
}

export default App
