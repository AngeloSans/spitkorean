import React, { useEffect, useState } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { getAuthToken } from '@/utils/auth'

// Custom hook
import { useAuth } from '@/hooks/useAuth'

// Layout components
import Sidebar from '@components/layout/Sidebar'
import Footer from '@components/layout/Footer'

// Page components
import Home from '@pages/Home'
import Login from '@pages/Login'
import Register from '@pages/Register'
import Dashboard from '@pages/Dashboard'

// Product-specific pages
import TalkHome from '@pages/talk/TalkHome'
import DramaHome from '@pages/drama/DramaHome'
import TestHome from '@pages/test/TestHome'
import JourneyHome from '@pages/journey/JourneyHome'

// Subscription and profile pages
import Plans from '@pages/subscription/Plans'
import Checkout from '@pages/subscription/Checkout'
import Profile from '@pages/profile/Profile'
import Settings from '@pages/profile/Settings'

// Other pages
// Module not found error: The imported page/component does not exist or the import path is incorrect.
// This causes the app to fail rendering and results in a blank page.
// import Leaderboard from '@pages/Leaderboard'
// import Progress from '@pages/Progress'
// import Help from '@pages/Help'

// Authentication related
import ProtectedRoute from '@components/auth/ProtectedRoute'
import LoadingSpinner from '@components/common/LoadingSpinner'
import { loadInitialAuthState, checkAuthStatus } from '@/store/slices/authSlice'
import { Check } from 'lucide-react'


function App() {
  const dispatch = useDispatch()
  
  useEffect(() => {
    // Check authentication status when the app loads
    dispatch(checkAuthStatus())
    
    // Optionally check every X minutes
    const interval = setInterval(() => {
      dispatch(checkAuthStatus())
    }, 5 * 60 * 1000) // every 5 minutes
    
    return () => clearInterval(interval)
  }, [dispatch])
  
  const { isAuthenticated, isLoading, user } = useAuth()

  useEffect(() => {
    const token = getAuthToken()
    const user = JSON.parse(localStorage.getItem('user'))

    if (token && user) {
      // Load initial Redux state with token and user
      dispatch(loadInitialAuthState({ token, user }))
    } else {
      // If no token, check status with server
      dispatch(checkAuthStatus())
    }
  }, [dispatch])
  
  // Sidebar state management
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  useEffect(() => {
    // Check authentication status on app start
    dispatch(checkAuthStatus())
  }, [dispatch])

  // Sidebar toggle function
  const toggleSidebar = () => {
    setSidebarCollapsed(!sidebarCollapsed)
  }

  // While loading
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <LoadingSpinner size="large" />
      </div>
    )
  }

  // Layout for authenticated (protected) pages
  const AuthenticatedLayout = ({ children }) => (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <div className="flex flex-1">
        <Sidebar 
          collapsed={sidebarCollapsed} 
          onToggle={toggleSidebar}
        />
        <main className={`flex-1 transition-all duration-300 ${
          sidebarCollapsed ? 'ml-16' : 'ml-64'
        }`}>
          <div className="p-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  )

  // Layout for public pages
  const PublicLayout = ({ children }) => (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <main className="flex-1">
        {children}
      </main>
      <Footer />
    </div>
  )

  return (
    <Routes>
      {/* Public routes - no sidebar */}
      <Route path="/" element={
        <PublicLayout>
          <Home />
        </PublicLayout>
      } />
      
      <Route path="/login" element={
        <PublicLayout>
          <Login />
        </PublicLayout>
      } />
      
      <Route path="/register" element={
        <PublicLayout>
          <Register />
        </PublicLayout>
      } />
      
      <Route path="/subscription/plans" element={
        <PublicLayout>
          <Plans />
        </PublicLayout>
      } />
      
      <Route path="/subscription/checkout" element={
        <PublicLayout>
          <Checkout />
        </PublicLayout> 
      } />
      
      {/*
      <Route path="/help" element={
        <PublicLayout>
          <Help />
        </PublicLayout>
      } />
      */}
      
      {/* Protected routes - with sidebar */}
      <Route path="/dashboard" element={
        <ProtectedRoute>
          <AuthenticatedLayout>
            <Dashboard />
          </AuthenticatedLayout>
        </ProtectedRoute>
      } />
      
      <Route path="/profile" element={
        <ProtectedRoute>
          <AuthenticatedLayout>
            <Profile />
          </AuthenticatedLayout>
        </ProtectedRoute>
      } />
      
      <Route path="/profile/settings" element={
        <ProtectedRoute>
          <AuthenticatedLayout>
            <Settings />
          </AuthenticatedLayout>
        </ProtectedRoute>
      } />
      
      <Route path="/profile/edit" element={
        <ProtectedRoute>
          <AuthenticatedLayout>
            <Settings />
          </AuthenticatedLayout>
        </ProtectedRoute>
      } />
      
      {/*
      <Route path="/leaderboard" element={
        <ProtectedRoute>
          <AuthenticatedLayout>
            <Leaderboard />
          </AuthenticatedLayout>
        </ProtectedRoute>
      } />
      */}
      
      {/*
      <Route path="/progress" element={
        <ProtectedRoute>
          <AuthenticatedLayout>
            <Progress />
          </AuthenticatedLayout>
        </ProtectedRoute>
      } />
      */}
      
      {/* Product-specific routes - with sidebar */}
      <Route path="/talk/*" element={
        <ProtectedRoute>
          <AuthenticatedLayout>
            <TalkHome />
          </AuthenticatedLayout>
        </ProtectedRoute>
      } />
      
      <Route path="/drama/*" element={
        <ProtectedRoute>
          <AuthenticatedLayout>
            <DramaHome />
          </AuthenticatedLayout>
        </ProtectedRoute>
      } />
      
      <Route path="/test/*" element={
        <ProtectedRoute>
          <AuthenticatedLayout>
            <TestHome />
          </AuthenticatedLayout>
        </ProtectedRoute>
      } />
      
      <Route path="/journey/*" element={
        <ProtectedRoute>
          <AuthenticatedLayout>
            <JourneyHome />
          </AuthenticatedLayout>
        </ProtectedRoute>
      } />
      
      {/* Handle 404 */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App
