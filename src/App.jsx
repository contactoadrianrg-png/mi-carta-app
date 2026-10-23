import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AuthProvider, useAuth } from './context/AuthContext'
import AuthPage from './pages/AuthPage'
import DashboardPage from './pages/DashboardPage'
import PublicMenuPage from './pages/PublicMenuPage'
import CategoryPage from './pages/CategoryPage'
import WelcomePage from './pages/WelcomePage'
import AdminPage from './pages/AdminPage'
import ResetPasswordPage from './pages/ResetPasswordPage'
import DiscoverMenuPage from './pages/DiscoverMenuPage'

const ADMIN_EMAIL = 'infocreativeadrian@gmail.com'

function Spinner() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-500" />
    </div>
  )
}

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <Spinner />
  return user ? children : <Navigate to="/login" replace />
}

function GuestRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <Spinner />
  if (!user) return children
  return user.email?.toLowerCase().trim() === ADMIN_EMAIL
    ? <Navigate to="/admin" replace />
    : <Navigate to="/dashboard" replace />
}

function AdminRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <Spinner />
  if (!user) return <Navigate to="/login" replace />
  if (user.email?.toLowerCase().trim() !== ADMIN_EMAIL) return <Navigate to="/dashboard" replace />
  return children
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<GuestRoute><AuthPage /></GuestRoute>} />
      <Route path="/login" element={<Navigate to="/" state={{ authMode: 'login' }} replace />} />
      <Route path="/register" element={<Navigate to="/" replace />} />
      <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
      <Route path="/carta/:slug" element={<WelcomePage />} />
      <Route path="/carta/:slug/menu" element={<PublicMenuPage />} />
      <Route path="/carta/:slug/descubre" element={<DiscoverMenuPage />} />
      <Route path="/carta/:slug/:catId" element={<CategoryPage />} />
      <Route path="/admin" element={<AdminRoute><AdminPage /></AdminRoute>} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Toaster position="top-right" toastOptions={{ duration: 3000 }} />
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  )
}
