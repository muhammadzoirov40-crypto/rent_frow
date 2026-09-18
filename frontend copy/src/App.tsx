import { useState, useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import AuthPage from './pages/AuthPage'
import EquipmentPage from './pages/EquipmentPage'
import BookingsPage from './pages/BookingsPage'
import RentalsPage from './pages/RentalsPage'
import Navbar from './components/Navbar'

function App() {
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'))
  const [user, setUser] = useState<any>(null)

  useEffect(() => {
    if (token) {
      localStorage.setItem('token', token)
    } else {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
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

  if (!token) {
    return (
      <Routes>
        <Route path="/login" element={<AuthPage onAuth={login} />} />
        <Route path="/register" element={<AuthPage onAuth={login} />} />
        <Route path="*" element={<Navigate to="/login" />} />
      </Routes>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar user={user || JSON.parse(localStorage.getItem('user') || '{}')} onLogout={logout} />
      <main className="max-w-7xl mx-auto px-4 py-8">
        <Routes>
          <Route path="/" element={<EquipmentPage />} />
          <Route path="/bookings" element={<BookingsPage />} />
          <Route path="/rentals" element={<RentalsPage />} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </main>
    </div>
  )
}

export default App
