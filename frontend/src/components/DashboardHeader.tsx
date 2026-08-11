'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import LanguageToggle from '@/components/LanguageToggle';
import NotificationCenter from '@/components/NotificationCenter';
import { useAuth, type WorkspaceItem } from '@/lib/auth-context';

export default function DashboardHeader() {
  const router = useRouter();
  const pathname = usePathname();
  const { user, workspaces, activeWorkspace, setActiveWorkspace, logout, loading } = useAuth();
  const { t } = useTranslation();
  const [showWorkspaceDropdown, setShowWorkspaceDropdown] = useState(false);

  if (loading || !user) {
    return null;
  }

  return (
    <div className="flex flex-col border-b border-neutral-200 bg-surface">
      {/* Navigation Header */}
      <header className="flex items-center justify-between px-6 py-3 shadow-xs">
        <div className="flex items-center gap-6">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5">
            <div className="bg-gradient-primary flex h-8 w-8 items-center justify-center rounded-[var(--radius-md)]">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
                <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
              </svg>
            </div>
            <span className="text-base font-bold tracking-tight text-neutral-900">AdSync</span>
          </Link>

          {/* Workspace Switcher */}
          {activeWorkspace && (
            <div className="relative">
              <button
                onClick={() => setShowWorkspaceDropdown(!showWorkspaceDropdown)}
                className="flex items-center gap-2 rounded-[var(--radius-md)] border border-neutral-200 bg-neutral-50 px-3 py-1.5 text-xs font-semibold text-neutral-800 transition-colors hover:bg-neutral-100"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                </svg>
                <span>{activeWorkspace.name}</span>
                <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">
                  {activeWorkspace.role}
                </span>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="m6 9 6 6 6-6" />
                </svg>
              </button>

              {showWorkspaceDropdown && (
                <div className="absolute top-full left-0 z-50 mt-1 w-64 rounded-[var(--radius-md)] border border-neutral-200 bg-surface p-1 shadow-lg">
                  <div className="px-3 py-1.5 text-[11px] font-semibold tracking-wider text-neutral-400 uppercase">
                    Your Workspaces
                  </div>
                  {workspaces.map((ws: WorkspaceItem) => (
                    <button
                      key={ws.id}
                      onClick={() => {
                        setActiveWorkspace(ws);
                        setShowWorkspaceDropdown(false);
                      }}
                      className={`flex w-full items-center justify-between rounded-sm px-3 py-2 text-left text-xs font-medium ${
                        ws.id === activeWorkspace.id
                          ? 'bg-neutral-100 font-semibold text-neutral-900'
                          : 'text-neutral-700 hover:bg-neutral-50'
                      }`}
                    >
                      <span>{ws.name}</span>
                      <span className="text-[10px] text-neutral-500">{ws.role}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Header Actions */}
        <div className="flex items-center gap-4">
          <NotificationCenter />
          <LanguageToggle />

          {/* User Menu */}
          <div className="flex items-center gap-3 border-l border-neutral-200 pl-4">
            <div className="text-right">
              <div className="text-xs font-semibold text-neutral-900">{user.name}</div>
              <div className="flex items-center gap-1 text-[11px] text-neutral-500">
                {user.emailVerifiedAt ? (
                  <span className="text-success font-medium">✓ Verified</span>
                ) : (
                  <span className="text-warning font-medium">⚠️ Unverified</span>
                )}
              </div>
            </div>

            <button
              onClick={() => {
                logout();
                router.push('/login');
              }}
              className="rounded-[var(--radius-md)] border border-neutral-200 px-3 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-100"
            >
              Log Out
            </button>
          </div>
        </div>
      </header>

      {/* Sub-navigation Tabs — horizontally scrollable on mobile */}
      <div className="flex items-center gap-4 sm:gap-6 px-4 sm:px-6 overflow-x-auto scrollbar-hide">
        <Link
          href="/dashboard"
          className={`border-b-2 py-3 text-sm font-semibold transition-colors ${
            pathname === '/dashboard'
              ? 'border-primary text-primary'
              : 'border-transparent text-neutral-500 hover:text-neutral-900'
          }`}
        >
          Overview
        </Link>
        <Link
          href="/dashboard/analytics"
          className={`border-b-2 py-3 text-sm font-semibold transition-colors ${
            pathname === '/dashboard/analytics'
              ? 'border-primary text-primary'
              : 'border-transparent text-neutral-500 hover:text-neutral-900'
          }`}
        >
          Analytics
        </Link>
        <Link
          href="/dashboard/campaigns"
          className={`border-b-2 py-3 text-sm font-semibold transition-colors ${
            pathname.startsWith('/dashboard/campaigns')
              ? 'border-primary text-primary'
              : 'border-transparent text-neutral-500 hover:text-neutral-900'
          }`}
        >
          Campaigns
        </Link>
        <Link
          href="/dashboard/rules"
          className={`border-b-2 py-3 text-sm font-semibold transition-colors ${
            pathname === '/dashboard/rules'
              ? 'border-primary text-primary'
              : 'border-transparent text-neutral-500 hover:text-neutral-900'
          }`}
        >
          Automation Rules
        </Link>
        <Link
          href="/dashboard/creatives"
          className={`border-b-2 py-3 text-sm font-semibold transition-colors ${
            pathname === '/dashboard/creatives'
              ? 'border-primary text-primary'
              : 'border-transparent text-neutral-500 hover:text-neutral-900'
          }`}
        >
          Creative Library
        </Link>
        <Link
          href="/dashboard/team"
          className={`border-b-2 py-3 text-sm font-semibold transition-colors ${
            pathname === '/dashboard/team'
              ? 'border-primary text-primary'
              : 'border-transparent text-neutral-500 hover:text-neutral-900'
          }`}
        >
          Team
        </Link>
        {user.email !== 'admin@adsync.com' && (
          <>
            <Link
              href="/dashboard/billing"
              className={`border-b-2 py-3 text-sm font-semibold transition-colors ${
                pathname === '/dashboard/billing'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-neutral-500 hover:text-neutral-900'
              }`}
            >
              Billing
            </Link>
            <Link
              href="/dashboard/connections"
              className={`border-b-2 py-3 text-sm font-semibold transition-colors ${
                pathname === '/dashboard/connections'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-neutral-500 hover:text-neutral-900'
              }`}
            >
              Connections
            </Link>
          </>
        )}
        {user.email === 'admin@adsync.com' && (
          <Link
            href="/dashboard/admin"
            className={`border-b-2 py-3 text-sm font-semibold transition-colors ${
              pathname === '/dashboard/admin'
                ? 'border-error text-error'
                : 'border-transparent text-error/80 hover:text-error'
            }`}
          >
            👑 Super Admin
          </Link>
        )}
      </div>

      {/* Unverified Email Alert Banner */}
      {!user.emailVerifiedAt && (
        <div className="flex items-center justify-between border-b border-warning/20 bg-warning/10 px-6 py-2.5 text-xs text-warning">
          <div className="flex items-center gap-2">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
            <span>
              <strong>Email Unverified:</strong> Please check your dev console logs for the verification link. Certain actions (like campaign creation & ad connections) require a verified email.
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
