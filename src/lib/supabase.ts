import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://moaodtxwivkxcaoucnks.supabase.co/rest/v1/';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1vYW9kdHh3aXZreGNhb3VjbmtzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcwNDMyNTAsImV4cCI6MjA5MjYxOTI1MH0.j5Cy85u-EomZxbw9GRgwK59C_HNvitA9w1Efsb4aWfQ';

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
