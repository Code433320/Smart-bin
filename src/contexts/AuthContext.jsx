import React, { createContext, useContext, useState, useEffect } from 'react'
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  updateProfile,
} from 'firebase/auth'
import { auth, googleProvider } from '../firebase/config'
import { createUserProfile, getUserProfile } from '../services/firestore'

const AuthContext = createContext()

export function useAuth() {
  return useContext(AuthContext)
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null)
  const [userProfile, setUserProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  // Sign up with email/password
  async function signup(email, password, displayName, role = 'user', rtdbName = null) {
    const cred = await createUserWithEmailAndPassword(auth, email, password)
    await updateProfile(cred.user, { displayName })
    const profile = await createUserProfile(cred.user.uid, {
      email,
      displayName,
      role,
      ...(rtdbName ? { rtdbName } : {}), // Bridge to RTDB user node
    })
    setUserProfile({ id: cred.user.uid, ...profile })
    return cred.user
  }

  // Login with email/password
  async function login(email, password) {
    const cred = await signInWithEmailAndPassword(auth, email, password)
    let profile = await getUserProfile(cred.user.uid)
    
    // Auto-create profile if it doesn't exist (for old accounts)
    if (!profile) {
      const newProfile = await createUserProfile(cred.user.uid, {
        email: cred.user.email,
        displayName: cred.user.displayName || email.split('@')[0],
        role: 'user'
      })
      profile = { id: cred.user.uid, ...newProfile }
    }
    
    setUserProfile(profile)
    return { user: cred.user, profile }
  }

  // Login with Google
  async function loginWithGoogle() {
    const cred = await signInWithPopup(auth, googleProvider)
    const profile = await createUserProfile(cred.user.uid, {
      email: cred.user.email,
      displayName: cred.user.displayName,
      photoURL: cred.user.photoURL,
      role: 'user',
    })
    setUserProfile({ id: cred.user.uid, ...profile })
    return { user: cred.user, profile: { id: cred.user.uid, ...profile } }
  }

  // Logout
  async function logout() {
    setUserProfile(null)
    await signOut(auth)
  }

  // Refresh user profile from Firestore
  async function refreshProfile() {
    if (currentUser) {
      const profile = await getUserProfile(currentUser.uid)
      setUserProfile(profile)
      return profile
    }
    return null
  }

  // Listen for auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user)
      if (user) {
        try {
          const profile = await getUserProfile(user.uid)
          setUserProfile(profile)
        } catch (err) {
          console.error('Error fetching profile:', err)
          setUserProfile(null)
        }
      } else {
        setUserProfile(null)
      }
      setLoading(false)
    })

    return unsubscribe
  }, [])

  const value = {
    currentUser,
    userProfile,
    loading,
    signup,
    login,
    loginWithGoogle,
    logout,
    refreshProfile,
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}
