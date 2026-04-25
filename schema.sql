-- ============================================================
-- CARDIX – Virtual Card App – Complete Database Schema
-- انسخ هذا الملف كاملاً في Supabase SQL Editor ثم نفذه
-- ============================================================

-- 1. PROFILES TABLE
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  balance NUMERIC DEFAULT 0 NOT NULL,
  referral_code TEXT UNIQUE NOT NULL,
  referred_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 2. DEPOSITS TABLE
CREATE TABLE IF NOT EXISTS public.deposits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL CHECK (amount > 0),
  tx_hash TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 3. CARDS TABLE
CREATE TABLE IF NOT EXISTS public.cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  card_number TEXT NOT NULL,
  expiry TEXT NOT NULL,
  cvv TEXT NOT NULL,
  balance NUMERIC DEFAULT 0 NOT NULL,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'frozen')) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 4. TRANSACTIONS TABLE
CREATE TABLE IF NOT EXISTS public.transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('deposit', 'withdraw', 'referral', 'card_payment')),
  amount NUMERIC NOT NULL,
  description TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_profiles_referral_code ON public.profiles(referral_code);
CREATE INDEX IF NOT EXISTS idx_profiles_referred_by ON public.profiles(referred_by);
CREATE INDEX IF NOT EXISTS idx_deposits_user_id ON public.deposits(user_id);
CREATE INDEX IF NOT EXISTS idx_deposits_status ON public.deposits(status);
CREATE INDEX IF NOT EXISTS idx_cards_user_id ON public.cards(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON public.transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON public.transactions(type);

-- ============================================================
-- FUNCTIONS
-- ============================================================

-- Generate unique 8-char referral code
CREATE OR REPLACE FUNCTION generate_referral_code()
RETURNS TEXT AS $$
DECLARE
  chars TEXT := 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  code TEXT;
  exists_already BOOLEAN;
BEGIN
  LOOP
    code := '';
    FOR i IN 1..8 LOOP
      code := code || substr(chars, floor(random() * length(chars) + 1)::int, 1);
    END LOOP;
    SELECT EXISTS(SELECT 1 FROM public.profiles WHERE referral_code = code) INTO exists_already;
    EXIT WHEN NOT exists_already;
  END LOOP;
  RETURN code;
END;
$$ LANGUAGE plpgsql VOLATILE;

-- Auto-create profile on new auth signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, referral_code)
  VALUES (
    NEW.id,
    NEW.email,
    generate_referral_code()
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Referral signup bonus: +$10 to referrer
CREATE OR REPLACE FUNCTION handle_referral_signup()
RETURNS TRIGGER AS $$
DECLARE
  referrer_id UUID;
BEGIN
  IF NEW.referred_by IS NOT NULL AND NEW.referred_by <> '' THEN
    SELECT id INTO referrer_id
    FROM public.profiles
    WHERE referral_code = NEW.referred_by;

    IF referrer_id IS NOT NULL AND referrer_id <> NEW.id THEN
      UPDATE public.profiles
      SET balance = balance + 10
      WHERE id = referrer_id;

      INSERT INTO public.transactions (user_id, type, amount, description)
      VALUES (
        referrer_id,
        'referral',
        10,
        'Referral signup bonus: ' || NEW.email
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Deposit approval: update balance + 3% referral commission
CREATE OR REPLACE FUNCTION handle_deposit_approval()
RETURNS TRIGGER AS $$
DECLARE
  referrer_code TEXT;
  referrer_id UUID;
  commission NUMERIC;
BEGIN
  IF NEW.status = 'approved' AND (OLD.status = 'pending' OR OLD.status IS NULL) THEN
    -- Add amount to user balance
    UPDATE public.profiles
    SET balance = balance + NEW.amount
    WHERE id = NEW.user_id;

    -- Log deposit transaction
    INSERT INTO public.transactions (user_id, type, amount, description)
    VALUES (
      NEW.user_id,
      'deposit',
      NEW.amount,
      'Deposit approved: ' || substring(NEW.tx_hash, 1, 20)
    );

    -- 3% referral commission
    SELECT referred_by INTO referrer_code
    FROM public.profiles
    WHERE id = NEW.user_id;

    IF referrer_code IS NOT NULL AND referrer_code <> '' THEN
      SELECT id INTO referrer_id
      FROM public.profiles
      WHERE referral_code = referrer_code;

      IF referrer_id IS NOT NULL THEN
        commission := ROUND((NEW.amount * 3.0 / 100.0)::numeric, 2);

        UPDATE public.profiles
        SET balance = balance + commission
        WHERE id = referrer_id;

        INSERT INTO public.transactions (user_id, type, amount, description)
        VALUES (
          referrer_id,
          'referral',
          commission,
          'Commission (3%) from deposit of ' || NEW.user_id
        );
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- TRIGGERS
-- ============================================================

-- Trigger: create profile automatically on signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Trigger: referral bonus when profile created with referred_by
DROP TRIGGER IF EXISTS on_profile_created_referral ON public.profiles;
CREATE TRIGGER on_profile_created_referral
  AFTER INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION handle_referral_signup();

-- Trigger: handle deposit approval
DROP TRIGGER IF EXISTS on_deposit_approved ON public.deposits;
CREATE TRIGGER on_deposit_approved
  AFTER UPDATE ON public.deposits
  FOR EACH ROW
  WHEN (NEW.status = 'approved' AND (OLD.status = 'pending' OR OLD.status IS NULL))
  EXECUTE FUNCTION handle_deposit_approval();

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deposits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- PROFILES policies
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can view profiles by referral code" ON public.profiles;
CREATE POLICY "Users can view profiles by referral code"
  ON public.profiles FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- DEPOSITS policies
DROP POLICY IF EXISTS "Users can view own deposits" ON public.deposits;
CREATE POLICY "Users can view own deposits"
  ON public.deposits FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create own deposits" ON public.deposits;
CREATE POLICY "Users can create own deposits"
  ON public.deposits FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- CARDS policies
DROP POLICY IF EXISTS "Users can view own cards" ON public.cards;
CREATE POLICY "Users can view own cards"
  ON public.cards FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create own cards" ON public.cards;
CREATE POLICY "Users can create own cards"
  ON public.cards FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own cards" ON public.cards;
CREATE POLICY "Users can update own cards"
  ON public.cards FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own cards" ON public.cards;
CREATE POLICY "Users can delete own cards"
  ON public.cards FOR DELETE
  USING (auth.uid() = user_id);

-- TRANSACTIONS policies
DROP POLICY IF EXISTS "Users can view own transactions" ON public.transactions;
CREATE POLICY "Users can view own transactions"
  ON public.transactions FOR SELECT
  USING (auth.uid() = user_id);

-- ============================================================
-- ADMIN POLICIES (for admin@cardix.app)
-- ============================================================
DROP POLICY IF EXISTS "Admin full access deposits" ON public.deposits;
CREATE POLICY "Admin full access deposits"
  ON public.deposits FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND email = 'admin@cardix.app'
    )
  );

DROP POLICY IF EXISTS "Admin view all profiles" ON public.profiles;
CREATE POLICY "Admin view all profiles"
  ON public.profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND email = 'admin@cardix.app'
    )
  );

-- ============================================================
-- DONE! ✅
-- ============================================================
