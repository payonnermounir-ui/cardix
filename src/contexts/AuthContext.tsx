import { useEffect, useRef, type ReactNode } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';

export function AuthProvider({ children }: { children: ReactNode }) {
  const { setUser, setProfile, setLoading, setInitialized } =
    useAuthStore();
  const initRef = useRef(false);

  useEffect(() => {
    if (initRef.current) return;
    initRef.current = true;

    let cancelled = false;

    supabase.auth.getSession()
      .then(({ data: { session } }) => {
        if (cancelled) return;
        const currentUser = session?.user ?? null;
        setUser(currentUser);
        if (currentUser) {
          supabase
            .from('profiles')
            .select('*')
            .eq('id', currentUser.id)
            .single()
            .then(({ data }) => {
              if (!cancelled && data) setProfile(data as any);
            });
        }
      })
      .catch(() => {
        // Supabase not configured – app still renders
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
          setInitialized(true);
        }
      });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      if (currentUser) {
        supabase
          .from('profiles')
          .select('*')
          .eq('id', currentUser.id)
          .single()
          .then(({ data }) => {
            if (data) setProfile(data as any);
          });
      } else {
        setProfile(null);
      }
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  return <>{children}</>;
}
