import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@/store/authStore';
import { supabase } from '@/lib/supabase';

interface Transaction {
  id: string;
  type: string;
  amount: number;
  description: string;
  created_at: string;
}

export default function Dashboard() {
  const { t } = useTranslation();
  const { profile, fetchProfile, user } = useAuthStore();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [cardsCount, setCardsCount] = useState(0);
  const [totalDeposited, setTotalDeposited] = useState(0);
  const [referralEarnings, setReferralEarnings] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    fetchProfile(user.id);
    loadData();
  }, [user]);

  async function loadData() {
    setLoading(true);
    const userId = user?.id;
    if (!userId) { setLoading(false); return; }

    const [txRes, cardsRes] = await Promise.all([
      supabase.from('transactions').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(5),
      supabase.from('cards').select('id, status').eq('user_id', userId),
    ]);

    if (txRes.data) {
      setTransactions(txRes.data as Transaction[]);
      const deposited = txRes.data.filter((t: any) => t.type === 'deposit').reduce((s: number, t: any) => s + Number(t.amount), 0);
      const referral = txRes.data.filter((t: any) => t.type === 'referral').reduce((s: number, t: any) => s + Number(t.amount), 0);
      setTotalDeposited(deposited);
      setReferralEarnings(referral);
    }
    if (cardsRes.data) setCardsCount(cardsRes.data.filter((c: any) => c.status === 'active').length);
    setLoading(false);
  }

  const typeLabels: Record<string, string> = {
    deposit: t('transactions.deposit'),
    withdraw: t('transactions.withdraw'),
    referral: t('transactions.referral'),
    card_payment: t('transactions.cardPayment'),
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Hero Card - Bank Card with Balance */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-600 via-violet-600 to-purple-700 p-6 sm:p-8 text-white shadow-2xl shadow-indigo-300/40 dark:shadow-indigo-900/50">
        {/* Background decoration */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/4" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/4" />

        <div className="relative z-10">
          {/* Card header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="h-8 w-12 rounded-md bg-gradient-to-br from-yellow-300 to-yellow-500 opacity-90" />
              <div>
                <p className="text-xs font-semibold tracking-widest uppercase text-white/70">Cardix</p>
                <p className="text-sm font-medium text-white/90">{profile?.card_name || 'CARD HOLDER'}</p>
              </div>
            </div>
            <span className="text-3xl">💳</span>
          </div>

          {/* Balance */}
          <div className="mb-6">
            <p className="text-xs uppercase tracking-wider text-white/60 mb-1">{t('dashboard.balance')}</p>
            <p className="text-4xl sm:text-5xl font-bold tracking-tight">
              ${(profile?.balance ?? 0).toFixed(2)}
            </p>
          </div>

          {/* Card info row */}
          <div className="flex items-center justify-between text-white/70 text-xs sm:text-sm">
            <span>{user?.email}</span>
            <span className="font-mono">{cardsCount} {t('dashboard.activeCards').toLowerCase()}</span>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid gap-3 sm:grid-cols-3">
        <Link
          to="/deposit"
          className="group flex items-center gap-4 rounded-2xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 p-5 shadow-sm hover:shadow-md hover:border-green-200 dark:hover:border-green-800 transition-all"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-green-100 dark:bg-green-900/30 text-2xl group-hover:scale-110 transition-transform">
            💰
          </div>
          <div>
            <p className="font-semibold text-gray-900 dark:text-white">{t('dashboard.makeDeposit')}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Min $10</p>
          </div>
        </Link>

        <Link
          to="/cards"
          className="group flex items-center gap-4 rounded-2xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 p-5 shadow-sm hover:shadow-md hover:border-indigo-200 dark:hover:border-indigo-800 transition-all"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-100 dark:bg-indigo-900/30 text-2xl group-hover:scale-110 transition-transform">
            💳
          </div>
          <div>
            <p className="font-semibold text-gray-900 dark:text-white">{t('dashboard.createCard')}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">$10</p>
          </div>
        </Link>

        <Link
          to="/referral"
          className="group flex items-center gap-4 rounded-2xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 p-5 shadow-sm hover:shadow-md hover:border-amber-200 dark:hover:border-amber-800 transition-all"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-100 dark:bg-amber-900/30 text-2xl group-hover:scale-110 transition-transform">
            🎁
          </div>
          <div>
            <p className="font-semibold text-gray-900 dark:text-white">{t('dashboard.inviteFriends')}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">3% {t('referral.commissionRate')}</p>
          </div>
        </Link>
      </div>

      {/* Features text */}
      <div className="rounded-2xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 p-6 shadow-sm">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-3">
          🚀 {t('app.name')} — {t('app.tagline')}
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed mb-4">
          {t('dashboard.featuresText') || 'Experience the freedom of virtual banking with Cardix. Our virtual cards give you instant access to online payments worldwide, with top-tier security, real-time balance tracking, and seamless USDT deposits. Whether you\'re shopping online, subscribing to services, or managing business expenses — Cardix puts the power in your pocket.'}
        </p>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { icon: '🔒', title: t('dashboard.featSecure') || 'Bank-Level Security', desc: t('dashboard.featSecureDesc') || '256-bit encryption & 3D Secure' },
            { icon: '⚡', title: t('dashboard.featInstant') || 'Instant Creation', desc: t('dashboard.featInstantDesc') || 'Create cards in seconds, not days' },
            { icon: '🌍', title: t('dashboard.featGlobal') || 'Worldwide Accepted', desc: t('dashboard.featGlobalDesc') || 'Pay anywhere Visa/Mastercard accepted' },
            { icon: '📱', title: t('dashboard.featControl') || 'Full Control', desc: t('dashboard.featControlDesc') || 'Freeze, unfreeze & manage anytime' },
          ].map((feat) => (
            <div key={feat.title} className="flex items-start gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-800">
              <span className="text-xl shrink-0">{feat.icon}</span>
              <div>
                <p className="text-sm font-semibold text-gray-900 dark:text-white">{feat.title}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{feat.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Stats mini */}
      <div className="grid gap-4 grid-cols-3">
        <div className="rounded-xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 p-4 text-center shadow-sm">
          <p className="text-2xl mb-1">📥</p>
          <p className="text-lg font-bold text-gray-900 dark:text-white">${totalDeposited.toFixed(2)}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">{t('dashboard.totalDeposited')}</p>
        </div>
        <div className="rounded-xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 p-4 text-center shadow-sm">
          <p className="text-2xl mb-1">🎁</p>
          <p className="text-lg font-bold text-gray-900 dark:text-white">${referralEarnings.toFixed(2)}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">{t('dashboard.referralEarnings')}</p>
        </div>
        <div className="rounded-xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 p-4 text-center shadow-sm">
          <p className="text-2xl mb-1">💳</p>
          <p className="text-lg font-bold text-gray-900 dark:text-white">{cardsCount}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">{t('dashboard.activeCards')}</p>
        </div>
      </div>

      {/* Recent transactions */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            {t('dashboard.recentTransactions')}
          </h3>
          <Link to="/transactions" className="text-sm font-medium text-indigo-600 hover:text-indigo-500">
            View all →
          </Link>
        </div>
        <div className="rounded-2xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">
          {transactions.length === 0 ? (
            <div className="p-6 text-center text-gray-500 dark:text-gray-400 text-sm">
              {t('transactions.noTransactions')}
            </div>
          ) : (
            <div className="divide-y divide-gray-100 dark:divide-gray-800">
              {transactions.map((tx) => (
                <div key={tx.id} className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-3">
                    <div className={`h-9 w-9 rounded-lg flex items-center justify-center text-sm ${
                      tx.type === 'deposit' ? 'bg-green-100 dark:bg-green-900/30 text-green-600' :
                      tx.type === 'withdraw' ? 'bg-red-100 dark:bg-red-900/30 text-red-600' :
                      tx.type === 'referral' ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-600' :
                      'bg-blue-100 dark:bg-blue-900/30 text-blue-600'
                    }`}>
                      {tx.type === 'deposit' ? '↓' : tx.type === 'withdraw' ? '↑' : tx.type === 'referral' ? '🎁' : '💳'}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">{typeLabels[tx.type] || tx.type}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{new Date(tx.created_at).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <span className={`text-sm font-semibold ${tx.type === 'withdraw' ? 'text-red-600' : 'text-green-600'}`}>
                    {tx.type === 'withdraw' ? '-' : '+'}${Number(tx.amount).toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
