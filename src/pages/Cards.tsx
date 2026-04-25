import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@/store/authStore';
import { supabase } from '@/lib/supabase';

interface Card {
  id: string;
  user_id: string;
  card_number: string;
  expiry: string;
  cvv: string;
  balance: number;
  status: 'active' | 'frozen';
  created_at: string;
}

function generateCardNumber(): string {
  const parts: string[] = [];
  for (let i = 0; i < 4; i++) {
    parts.push(String(Math.floor(1000 + Math.random() * 9000)));
  }
  return parts.join(' ');
}

function generateExpiry(): string {
  const month = String(Math.floor(1 + Math.random() * 12)).padStart(2, '0');
  const year = String(new Date().getFullYear() + 3).slice(-2);
  return `${month}/${year}`;
}

function generateCVV(): string {
  return String(Math.floor(100 + Math.random() * 900));
}

const CARD_PRICE = 10;

export default function Cards() {
  const { t } = useTranslation();
  const { user, profile, fetchProfile } = useAuthStore();
  const navigate = useNavigate();
  const [cards, setCards] = useState<Card[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (user) loadCards();
  }, [user]);

  async function loadCards() {
    const { data } = await supabase
      .from('cards')
      .select('*')
      .eq('user_id', user!.id)
      .order('created_at', { ascending: false });
    if (data) setCards(data as Card[]);
    setLoading(false);
  }

  async function handleCreateCard() {
    setError('');

    // Check KYC
    if (!profile?.kyc_verified || profile?.kyc_status !== 'approved') {
      navigate('/verification');
      return;
    }

    // Check balance
    if ((profile?.balance || 0) < CARD_PRICE) {
      setError(t('cards.insufficientBalance') || `Insufficient balance. Card costs $${CARD_PRICE}. Your balance: $${(profile?.balance || 0).toFixed(2)}`);
      return;
    }

    setCreating(true);

    // Deduct $10 via server-side logic
    const { error: rpcError } = await supabase.rpc('create_card', {
      p_user_id: user!.id,
      p_card_number: generateCardNumber(),
      p_expiry: generateExpiry(),
      p_cvv: generateCVV(),
      p_card_name: profile?.card_name || '',
    });

    if (rpcError) {
      setError(rpcError.message);
      setCreating(false);
      return;
    }

    await fetchProfile(user!.id);
    await loadCards();
    setCreating(false);
  }

  async function toggleFreeze(card: Card) {
    const newStatus = card.status === 'active' ? 'frozen' : 'active';
    await supabase
      .from('cards')
      .update({ status: newStatus })
      .eq('id', card.id);
    setCards(cards.map((c) => (c.id === card.id ? { ...c, status: newStatus as 'active' | 'frozen' } : c)));
  }

  async function deleteCard(cardId: string) {
    if (!confirm(t('cards.confirmDelete'))) return;
    await supabase.from('cards').delete().eq('id', cardId);
    setCards(cards.filter((c) => c.id !== cardId));
  }

  async function copyDetails(card: Card) {
    const details = `Card: ${card.card_number}\nExpiry: ${card.expiry}\nCVV: ${card.cvv}`;
    await navigator.clipboard.writeText(details);
    setCopiedId(card.id);
    setTimeout(() => setCopiedId(null), 2000);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{t('cards.title')}</h2>
        <button
          onClick={handleCreateCard}
          disabled={creating}
          className="rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-indigo-200 dark:shadow-indigo-900/30 hover:from-indigo-700 hover:to-violet-700 disabled:opacity-50 transition-all"
        >
          {creating ? t('common.loading') : `${t('cards.createCard')} — $${CARD_PRICE}`}
        </button>
      </div>

      {/* KYC Warning */}
      {(!profile?.kyc_verified || profile?.kyc_status !== 'approved') && (
        <div className="rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">⚠️</span>
            <div>
              <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
                {t('cards.kycRequired') || 'Identity verification required'}
              </p>
              <p className="text-xs text-amber-600 dark:text-amber-400">
                {t('cards.kycRequiredHint') || 'You must verify your identity before creating a card.'}
              </p>
            </div>
          </div>
          <button
            onClick={() => navigate('/verification')}
            className="shrink-0 rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700 transition-colors"
          >
            {t('kyc.verifyNow') || 'Verify Now'}
          </button>
        </div>
      )}

      {error && (
        <div className="rounded-lg bg-red-50 dark:bg-red-900/20 p-3 text-sm text-red-600 dark:text-red-400">
          {error}
        </div>
      )}

      {cards.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <span className="text-6xl mb-4">💳</span>
          <p className="text-gray-500 dark:text-gray-400">{t('cards.noCards')}</p>
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
          {cards.map((card) => (
            <div
              key={card.id}
              className={`relative overflow-hidden rounded-2xl border p-6 shadow-sm transition-all ${
                card.status === 'frozen'
                  ? 'bg-gray-100 dark:bg-gray-800 border-gray-200 dark:border-gray-700 opacity-60'
                  : 'bg-gradient-to-br from-indigo-600 via-violet-600 to-purple-700 border-transparent text-white shadow-lg shadow-indigo-200 dark:shadow-indigo-900/30'
              }`}
            >
              {/* Card chip + name */}
              <div className="mb-6 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-12 rounded-md bg-gradient-to-br from-yellow-300 to-yellow-500 opacity-80" />
                  <div>
                    <p className={`text-[10px] uppercase tracking-wider ${card.status === 'frozen' ? 'text-gray-400' : 'text-white/50'}`}>
                      Cardix
                    </p>
                    <p className={`text-xs font-medium ${card.status === 'frozen' ? 'text-gray-600' : 'text-white'}`}>
                      {profile?.card_name || 'CARD HOLDER'}
                    </p>
                  </div>
                </div>
                <span className={`text-xs font-semibold uppercase px-2 py-1 rounded-full ${
                  card.status === 'active'
                    ? 'bg-white/20 text-white'
                    : 'bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-300'
                }`}>
                  {card.status === 'active' ? t('cards.active') : t('cards.frozen')}
                </span>
              </div>

              {/* Card number */}
              <p className={`text-lg font-mono tracking-wider mb-4 ${
                card.status === 'frozen' ? 'text-gray-600 dark:text-gray-300' : 'text-white'
              }`}>
                {card.card_number}
              </p>

              {/* Expiry & CVV */}
              <div className="flex gap-8 mb-4">
                <div>
                  <p className={`text-[10px] uppercase tracking-wider ${
                    card.status === 'frozen' ? 'text-gray-400' : 'text-white/60'
                  }`}>{t('cards.expiry')}</p>
                  <p className={`text-sm font-mono font-medium ${
                    card.status === 'frozen' ? 'text-gray-600 dark:text-gray-300' : 'text-white'
                  }`}>{card.expiry}</p>
                </div>
                <div>
                  <p className={`text-[10px] uppercase tracking-wider ${
                    card.status === 'frozen' ? 'text-gray-400' : 'text-white/60'
                  }`}>{t('cards.cvv')}</p>
                  <p className={`text-sm font-mono font-medium ${
                    card.status === 'frozen' ? 'text-gray-600 dark:text-gray-300' : 'text-white'
                  }`}>{card.cvv}</p>
                </div>
              </div>

              {/* Balance */}
              <p className={`text-sm font-semibold ${
                card.status === 'frozen' ? 'text-gray-600 dark:text-gray-300' : 'text-white/80'
              }`}>
                {t('cards.balance')}: ${Number(card.balance).toFixed(2)}
              </p>

              {/* Actions */}
              <div className={`mt-4 flex gap-2 pt-4 border-t ${
                card.status === 'frozen' ? 'border-gray-200 dark:border-gray-700' : 'border-white/20'
              }`}>
                <button
                  onClick={() => toggleFreeze(card)}
                  className={`flex-1 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                    card.status === 'frozen'
                      ? 'bg-green-500 text-white hover:bg-green-600'
                      : 'bg-white/20 text-white hover:bg-white/30'
                  }`}
                >
                  {card.status === 'active' ? '❄️ ' : '🔥 '}
                  {card.status === 'active' ? t('cards.freeze') : t('cards.unfreeze')}
                </button>
                <button
                  onClick={() => copyDetails(card)}
                  className={`flex-1 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                    card.status === 'frozen'
                      ? 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                      : 'bg-white/20 text-white hover:bg-white/30'
                  }`}
                >
                  {copiedId === card.id ? '✅ ' + t('cards.copied') : '📋 ' + t('cards.copyDetails')}
                </button>
                <button
                  onClick={() => deleteCard(card.id)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                    card.status === 'frozen'
                      ? 'bg-red-100 dark:bg-red-900/30 text-red-600 hover:bg-red-200'
                      : 'bg-white/20 text-white hover:bg-red-500/50'
                  }`}
                >
                  🗑️
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
