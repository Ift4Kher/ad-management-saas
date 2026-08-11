'use client';

import React, { useEffect, useState, useRef } from 'react';

interface NotificationItem {
  id: string;
  title: string;
  message: string;
  type: 'INFO' | 'WARNING' | 'ACTION_REQUIRED';
  status: 'UNREAD' | 'READ' | 'PENDING_CONFIRMATION' | 'CONFIRMED' | 'REJECTED';
  actionType: string | null;
  createdAt: string;
  campaign?: { id: string; name: string; platform: string };
  rule?: { id: string; name: string };
}

export default function NotificationCenter() {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const fetchNotifications = async () => {
    try {
      const workspaceId = localStorage.getItem('adsync_workspace_id');
      const token = localStorage.getItem('adsync_token');
      if (!workspaceId || !token) return;

      const res = await fetch(`http://localhost:4000/api/workspaces/${workspaceId}/notifications`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications || []);
      }
    } catch (err) {
      console.error('Failed to fetch notifications:', err);
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 10000); // poll every 10s
    return () => clearInterval(interval);
  }, []);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const unreadCount = notifications.filter(
    (n) => n.status === 'UNREAD' || n.status === 'PENDING_CONFIRMATION',
  ).length;

  const handleConfirmAction = async (id: string) => {
    setLoading(true);
    try {
      const workspaceId = localStorage.getItem('adsync_workspace_id');
      const token = localStorage.getItem('adsync_token');
      const res = await fetch(
        `http://localhost:4000/api/workspaces/${workspaceId}/notifications/${id}/confirm`,
        {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      if (res.ok) {
        await fetchNotifications();
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to confirm action.');
      }
    } catch (err) {
      console.error('Error confirming action:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDismiss = async (id: string) => {
    try {
      const workspaceId = localStorage.getItem('adsync_workspace_id');
      const token = localStorage.getItem('adsync_token');
      await fetch(`http://localhost:4000/api/workspaces/${workspaceId}/notifications/${id}/dismiss`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      await fetchNotifications();
    } catch (err) {
      console.error('Error dismissing notification:', err);
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setOpen(!open)}
        className="relative p-2 text-neutral-600 hover:text-neutral-900 rounded-lg hover:bg-neutral-100 transition-colors"
        aria-label="Notifications"
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
          />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-error text-[10px] font-bold text-white">
            {unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-96 rounded-xl border border-neutral-200 bg-white shadow-xl z-50 overflow-hidden">
          <div className="flex items-center justify-between border-b border-neutral-100 px-4 py-3 bg-neutral-50">
            <h3 className="text-sm font-bold text-neutral-900">Notifications & Guardrails</h3>
            <span className="text-xs text-neutral-500">{notifications.length} total</span>
          </div>

          <div className="max-h-96 overflow-y-auto divide-y divide-neutral-100">
            {notifications.length === 0 ? (
              <div className="p-6 text-center text-xs text-neutral-500">No notifications yet</div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  className={`p-4 text-xs space-y-2 transition-colors ${
                    n.status === 'PENDING_CONFIRMATION'
                      ? 'bg-warning/5 border-l-4 border-warning'
                      : n.status === 'UNREAD'
                      ? 'bg-primary/5'
                      : 'bg-white'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <span
                      className={`font-semibold ${
                        n.type === 'ACTION_REQUIRED'
                          ? 'text-warning-dark font-bold'
                          : n.type === 'WARNING'
                          ? 'text-warning'
                          : 'text-neutral-900'
                      }`}
                    >
                      {n.title}
                    </span>
                    <span className="text-[10px] text-neutral-400">
                      {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>

                  <p className="text-neutral-600 leading-relaxed">{n.message}</p>

                  {/* EXPLICIT CONFIRMATION GUARDRAIL BUTTONS FOR MONEY-AFFECTING ACTIONS */}
                  {n.status === 'PENDING_CONFIRMATION' ? (
                    <div className="pt-2 flex items-center gap-2">
                      <button
                        disabled={loading}
                        onClick={() => handleConfirmAction(n.id)}
                        className="rounded-md bg-error px-3 py-1.5 text-xs font-bold text-white hover:bg-error/90 shadow-sm transition-colors"
                      >
                        {loading ? 'Executing...' : 'Confirm Pause Campaign'}
                      </button>
                      <button
                        onClick={() => handleDismiss(n.id)}
                        className="rounded-md bg-neutral-100 px-3 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-200"
                      >
                        Dismiss
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between pt-1">
                      <span className="text-[10px] uppercase font-semibold text-neutral-400">
                        Status: {n.status}
                      </span>
                      {n.status === 'UNREAD' && (
                        <button
                          onClick={() => handleDismiss(n.id)}
                          className="text-[11px] text-neutral-500 hover:text-neutral-900 underline"
                        >
                          Mark as read
                        </button>
                      )}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
