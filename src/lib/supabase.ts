import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'placeholder-key';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
  },
});

export type Database = {
  profiles: {
    id: string;
    email: string;
    balance: number;
    referral_code: string;
    referred_by: string | null;
    created_at: string;
  };
  deposits: {
    id: string;
    user_id: string;
    amount: number;
    tx_hash: string;
    status: 'pending' | 'approved' | 'rejected';
    created_at: string;
  };
  cards: {
    id: string;
    user_id: string;
    card_number: string;
    expiry: string;
    cvv: string;
    balance: number;
    status: 'active' | 'frozen';
    created_at: string;
  };
  transactions: {
    id: string;
    user_id: string;
    type: 'deposit' | 'withdraw' | 'referral' | 'card_payment';
    amount: number;
    description: string;
    created_at: string;
  };
};
