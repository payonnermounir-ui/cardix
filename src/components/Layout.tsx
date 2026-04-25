import { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@/store/authStore';

export function Layout() {
  const { t, i18n } = useTranslation();
  const { user, profile, signOut } = useAuthStore();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const isRTL = i18n.language === 'ar';

  const isVerified = profile?.kyc_verified && profile?.kyc_status === 'approved';
  const isPending = profile?.kyc_status === 'pending';

  const navItems = [
    { to: '/dashboard', label: t('nav.dashboard'), icon: '📊' },
    { to: '/cards', label: t('nav.cards'), icon: '💳' },
    { to: '/deposit', label: t('nav.deposit'), icon: '💰' },
    {
      to: '/verification',
      label: t('nav.verification') || 'Verification',
      icon: isVerified ? '✅' : isPending ? '⏳' : '🪪',
      badge: isVerified ? '✓' : isPending ? '⏳' : '!',
    },
    { to: '/referral', label: t('nav.referral'), icon: '🎁' },
    { to: '/transactions', label: t('nav.transactions'), icon: '📋' },
    { to: '/settings', label: t('nav.settings'), icon: '⚙️' },
  ];

  const handleLogout = async () => {
    await signOut();
    navigate('/login');
  };

  return (
    <div dir={isRTL ? 'rtl' : 'ltr'} className="flex min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 z-50 flex w-64 flex-col bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 transition-transform lg:static lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : isRTL ? 'translate-x-full' : '-translate-x-full'
        } ${isRTL ? 'right-0 border-l' : 'left-0 border-r'}`}
      >
        <div className="flex h-16 items-center gap-3 border-b border-gray-200 dark:border-gray-800 px-6">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white font-bold text-sm">
            C
          </div>
          <span className="text-lg font-bold text-gray-900 dark:text-white">
            {t('app.name')}
          </span>
        </div>

        <nav className="flex-1 overflow-y-auto p-4 space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                }`
              }
            >
              <span className="text-lg">{item.icon}</span>
              {item.label}
              {item.badge && (
                <span className={`ml-auto text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                  item.badge === '✓' ? 'bg-green-100 dark:bg-green-900/30 text-green-600' :
                  item.badge === '⏳' ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-600' :
                  'bg-red-100 dark:bg-red-900/30 text-red-600'
                }`}>
                  {item.badge}
                </span>
              )}
            </NavLink>
          ))}

          {/* Admin link */}
          {(user?.email === 'benahmed55212841@gmail.com' || user?.email === 'admin@cardix.app' || profile?.is_admin === true) && (
            <NavLink
              to="/admin"
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                }`}
            >
              <span className="text-lg">👑</span>
              {t('nav.admin')}
            </NavLink>
          )}
        </nav>

        <div className="border-t border-gray-200 dark:border-gray-800 p-4">
          <div className="mb-3 rounded-lg bg-gray-50 dark:bg-gray-800 p-3">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {user?.email}
            </p>
            <div className="flex items-center gap-2 mt-1">
              <p className="text-sm font-semibold text-gray-900 dark:text-white">
                {t('common.usd')}{profile?.balance?.toFixed(2) ?? '0.00'}
              </p>
              {!isVerified && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-red-100 dark:bg-red-900/30 text-red-600 font-medium">
                  {t('kyc.unverified') || 'Unverified'}
                </span>
              )}
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
          >
            🚪 {t('nav.logout')}
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex flex-1 flex-col min-w-0">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-4 lg:px-6">
          <button
            onClick={() => setSidebarOpen(true)}
            className="rounded-lg p-2 text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800 lg:hidden"
          >
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <button
            onClick={() => navigate(-1)}
            className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800 transition-colors"
            title={t('common.back')}
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-lg font-semibold text-gray-900 dark:text-white flex-1">
            {t('app.name')}
          </h1>
          {!isVerified && (
            <span className="hidden sm:inline-flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 px-2 py-1 rounded-full">
              ⚠️ {t('kyc.notVerified') || 'Not verified'}
            </span>
          )}
          <span className="text-sm text-gray-500">{t('app.tagline')}</span>
        </header>

        <main className="flex-1 p-4 lg:p-6 overflow-x-hidden">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
