/**
 * Auth Context Provider & Session Manager
 *
 * Manages user state, active workspace selection, JWT token in localStorage,
 * login, signup, logout, and authenticated API fetch calls.
 */

'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import i18n from '@/lib/i18n';

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  locale: string;
  emailVerifiedAt: string | null;
  createdAt: string;
}

export interface WorkspaceItem {
  id: string;
  name: string;
  role: 'OWNER' | 'ADMIN' | 'EDITOR' | 'VIEWER';
  locale: string;
}

interface AuthContextType {
  user: UserProfile | null;
  workspaces: WorkspaceItem[];
  activeWorkspace: WorkspaceItem | null;
  token: string | null;
  loading: boolean;
  login: (token: string, user: UserProfile, workspaces: WorkspaceItem[]) => void;
  signup: (token: string, user: UserProfile, workspace: WorkspaceItem) => void;
  logout: () => void;
  setActiveWorkspace: (workspace: WorkspaceItem) => void;
  reloadSession: () => Promise<void>;
  authFetch: (url: string, options?: RequestInit) => Promise<Response>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [workspaces, setWorkspaces] = useState<WorkspaceItem[]>([]);
  const [activeWorkspace, setActiveWorkspaceState] = useState<WorkspaceItem | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const API_URL = process.env.NEXT_PUBLIC_API_URL || '';

  useEffect(() => {
    // Check saved session in localStorage on mount
    const savedToken = localStorage.getItem('adsync_token');
    const savedWsId = localStorage.getItem('adsync_active_ws');

    if (savedToken) {
      setToken(savedToken);
      fetch(`${API_URL}/api/auth/me`, {
        headers: { Authorization: `Bearer ${savedToken}` },
      })
        .then((res) => {
          if (!res.ok) throw new Error('Session expired');
          return res.json();
        })
        .then((data) => {
          setUser(data.user);
          setWorkspaces(data.workspaces);

          // Restore saved locale from server
          if (data.user.locale && data.user.locale !== i18n.language) {
            i18n.changeLanguage(data.user.locale);
          }

          // Restore active workspace selection
          const matched = data.workspaces.find((w: WorkspaceItem) => w.id === savedWsId);
          const initialWs = matched || data.workspaces[0] || null;
          setActiveWorkspaceState(initialWs);
          if (initialWs) localStorage.setItem('adsync_active_ws', initialWs.id);
        })
        .catch(() => {
          // Token invalid/expired -> clear state
          localStorage.removeItem('adsync_token');
          localStorage.removeItem('adsync_active_ws');
          setToken(null);
          setUser(null);
          setWorkspaces([]);
          setActiveWorkspaceState(null);
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [API_URL]);

  const login = (newToken: string, newUser: UserProfile, newWorkspaces: WorkspaceItem[]) => {
    localStorage.setItem('adsync_token', newToken);
    setToken(newToken);
    setUser(newUser);
    setWorkspaces(newWorkspaces);

    // Restore saved locale from server
    if (newUser.locale && newUser.locale !== i18n.language) {
      i18n.changeLanguage(newUser.locale);
    }

    const initialWs = newWorkspaces[0] || null;
    setActiveWorkspaceState(initialWs);
    if (initialWs) localStorage.setItem('adsync_active_ws', initialWs.id);
  };

  const signup = (newToken: string, newUser: UserProfile, newWorkspace: WorkspaceItem) => {
    localStorage.setItem('adsync_token', newToken);
    setToken(newToken);
    setUser(newUser);
    setWorkspaces([newWorkspace]);
    setActiveWorkspaceState(newWorkspace);
    localStorage.setItem('adsync_active_ws', newWorkspace.id);
  };

  const logout = () => {
    localStorage.removeItem('adsync_token');
    localStorage.removeItem('adsync_active_ws');
    setToken(null);
    setUser(null);
    setWorkspaces([]);
    setActiveWorkspaceState(null);
  };

  const setActiveWorkspace = (workspace: WorkspaceItem) => {
    setActiveWorkspaceState(workspace);
    localStorage.setItem('adsync_active_ws', workspace.id);
  };

  const reloadSession = async () => {
    const currentToken = token || localStorage.getItem('adsync_token');
    if (!currentToken) return;

    try {
      const res = await fetch(`${API_URL}/api/auth/me`, {
        headers: { Authorization: `Bearer ${currentToken}` },
      });
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
        setWorkspaces(data.workspaces);
      }
    } catch {
      // Ignore background reload errors
    }
  };

  const authFetch = (url: string, options: RequestInit = {}) => {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    if (activeWorkspace) {
      headers['X-Workspace-Id'] = activeWorkspace.id;
    }

    return fetch(url.startsWith('http') ? url : `${API_URL}${url}`, {
      ...options,
      headers,
    });
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        workspaces,
        activeWorkspace,
        token,
        loading,
        login,
        signup,
        logout,
        setActiveWorkspace,
        reloadSession,
        authFetch,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
