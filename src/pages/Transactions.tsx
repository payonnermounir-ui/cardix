import { useEffect, useState } from 'react';
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

export default function Transactions() {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    if (user) loadTransactions();
  }, [user]);

  async function loadTransactions() {
    const { data } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', user!.id)
      .order('created_at', { ascending: false });
    if (data) setTransactions(data as Transaction[]);
    setLoading(false);
  }

  const typeLabels: Record<string, string> = {
    deposit: t('transactions.deposit'),
    withdraw: t('transactions.withdraw'),
    referral: t('transactions.referral'),
    card_payment: t('transactions.cardPayment'),
  };

  const typeIcons: Record<string, string> = {
    deposit: '↓',
    withdraw: '↑',
    referral: '🎁',
    card_payment: '💳',
  };

  const typeColors: Record<string, string> = {
    deposit: 'bg-green-100 dark:bg-green-900/30 text-green-600',
    withdraw: 'bg-red-100 dark:bg-red-900/30 text-red-600',
    referral: 'bg-amber-100 dark:bg-amber-900/30 text-amber-600',
    card_payment: 'bg-blue-100 dark:bg-blue-900/30 text-blue-600',
  };

  const filtered = filter === 'all' ? transactions : transactions.filter((t) => t.type === filter);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{t('transactions.title')}</h2>

      {/* Filter */}
      <div className="flex gap-2 flex-wrap">
        {['all', 'deposit', 'withdraw', 'referral', 'card_payment'].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
              filter === f
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
            }`}
          >
            {f === 'all' ? 'All' : typeLabels[f] || f}
          </button>
        ))}
      </div>

      {/* Transactions list */}
      <div className="rounded-2xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">
        {filtered.length === 0 ? (
          <div className="p-6 text-center text-gray-500 dark:text-gray-400 text-sm">
            {t('transactions.noTransactions')}
          </div>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            {filtered.map((tx) => (
              <div key={tx.id} className="flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                <div className="flex items-center gap-3">
                  <div className={`h-10 w-10 rounded-xl flex items-center justify-center text-lg ${typeColors[tx.type] || 'bg-gray-100 dark:bg-gray-800'}`}>
                    {typeIcons[tx.type] || '•'}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {typeLabels[tx.type] || tx.type}
                    </p>
                    {tx.description && (
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {tx.description}
                      </p>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <span className={`text-sm font-semibold ${
                    tx.type === 'withdraw' || tx.type === 'card_payment' ? 'text-red-600' : 'text-green-600'
                  }`}>
                    {tx.type === 'withdraw' || tx.type === 'card_payment' ? '-' : '+'}${Number(tx.amount).toFixed(2)}
                  </span>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    {new Date(tx.created_at).toLocaleDateString(undefined, {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
