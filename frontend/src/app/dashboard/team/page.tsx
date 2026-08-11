'use client';

import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/lib/auth-context';

interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: 'OWNER' | 'ADMIN' | 'EDITOR' | 'VIEWER';
  emailVerified: boolean;
  joinedAt: string;
}

export default function TeamPage() {
  const { activeWorkspace } = useAuth();
  const { t } = useTranslation();
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'ADMIN' | 'EDITOR' | 'VIEWER'>('EDITOR');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isUserAdmin = activeWorkspace?.role === 'OWNER' || activeWorkspace?.role === 'ADMIN';

  const fetchMembers = async () => {
    try {
      const workspaceId = localStorage.getItem('adsync_workspace_id');
      const token = localStorage.getItem('adsync_token');
      if (!workspaceId || !token) return;

      const res = await fetch(`http://localhost:4000/api/workspaces/${workspaceId}/members`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        const data = await res.json();
        setMembers(data.members || []);
      }
    } catch (err) {
      console.error('Failed to fetch team members:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMembers();
  }, []);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const workspaceId = localStorage.getItem('adsync_workspace_id');
      const token = localStorage.getItem('adsync_token');

      const res = await fetch(`http://localhost:4000/api/workspaces/${workspaceId}/members/invite`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ email: inviteEmail, role: inviteRole }),
      });

      if (res.ok) {
        setShowInviteModal(false);
        setInviteEmail('');
        await fetchMembers();
      } else {
        const data = await res.json();
        setError(data.error || 'Failed to invite team member.');
      }
    } catch (err) {
      console.error('Error inviting member:', err);
      setError('Network error inviting member.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateRole = async (userId: string, newRole: 'ADMIN' | 'EDITOR' | 'VIEWER') => {
    try {
      const workspaceId = localStorage.getItem('adsync_workspace_id');
      const token = localStorage.getItem('adsync_token');

      const res = await fetch(`http://localhost:4000/api/workspaces/${workspaceId}/members/${userId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ role: newRole }),
      });

      if (res.ok) {
        await fetchMembers();
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to update role.');
      }
    } catch (err) {
      console.error('Error updating role:', err);
    }
  };

  const handleRemoveMember = async (userId: string, memberName: string) => {
    if (!confirm(t('team.remove_confirm', { name: memberName }))) return;

    try {
      const workspaceId = localStorage.getItem('adsync_workspace_id');
      const token = localStorage.getItem('adsync_token');

      const res = await fetch(`http://localhost:4000/api/workspaces/${workspaceId}/members/${userId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        await fetchMembers();
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to remove member.');
      }
    } catch (err) {
      console.error('Error removing member:', err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">{t('team.title')}</h1>
          <p className="text-sm text-neutral-500">{t('team.subtitle')}</p>
        </div>
        {isUserAdmin && (
          <button
            onClick={() => setShowInviteModal(true)}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-dark transition-colors shadow-xs self-start sm:self-auto"
          >
            {t('team.invite_member')}
          </button>
        )}
      </div>

      {/* Team Table — responsive: horizontal scroll on small screens */}
      <div className="rounded-xl border border-neutral-200 bg-white shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-sm text-neutral-500">{t('cta.loading')}</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm min-w-[640px]">
              <thead className="bg-neutral-50 text-xs text-neutral-500 uppercase tracking-wider">
                <tr>
                  <th className="px-4 sm:px-6 py-4 font-semibold">{t('team.user')}</th>
                  <th className="px-4 sm:px-6 py-4 font-semibold">{t('team.email')}</th>
                  <th className="px-4 sm:px-6 py-4 font-semibold">{t('team.role')}</th>
                  <th className="px-4 sm:px-6 py-4 font-semibold">{t('team.status')}</th>
                  <th className="px-4 sm:px-6 py-4 font-semibold">{t('team.joined')}</th>
                  {isUserAdmin && <th className="px-4 sm:px-6 py-4 font-semibold">{t('team.actions')}</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {members.map((m) => (
                  <tr key={m.id} className="hover:bg-neutral-50 transition-colors">
                    <td className="px-4 sm:px-6 py-4 font-medium text-neutral-900 flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs uppercase shrink-0">
                        {m.name.charAt(0)}
                      </div>
                      <span className="truncate">{m.name}</span>
                    </td>
                    <td className="px-4 sm:px-6 py-4 text-neutral-600 font-mono text-xs">{m.email}</td>
                    <td className="px-4 sm:px-6 py-4">
                      {isUserAdmin && m.role !== 'OWNER' ? (
                        <select
                          value={m.role}
                          onChange={(e) => handleUpdateRole(m.id, e.target.value as any)}
                          className="rounded-md border border-neutral-300 bg-white px-2 py-1 text-xs font-semibold text-neutral-700"
                        >
                          <option value="ADMIN">ADMIN</option>
                          <option value="EDITOR">EDITOR</option>
                          <option value="VIEWER">VIEWER</option>
                        </select>
                      ) : (
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold ${
                            m.role === 'OWNER'
                              ? 'bg-purple-100 text-purple-700'
                              : m.role === 'ADMIN'
                              ? 'bg-primary/10 text-primary'
                              : m.role === 'EDITOR'
                              ? 'bg-success/10 text-success'
                              : 'bg-neutral-100 text-neutral-600'
                          }`}
                        >
                          {m.role}
                        </span>
                      )}
                    </td>
                    <td className="px-4 sm:px-6 py-4 text-xs">
                      {m.emailVerified ? (
                        <span className="text-success font-medium">{t('team.verified')}</span>
                      ) : (
                        <span className="text-warning font-medium">{t('team.pending_verification')}</span>
                      )}
                    </td>
                    <td className="px-4 sm:px-6 py-4 text-xs text-neutral-500">
                      {new Date(m.joinedAt).toLocaleDateString()}
                    </td>
                    {isUserAdmin && (
                      <td className="px-4 sm:px-6 py-4">
                        {m.role !== 'OWNER' && (
                          <button
                            onClick={() => handleRemoveMember(m.id, m.name)}
                            className="text-xs text-error hover:underline font-semibold"
                          >
                            {t('team.remove')}
                          </button>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Invite Member Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl space-y-4">
            <h2 className="text-lg font-bold text-neutral-900">{t('team.invite_title')}</h2>

            <form onSubmit={handleInvite} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">{t('team.email_label')}</label>
                <input
                  type="email"
                  required
                  placeholder={t('team.email_placeholder')}
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:outline-hidden focus:ring-2 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">{t('team.role_label')}</label>
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value as any)}
                  className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm bg-white"
                >
                  <option value="ADMIN">{t('team.role_admin')}</option>
                  <option value="EDITOR">{t('team.role_editor')}</option>
                  <option value="VIEWER">{t('team.role_viewer')}</option>
                </select>
              </div>

              {error && (
                <div className="p-3 rounded-lg border border-error/20 bg-error/10 text-xs text-error font-medium">
                  {error}
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-neutral-100">
                <button
                  type="button"
                  onClick={() => setShowInviteModal(false)}
                  className="rounded-lg border border-neutral-300 px-4 py-2 text-sm font-semibold text-neutral-700 hover:bg-neutral-50"
                >
                  {t('cta.cancel')}
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-dark"
                >
                  {submitting ? t('team.inviting') : t('team.send_invite')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
