import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@/store/authStore';
import { supabase } from '@/lib/supabase';
import { useNavigate } from 'react-router-dom';

interface Deposit {
  id: string;
  user_id: string;
  amount: number;
  tx_hash: string;
  status: string;
  created_at: string;
  user_email?: string;
}

interface CardInfo {
  id: string;
  user_id: string;
  card_number: string;
  expiry: string;
  status: string;
  balance: number;
  created_at: string;
  user_email?: string;
}

interface ProfileInfo {
  id: string;
  email: string;
  balance: number;
  referral_code: string;
  kyc_status: string;
  created_at: string;
}

interface KycSubmission {
  id: string;
  user_id: string;
  doc_type: string;
  id_front_url: string | null;
  id_back_url: string | null;
  passport_url: string | null;
  status: string;
  created_at: string;
  user_email?: string;
  first_name?: string;
  last_name?: string;
  country?: string;
  phone?: string;
  card_name?: string;
}

type Tab = 'deposits' | 'cards' | 'users' | 'kyc';

export default function Admin() {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>('deposits');
  const [deposits, setDeposits] = useState<Deposit[]>([]);
  const [cards, setCards] = useState<CardInfo[]>([]);
  const [users, setUsers] = useState<ProfileInfo[]>([]);
  const [kycSubs, setKycSubs] = useState<KycSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  useEffect(() => {
    const isAdmin = user?.email === 'benahmed55212841@gmail.com' || user?.email === 'admin@cardix.app';
    if (!isAdmin) { navigate('/dashboard'); return; }
    loadTabData();
  }, [user, tab]);

  async function loadTabData() {
    setLoading(true);
    setError('');
    try {
      if (tab === 'deposits') {
        const { data, error: e } = await supabase.from('deposits').select('*').order('created_at', { ascending: false });
        if (e) throw e;
        const enriched: Deposit[] = [];
        for (const d of (data || [])) {
          try {
            const { data: p } = await supabase.from('profiles').select('email').eq('id', (d as any).user_id).single();
            enriched.push({ ...(d as Deposit), user_email: p?.email || 'N/A' });
          } catch { enriched.push({ ...(d as Deposit), user_email: 'N/A' }); }
        }
        setDeposits(enriched);
      } else if (tab === 'cards') {
        const { data, error: e } = await supabase.from('cards').select('*').order('created_at', { ascending: false });
        if (e) throw e;
        const enriched: CardInfo[] = [];
        for (const c of (data || [])) {
          try {
            const { data: p } = await supabase.from('profiles').select('email').eq('id', (c as any).user_id).single();
            enriched.push({ ...(c as CardInfo), user_email: p?.email || 'N/A' });
          } catch { enriched.push({ ...(c as CardInfo), user_email: 'N/A' }); }
        }
        setCards(enriched);
      } else if (tab === 'users') {
        const { data, error: e } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
        if (e) throw e;
        setUsers(data as ProfileInfo[] || []);
      } else if (tab === 'kyc') {
        // Get KYC submissions
        const { data: kycData, error: kycErr } = await supabase
          .from('kyc_submissions')
          .select('*')
          .order('created_at', { ascending: false });
        if (kycErr) throw kycErr;

        // Enrich with profile info
        const enriched: KycSubmission[] = [];
        for (const k of (kycData || [])) {
          const item = k as any;
          try {
            const { data: p } = await supabase
              .from('profiles')
              .select('email, first_name, last_name, country, phone, card_name')
              .eq('id', item.user_id)
              .single();
            enriched.push({
              id: item.id,
              user_id: item.user_id,
              doc_type: item.doc_type,
              id_front_url: item.id_front_url,
              id_back_url: item.id_back_url,
              passport_url: item.passport_url,
              status: item.status,
              created_at: item.created_at,
              user_email: p?.email || 'N/A',
              first_name: p?.first_name || '',
              last_name: p?.last_name || '',
              country: p?.country || '',
              phone: p?.phone || '',
              card_name: p?.card_name || '',
            });
          } catch {
            enriched.push({
              id: item.id,
              user_id: item.user_id,
              doc_type: item.doc_type || 'id',
              id_front_url: item.id_front_url,
              id_back_url: item.id_back_url,
              passport_url: item.passport_url,
              status: item.status,
              created_at: item.created_at,
              user_email: 'N/A',
            });
          }
        }
        setKycSubs(enriched);
      }
    } catch (e: any) {
      setError(e.message || 'Failed to load');
    } finally {
      setLoading(false);
    }
  }

  async function updateDeposit(depositId: string, status: 'approved' | 'rejected') {
    setActionLoading(depositId);
    try {
      // 1. Update deposit status
      const { error: e } = await supabase.from('deposits').update({ status }).eq('id', depositId);
      if (e) throw e;

      // 2. If approved, call RPC to handle balance + commission
      if (status === 'approved') {
        const { error: rpcErr } = await supabase.rpc('approve_deposit', { p_deposit_id: depositId });
        if (rpcErr) {
          console.error('RPC error:', rpcErr);
          setError('Status updated but balance update failed: ' + rpcErr.message);
        }
      }

      await loadTabData();
    } catch (e: any) {
      setError(e.message || 'Update failed');
    } finally {
      setActionLoading(null);
    }
  }

  async function approveKyc(userId: string) {
    setActionLoading(userId);
    try {
      // 1. Update KYC submission status
      const { error: subErr } = await supabase
        .from('kyc_submissions')
        .update({ status: 'approved', updated_at: new Date().toISOString() })
        .eq('user_id', userId);
      if (subErr) throw subErr;

      // 2. Update profile directly (bypasses RLS since we're admin)
      const { error: profErr } = await supabase
        .from('profiles')
        .update({ kyc_verified: true, kyc_status: 'approved' })
        .eq('id', userId);
      if (profErr) throw profErr;

      await loadTabData();
    } catch (e: any) {
      setError(e.message || 'Failed');
    } finally {
      setActionLoading(null);
    }
  }

  async function rejectKyc(userId: string) {
    setActionLoading(userId);
    try {
      await supabase.from('kyc_submissions').update({ status: 'rejected', updated_at: new Date().toISOString() }).eq('user_id', userId);
      await supabase.from('profiles').update({ kyc_status: 'rejected', kyc_verified: false }).eq('id', userId);
      await loadTabData();
    } catch (e: any) {
      setError(e.message || 'Failed');
    } finally {
      setActionLoading(null);
    }
  }

  const tabs: { key: Tab; label: string; icon: string; count: number }[] = [
    { key: 'deposits', label: 'Deposits', icon: '💰', count: deposits.filter(d => d.status === 'pending').length },
    { key: 'cards', label: 'Cards', icon: '💳', count: cards.length },
    { key: 'users', label: 'Users', icon: '👥', count: users.length },
    { key: 'kyc', label: 'KYC', icon: '🪪', count: kycSubs.filter(k => k.status === 'pending').length },
  ];

  const statusBadge = (s: string) => {
    const map: Record<string, string> = {
      pending: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
      approved: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
      active: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
      rejected: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
      frozen: 'bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-300',
      none: 'bg-gray-100 text-gray-500',
    };
    return <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${map[s] || 'bg-gray-100 text-gray-600'}`}>{s}</span>;
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">👑 {t('admin.title')}</h2>

      {error && (
        <div className="rounded-lg bg-red-50 dark:bg-red-900/20 p-3 text-sm text-red-600 dark:text-red-400 flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError('')} className="text-red-400 hover:text-red-600 ml-2">✕</button>
        </div>
      )}

      {/* Image preview modal */}
      {selectedImage && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4" onClick={() => setSelectedImage(null)}>
          <div className="relative max-w-2xl max-h-[90vh]">
            <img src={selectedImage} alt="Document" className="max-w-full max-h-[85vh] rounded-xl shadow-2xl" />
            <button onClick={() => setSelectedImage(null)} className="absolute -top-3 -right-3 rounded-full bg-white w-8 h-8 flex items-center justify-center shadow-lg text-gray-600 hover:text-gray-900 font-bold">✕</button>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 flex-wrap">
        {tabs.map((tb) => (
          <button key={tb.key} onClick={() => setTab(tb.key)}
            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition-all ${
              tab === tb.key
                ? 'bg-indigo-600 text-white shadow-md'
                : 'bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50'
            }`}>
            {tb.icon} {tb.label}
            {tb.count > 0 && (
              <span className={`ml-1 rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                tab === tb.key ? 'bg-white/20 text-white' : 'bg-amber-100 text-amber-700'
              }`}>{tb.count}</span>
            )}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
        </div>
      ) : (
        <div className="space-y-4">
          {/* ========== DEPOSITS TAB ========== */}
          {tab === 'deposits' && (
            <div className="rounded-2xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">User</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">TX Hash</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                    {deposits.map((d) => (
                      <tr key={d.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/30">
                        <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">{d.user_email}</td>
                        <td className="px-4 py-3 text-sm font-semibold">${Number(d.amount).toFixed(2)}</td>
                        <td className="px-4 py-3 text-xs font-mono text-gray-500 max-w-[100px] truncate">{d.tx_hash.slice(0, 10)}...</td>
                        <td className="px-4 py-3">{statusBadge(d.status)}</td>
                        <td className="px-4 py-3 text-xs text-gray-500">{new Date(d.created_at).toLocaleDateString()}</td>
                        <td className="px-4 py-3">
                          {d.status === 'pending' ? (
                            <div className="flex gap-1">
                              <button onClick={() => updateDeposit(d.id, 'approved')} disabled={actionLoading === d.id}
                                className="rounded-lg bg-green-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-green-700 disabled:opacity-50">
                                {actionLoading === d.id ? '...' : '✓ Approve'}
                              </button>
                              <button onClick={() => updateDeposit(d.id, 'rejected')} disabled={actionLoading === d.id}
                                className="rounded-lg bg-red-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-red-700 disabled:opacity-50">
                                ✕ Reject
                              </button>
                            </div>
                          ) : (<span className="text-xs text-gray-400">—</span>)}
                        </td>
                      </tr>
                    ))}
                    {deposits.length === 0 && (
                      <tr><td colSpan={6} className="px-4 py-10 text-center text-sm text-gray-400">No deposits yet</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ========== CARDS TAB ========== */}
          {tab === 'cards' && (
            <div className="rounded-2xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">User</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Card Number</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Expiry</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Balance</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                    {cards.map((c) => (
                      <tr key={c.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/30">
                        <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">{c.user_email}</td>
                        <td className="px-4 py-3 text-sm font-mono">{c.card_number}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{c.expiry}</td>
                        <td className="px-4 py-3 text-sm font-semibold">${Number(c.balance).toFixed(2)}</td>
                        <td className="px-4 py-3">{statusBadge(c.status)}</td>
                        <td className="px-4 py-3 text-xs text-gray-500">{new Date(c.created_at).toLocaleDateString()}</td>
                      </tr>
                    ))}
                    {cards.length === 0 && (
                      <tr><td colSpan={6} className="px-4 py-10 text-center text-sm text-gray-400">No cards yet</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ========== USERS TAB ========== */}
          {tab === 'users' && (
            <div className="rounded-2xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Balance</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Referral</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">KYC</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Joined</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                    {users.map((u) => (
                      <tr key={u.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/30">
                        <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">{u.email}</td>
                        <td className="px-4 py-3 text-sm font-semibold">${Number(u.balance).toFixed(2)}</td>
                        <td className="px-4 py-3 text-sm font-mono text-indigo-600">{u.referral_code}</td>
                        <td className="px-4 py-3">{statusBadge(u.kyc_status)}</td>
                        <td className="px-4 py-3 text-xs text-gray-500">{new Date(u.created_at).toLocaleDateString()}</td>
                      </tr>
                    ))}
                    {users.length === 0 && (
                      <tr><td colSpan={5} className="px-4 py-10 text-center text-sm text-gray-400">No users yet</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ========== KYC TAB ========== */}
          {tab === 'kyc' && (
            <div className="space-y-4">
              {kycSubs.map((k) => (
                <div key={k.id} className="rounded-2xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">
                  {/* Header */}
                  <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
                    <div className="flex items-center gap-3">
                      <span className="text-lg">{k.doc_type === 'passport' ? '📘' : '🪪'}</span>
                      <div>
                        <p className="text-sm font-semibold text-gray-900 dark:text-white">{k.user_email}</p>
                        <p className="text-xs text-gray-500">
                          {k.first_name} {k.last_name} • {k.country} • {k.phone}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {statusBadge(k.status)}
                      {k.status === 'pending' && (
                        <div className="flex gap-1 ml-2">
                          <button onClick={() => approveKyc(k.user_id)} disabled={actionLoading === k.user_id}
                            className="rounded-lg bg-green-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-700 disabled:opacity-50">
                            {actionLoading === k.user_id ? '...' : '✓ Approve'}
                          </button>
                          <button onClick={() => rejectKyc(k.user_id)} disabled={actionLoading === k.user_id}
                            className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700 disabled:opacity-50">
                            ✕ Reject
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Details */}
                  <div className="p-4 space-y-3">
                    <div className="grid gap-3 sm:grid-cols-2 text-sm">
                      <div>
                        <span className="text-gray-500 text-xs uppercase">Document Type:</span>
                        <p className="font-medium text-gray-900 dark:text-white">{k.doc_type === 'passport' ? 'Passport' : 'National ID Card'}</p>
                      </div>
                      <div>
                        <span className="text-gray-500 text-xs uppercase">Card Name:</span>
                        <p className="font-medium text-gray-900 dark:text-white font-mono">{k.card_name || '—'}</p>
                      </div>
                      <div>
                        <span className="text-gray-500 text-xs uppercase">Country:</span>
                        <p className="font-medium text-gray-900 dark:text-white">{k.country || '—'}</p>
                      </div>
                      <div>
                        <span className="text-gray-500 text-xs uppercase">Phone:</span>
                        <p className="font-medium text-gray-900 dark:text-white">{k.phone || '—'}</p>
                      </div>
                    </div>

                    {/* Document Images */}
                    {k.doc_type === 'id' ? (
                      <div className="grid gap-4 sm:grid-cols-2">
                        {k.id_front_url ? (
                          <div>
                            <p className="text-xs text-gray-500 mb-1 font-medium">🪪 ID Card - Front</p>
                            <img
                              src={k.id_front_url}
                              alt="ID Front"
                              className="w-full h-48 object-contain rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-800 cursor-pointer hover:opacity-90 transition-opacity"
                              onClick={() => setSelectedImage(k.id_front_url)}
                            />
                          </div>
                        ) : (
                          <div className="flex items-center justify-center h-48 rounded-xl border border-dashed border-gray-300 dark:border-gray-600 text-gray-400 text-sm">
                            No front image
                          </div>
                        )}
                        {k.id_back_url ? (
                          <div>
                            <p className="text-xs text-gray-500 mb-1 font-medium">🪪 ID Card - Back</p>
                            <img
                              src={k.id_back_url}
                              alt="ID Back"
                              className="w-full h-48 object-contain rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-800 cursor-pointer hover:opacity-90 transition-opacity"
                              onClick={() => setSelectedImage(k.id_back_url)}
                            />
                          </div>
                        ) : (
                          <div className="flex items-center justify-center h-48 rounded-xl border border-dashed border-gray-300 dark:border-gray-600 text-gray-400 text-sm">
                            No back image
                          </div>
                        )}
                      </div>
                    ) : (
                      <div>
                        <p className="text-xs text-gray-500 mb-1 font-medium">📘 Passport</p>
                        {k.passport_url ? (
                          <img
                            src={k.passport_url}
                            alt="Passport"
                            className="w-full max-w-md h-64 object-contain rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-800 cursor-pointer hover:opacity-90 transition-opacity"
                            onClick={() => setSelectedImage(k.passport_url)}
                          />
                        ) : (
                          <div className="flex items-center justify-center h-48 max-w-md rounded-xl border border-dashed border-gray-300 dark:border-gray-600 text-gray-400 text-sm">
                            No passport image
                          </div>
                        )}
                      </div>
                    )}

                    <p className="text-xs text-gray-400">
                      Submitted: {new Date(k.created_at).toLocaleString()}
                    </p>
                  </div>
                </div>
              ))}
              {kycSubs.length === 0 && (
                <div className="rounded-2xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 p-10 text-center text-sm text-gray-400">
                  No KYC submissions yet
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
