import { useEffect, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@/store/authStore';
import { supabase } from '@/lib/supabase';

interface Deposit {
  id: string;
  amount: number;
  tx_hash: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
}

export default function Deposit() {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const [amount, setAmount] = useState('');
  const [txHash, setTxHash] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [deposits, setDeposits] = useState<Deposit[]>([]);
  const [loading, setLoading] = useState(true);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (user) loadDeposits();
  }, [user]);

  async function loadDeposits() {
    const { data } = await supabase
      .from('deposits')
      .select('*')
      .eq('user_id', user!.id)
      .order('created_at', { ascending: false });
    if (data) setDeposits(data as Deposit[]);
    setLoading(false);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setSuccess(false);

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum < 10) {
      setError(t('deposit.minAmount') || 'Minimum deposit amount is $10');
      return;
    }
    if (!txHash.trim()) {
      setError('Please enter the transaction hash');
      return;
    }

    setSubmitting(true);
    const { error: insertError } = await supabase
      .from('deposits')
      .insert({ user_id: user!.id, amount: amountNum, tx_hash: txHash.trim(), status: 'pending' });

    if (insertError) { setError(insertError.message); setSubmitting(false); return; }

    setAmount('');
    setTxHash('');
    setSuccess(true);
    setSubmitting(false);
    loadDeposits();
  }

  const statusBadge = (status: string) => {
    switch (status) {
      case 'approved': return <span className="inline-flex items-center rounded-full bg-green-100 dark:bg-green-900/30 px-2.5 py-0.5 text-xs font-medium text-green-700 dark:text-green-300">{t('deposit.approved')}</span>;
      case 'rejected': return <span className="inline-flex items-center rounded-full bg-red-100 dark:bg-red-900/30 px-2.5 py-0.5 text-xs font-medium text-red-700 dark:text-red-300">{t('deposit.rejected')}</span>;
      default: return <span className="inline-flex items-center rounded-full bg-amber-100 dark:bg-amber-900/30 px-2.5 py-0.5 text-xs font-medium text-amber-700 dark:text-amber-300">{t('deposit.pending')}</span>;
    }
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
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{t('deposit.title')}</h2>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Deposit form */}
        <div className="rounded-2xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            {t('deposit.title')}
          </h3>

          {success && (
            <div className="mb-4 rounded-lg bg-green-50 dark:bg-green-900/20 p-3 text-sm text-green-700 dark:text-green-300">
              ✅ {t('deposit.success')}
            </div>
          )}
          {error && (
            <div className="mb-4 rounded-lg bg-red-50 dark:bg-red-900/20 p-3 text-sm text-red-600 dark:text-red-400">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('deposit.amount')}
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-4 text-gray-500 text-sm font-medium">$</span>
                <input type="number" step="0.01" min="10" required value={amount} onChange={(e) => setAmount(e.target.value)}
                  placeholder={t('deposit.amountPlaceholder')}
                  className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 pl-8 pr-4 py-2.5 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('deposit.txHash')}
              </label>
              <input type="text" required value={txHash} onChange={(e) => setTxHash(e.target.value)}
                placeholder={t('deposit.txHashPlaceholder')}
                className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-4 py-2.5 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all" />
            </div>
            <button type="submit" disabled={submitting}
              className="w-full rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-200 dark:shadow-indigo-900/30 hover:from-indigo-700 hover:to-violet-700 disabled:opacity-50 transition-all">
              {submitting ? t('common.loading') : t('deposit.submit')}
            </button>
          </form>

          <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">ℹ️ {t('deposit.note')}</p>
        </div>

        {/* USDT Wallet + Partners */}
        <div className="space-y-4">
          <div className="rounded-2xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              💼 USDT Wallet Addresses
            </h3>

            {/* TRC20 */}
            <div className="rounded-xl bg-orange-50 dark:bg-orange-900/10 border border-orange-200 dark:border-orange-800 p-4 mb-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="inline-flex items-center rounded-full bg-orange-500 px-2.5 py-0.5 text-[10px] font-bold text-white">TRC20</span>
                <span className="text-xs text-gray-500 dark:text-gray-400">Tron Network</span>
              </div>
              <p className="font-mono text-sm text-gray-900 dark:text-white break-all select-all mb-2">
                TXLsHureixQs123XNcyzSWZ8edH6yTxS67
              </p>
              <button
                onClick={() => { navigator.clipboard.writeText('TXLsHureixQs123XNcyzSWZ8edH6yTxS67'); }}
                className="text-xs text-orange-600 hover:text-orange-700 font-medium"
              >
                📋 Copy TRC20 address
              </button>
            </div>

            {/* BEP20 */}
            <div className="rounded-xl bg-yellow-50 dark:bg-yellow-900/10 border border-yellow-200 dark:border-yellow-800 p-4 mb-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="inline-flex items-center rounded-full bg-yellow-500 px-2.5 py-0.5 text-[10px] font-bold text-white">BEP20</span>
                <span className="text-xs text-gray-500 dark:text-gray-400">BSC Network</span>
              </div>
              <p className="font-mono text-sm text-gray-900 dark:text-white break-all select-all mb-2">
                0x0bcb69e95e45c419b17182a5f2f2bbadca7c9c75
              </p>
              <button
                onClick={() => { navigator.clipboard.writeText('0x0bcb69e95e45c419b17182a5f2f2bbadca7c9c75'); }}
                className="text-xs text-yellow-600 hover:text-yellow-700 font-medium"
              >
                📋 Copy BEP20 address
              </button>
            </div>

            <div className="space-y-2 text-sm text-gray-500 dark:text-gray-400">
              <p>1. Send USDT to TRC20 or BEP20 address above</p>
              <p>2. Copy the transaction hash</p>
              <p>3. Submit it using the form</p>
              <p>4. Wait for admin approval (1-24h)</p>
            </div>
          </div>

          {/* Partners */}
          <div className="rounded-2xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              🤝 Our Partners
            </h3>
            <div className="grid grid-cols-2 gap-4">
              {/* Binance */}
              <a href="https://www.binance.com" target="_blank" rel="noopener noreferrer"
                className="flex flex-col items-center gap-2 rounded-xl bg-yellow-50 dark:bg-yellow-900/10 border border-yellow-200 dark:border-yellow-800 p-4 hover:shadow-md transition-all">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-yellow-400 text-white font-bold text-xl">
                  B
                </div>
                <span className="text-sm font-semibold text-gray-900 dark:text-white">Binance</span>
                <span className="text-[10px] text-gray-500 dark:text-gray-400">USDT TRC20</span>
              </a>

              {/* Bybit */}
              <a href="https://www.bybit.com" target="_blank" rel="noopener noreferrer"
                className="flex flex-col items-center gap-2 rounded-xl bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800 p-4 hover:shadow-md transition-all">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-500 text-white font-bold text-lg">
                  By
                </div>
                <span className="text-sm font-semibold text-gray-900 dark:text-white">Bybit</span>
                <span className="text-[10px] text-gray-500 dark:text-gray-400">USDT TRC20</span>
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Deposit history */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
          {t('deposit.history')}
        </h3>
        <div className="rounded-2xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">
          {deposits.length === 0 ? (
            <div className="p-6 text-center text-gray-500 dark:text-gray-400 text-sm">{t('deposit.noDeposits')}</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100 dark:border-gray-800">
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('deposit.amount')}</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('deposit.txHash')}</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('deposit.status')}</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('transactions.date')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {deposits.map((d) => (
                    <tr key={d.id}>
                      <td className="px-4 py-3 text-sm font-semibold text-gray-900 dark:text-white">${Number(d.amount).toFixed(2)}</td>
                      <td className="px-4 py-3 text-sm font-mono text-gray-500 dark:text-gray-400 max-w-[120px] truncate">{d.tx_hash.slice(0, 12)}...</td>
                      <td className="px-4 py-3">{statusBadge(d.status)}</td>
                      <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">{new Date(d.created_at).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
