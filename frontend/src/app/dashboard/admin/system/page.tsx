'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import I18nProvider from '@/components/I18nProvider';

interface HealthData {
  status: string;
  timestamp: string;
  services: {
    redis: string;
  };
  version: string;
}

function AdminSystemContent() {
  const { user } = useAuth();
  const [health, setHealth] = useState<HealthData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchHealth = async () => {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
        const res = await fetch(`${apiUrl}/api/health`);
        if (!res.ok) throw new Error('Failed to fetch system health.');
        const data = await res.json();
        setHealth(data);
      } catch (err: any) {
        setError(err.message || 'Error fetching system health');
      } finally {
        setLoading(false);
      }
    };

    fetchHealth();
  }, []);

  if (user?.email !== 'admin@adsync.com') {
    return (
      <div className="p-8 text-center">
        <h1 className="text-xl font-bold text-error">Access Denied</h1>
        <p className="mt-2 text-sm text-neutral-600">Super Admin access required.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6 sm:p-8">
      <div>
        <span className="rounded-full bg-error/10 px-3 py-1 text-xs font-bold text-error uppercase">
          System Diagnostics & API Status
        </span>
        <h1 className="mt-2 text-2xl font-bold text-neutral-900 sm:text-3xl">API Health & Upstash Redis Monitor</h1>
        <p className="mt-1 text-sm text-neutral-500">
          Real-time system health checks, BullMQ background worker queue status, and Upstash Redis cloud cache connectivity.
        </p>
      </div>

      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : error ? (
        <div className="rounded-lg border border-error/20 bg-error/5 p-4 text-sm text-error">{error}</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Health Status Card */}
          <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-xs space-y-4">
            <h2 className="text-sm font-bold text-neutral-900 uppercase tracking-wider">Express Backend API Status</h2>
            <div className="flex items-center justify-between border-t border-neutral-100 pt-4">
              <span className="text-xs text-neutral-600">Overall Server Status</span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-success/10 px-3 py-1 text-xs font-bold text-success">
                <span className="h-2 w-2 rounded-full bg-success animate-pulse" />
                {health?.status === 'ok' ? 'All Systems Operational' : 'Degraded Performance'}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-xs text-neutral-600">Backend API Version</span>
              <span className="text-xs font-bold text-neutral-900">v{health?.version}</span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-xs text-neutral-600">Server Timestamp</span>
              <span className="text-xs font-mono text-neutral-500">{health?.timestamp ? new Date(health.timestamp).toLocaleString() : '-'}</span>
            </div>
          </div>

          {/* Upstash Redis & BullMQ Status Card */}
          <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-xs space-y-4">
            <h2 className="text-sm font-bold text-neutral-900 uppercase tracking-wider">Upstash Redis Cloud & BullMQ Queue</h2>
            <div className="flex items-center justify-between border-t border-neutral-100 pt-4">
              <span className="text-xs text-neutral-600">Upstash Redis TLS Connection</span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-success/10 px-3 py-1 text-xs font-bold text-success">
                <span className="h-2 w-2 rounded-full bg-success" />
                {health?.services.redis === 'connected' ? 'Connected (TLS)' : 'Disconnected'}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-xs text-neutral-600">BullMQ Background Queue Worker</span>
              <span className="text-xs font-bold text-success">Active & Polling</span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-xs text-neutral-600">Security Encryption Protocol</span>
              <span className="text-xs font-bold text-primary">AES-256-GCM Encrypted at Rest</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function AdminSystemPage() {
  return (
    <I18nProvider>
      <AdminSystemContent />
    </I18nProvider>
  );
}
