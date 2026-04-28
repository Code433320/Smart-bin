import React from 'react'
import { Navigate } from 'react-router'
import { useAuth } from '../contexts/AuthContext'

export default function ProtectedRoute({ children, requiredRole }) {
  const { currentUser, userProfile, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin mx-auto mb-4" />
          <p className="text-text-muted text-sm font-medium">Loading...</p>
        </div>
      </div>
    )
  }

  if (!currentUser) {
    return <Navigate to="/login" replace />
  }

  // If a specific role is required, check it
  if (requiredRole && userProfile?.role !== requiredRole) {
    // Redirect user to their correct dashboard
    const redirectPath = userProfile?.role === 'admin' ? '/admin' : '/dashboard'
    return <Navigate to={redirectPath} replace />
  }

  return children
}
