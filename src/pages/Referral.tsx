import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@/store/authStore';
import { supabase } from '@/lib/supabase';

export default function Referral() {
  const { t } = useTranslation();
  const { profile, user } = useAuthStore();
  const [copied, setCopied] = useState<'code' | 'link' | null>(null);
  const [referralEarnings, setReferralEarnings] = useState(0);
  const [commission, setCommission] = useState(0);
  const [referredCount, setReferredCount] = useState(0);

  const referralLink = `${window.location.origin}${window.location.pathname}#/register?ref=${profile?.referral_code || ''}`;

  useEffect(() => {
    if (!user) return;
    loadReferralStats();
  }, [user]);

  async function loadReferralStats() {
    const { data: txData } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', user!.id)
      .eq('type', 'referral');

    if (txData) {
      const comm = txData
        .filter((t: any) => t.description?.includes('commission'))
        .reduce((sum: number, t: any) => sum + Number(t.amount), 0);
      const total = txData.reduce((sum: number, t: any) => sum + Number(t.amount), 0);
      setCommission(comm);
      setReferralEarnings(total);
    }

    if (profile?.referral_code) {
      const { count } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('referred_by', profile.referral_code);
      setReferredCount(count || 0);
    }
  }

  async function copyToClipboard(text: string, type: 'code' | 'link') {
    await navigator.clipboard.writeText(text);
    setCopied(type);
    setTimeout(() => setCopied(null), 2000);
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{t('referral.title')}</h2>
      <p className="text-gray-500 dark:text-gray-400">{t('referral.description')}</p>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 p-5 shadow-sm">
          <p className="text-sm text-gray-500 dark:text-gray-400">{t('referral.totalEarned')}</p>
          <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">${referralEarnings.toFixed(2)}</p>
        </div>
        <div className="rounded-2xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 p-5 shadow-sm">
          <p className="text-sm text-gray-500 dark:text-gray-400">{t('referral.commission')}</p>
          <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">${commission.toFixed(2)}</p>
          <p className="text-xs text-gray-400 mt-1">3% {t('referral.commissionRate')}</p>
        </div>
        <div className="rounded-2xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 p-5 shadow-sm">
          <p className="text-sm text-gray-500 dark:text-gray-400">{t('nav.referral')}</p>
          <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">{referredCount}</p>
          <p className="text-xs text-gray-400 mt-1">{t('referral.perReferral')}</p>
        </div>
      </div>

      {/* Referral code - full width, clearly visible */}
      <div className="rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-700 p-6 shadow-lg shadow-indigo-200 dark:shadow-indigo-900/30 text-white">
        <h3 className="text-lg font-semibold mb-2">{t('referral.yourCode')}</h3>
        <div className="flex items-center gap-4 flex-wrap">
          <code className="text-3xl font-mono font-bold tracking-[0.3em] select-all bg-white/10 rounded-xl px-6 py-3">
            {profile?.referral_code || '------'}
          </code>
          <button
            onClick={() => copyToClipboard(profile?.referral_code || '', 'code')}
            className="rounded-xl bg-white/20 px-5 py-3 text-sm font-semibold hover:bg-white/30 transition-colors backdrop-blur"
          >
            {copied === 'code' ? '✅ ' + t('referral.copied') : '📋 ' + t('referral.copy')}
          </button>
        </div>
      </div>

      {/* Referral link */}
      <div className="rounded-2xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          🔗 {t('referral.yourLink')}
        </h3>
        <div className="flex items-center gap-3 flex-wrap">
          <code className="flex-1 min-w-0 rounded-xl bg-gray-50 dark:bg-gray-800 px-4 py-3 text-sm text-gray-600 dark:text-gray-300 break-all select-all">
            {referralLink}
          </code>
          <button
            onClick={() => copyToClipboard(referralLink, 'link')}
            className="rounded-xl bg-indigo-600 px-5 py-3 text-sm font-medium text-white hover:bg-indigo-700 transition-colors whitespace-nowrap shrink-0"
          >
            {copied === 'link' ? '✅ ' + t('referral.copied') : '📋 ' + t('referral.copy')}
          </button>
        </div>
      </div>

      {/* How it works */}
      <div className="rounded-2xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          {t('referral.howItWorks')}
        </h3>
        <div className="space-y-4">
          <div className="flex items-start gap-4">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 font-bold text-sm shrink-0">
              1
            </div>
            <div>
              <p className="font-medium text-gray-900 dark:text-white">{t('referral.step1')}</p>
            </div>
          </div>
          <div className="flex items-start gap-4">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 font-bold text-sm shrink-0">
              2
            </div>
            <div>
              <p className="font-medium text-gray-900 dark:text-white">{t('referral.step3')}</p>
              <p className="text-sm text-amber-600 dark:text-amber-400 font-semibold">+ 3% commission</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
