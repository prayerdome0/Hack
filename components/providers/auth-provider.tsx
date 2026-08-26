'use client';

import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  updateProfile,
  type User as FirebaseUser
} from 'firebase/auth';
import { doc, onSnapshot, serverTimestamp, setDoc } from 'firebase/firestore';
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { toast } from 'sonner';
import { auth, db, firebaseConfigured } from '@/lib/firebase';
import type { AppUser, UserRole } from '@/lib/types';

interface AuthContextValue {
  user: FirebaseUser | null;
  profile: AppUser | null;
  loading: boolean;
  configured: boolean;
  isAdmin: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, displayName: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!firebaseConfigured || !auth) {
      setLoading(false);
      return;
    }
    return onAuthStateChanged(auth, (nextUser) => {
      setUser(nextUser);
      if (!nextUser || !db) {
        setProfile(nextUser ? {
          id: nextUser.uid,
          email: nextUser.email || '',
          displayName: nextUser.displayName || undefined,
          photoURL: nextUser.photoURL || undefined,
          role: 'user'
        } : null);
        setLoading(false);
      }
    });
  }, []);

  useEffect(() => {
    if (!user || !db) return;
    setLoading(true);
    return onSnapshot(
      doc(db, 'users', user.uid),
      (snapshot) => {
        const data = snapshot.data();
        setProfile({
          id: user.uid,
          email: user.email || '',
          displayName: user.displayName || data?.displayName || undefined,
          photoURL: user.photoURL || data?.photoURL || undefined,
          role: (data?.role as UserRole) || 'user',
          createdAt: data?.createdAt
        });
        setLoading(false);
      },
      () => {
        setProfile({
          id: user.uid,
          email: user.email || '',
          displayName: user.displayName || undefined,
          photoURL: user.photoURL || undefined,
          role: 'user'
        });
        setLoading(false);
      }
    );
  }, [user]);

  const value = useMemo<AuthContextValue>(() => ({
    user,
    profile,
    loading,
    configured: firebaseConfigured,
    isAdmin: profile?.role === 'admin',
    signIn: async (email, password) => {
      if (!auth) throw new Error('Firebase is not configured. Add your environment variables first.');
      await signInWithEmailAndPassword(auth, email.trim(), password);
      toast.success('Welcome back to SIMZ NAXTY.');
    },
    signUp: async (email, password, displayName) => {
      if (!auth || !db) throw new Error('Firebase is not configured. Add your environment variables first.');
      const credentials = await createUserWithEmailAndPassword(auth, email.trim(), password);
      if (displayName.trim()) await updateProfile(credentials.user, { displayName: displayName.trim() });
      await setDoc(doc(db, 'users', credentials.user.uid), {
        email: email.trim(),
        displayName: displayName.trim() || null,
        role: 'user',
        createdAt: serverTimestamp()
      });
      toast.success('Your SIMZ NAXTY account is ready.');
    },
    signOut: async () => {
      if (auth) await firebaseSignOut(auth);
    }
  }), [user, profile, loading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used inside AuthProvider');
  return value;
}
