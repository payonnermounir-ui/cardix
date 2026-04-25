import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@/store/authStore';

export default function Settings() {
  const { t, i18n } = useTranslation();
  const { profile, user } = useAuthStore();

  const languages = [
    { code: 'en', label: t('settings.english'), flag: '🇺🇸' },
    { code: 'fr', label: t('settings.french'), flag: '🇫🇷' },
    { code: 'ar', label: t('settings.arabic'), flag: '🇸🇦' },
  ];

  function changeLanguage(lang: string) {
    i18n.changeLanguage(lang);
    localStorage.setItem('i18nextLng', lang);
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{t('settings.title')}</h2>

      {/* Language */}
      <div className="rounded-2xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          🌐 {t('settings.language')}
        </h3>
        <div className="grid gap-3 sm:grid-cols-3">
          {languages.map((lang) => (
            <button
              key={lang.code}
              onClick={() => changeLanguage(lang.code)}
              className={`flex items-center gap-3 rounded-xl border p-4 text-left transition-all ${
                i18n.language === lang.code
                  ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 shadow-sm'
                  : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
              }`}
            >
              <span className="text-2xl">{lang.flag}</span>
              <span className={`text-sm font-medium ${
                i18n.language === lang.code
                  ? 'text-indigo-700 dark:text-indigo-300'
                  : 'text-gray-700 dark:text-gray-300'
              }`}>
                {lang.label}
              </span>
              {i18n.language === lang.code && (
                <span className="ml-auto text-indigo-600">✓</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Profile info */}
      <div className="rounded-2xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          👤 {t('settings.profile')}
        </h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-800">
            <span className="text-sm text-gray-500 dark:text-gray-400">{t('settings.email')}</span>
            <span className="text-sm font-medium text-gray-900 dark:text-white">{user?.email}</span>
          </div>
          <div className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-800">
            <span className="text-sm text-gray-500 dark:text-gray-400">{t('settings.referralCode')}</span>
            <span className="text-sm font-mono font-bold text-indigo-600 dark:text-indigo-400">
              {profile?.referral_code || '------'}
            </span>
          </div>
          <div className="flex items-center justify-between py-2">
            <span className="text-sm text-gray-500 dark:text-gray-400">{t('settings.memberSince')}</span>
            <span className="text-sm font-medium text-gray-900 dark:text-white">
              {profile?.created_at
                ? new Date(profile.created_at).toLocaleDateString(undefined, {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })
                : '---'}
            </span>
          </div>
        </div>
      </div>

      {/* App info */}
      <div className="rounded-2xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
          {t('app.name')}
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {t('app.tagline')} — Virtual Card Management Platform
        </p>
        <p className="text-xs text-gray-400 mt-2">Version 1.0.0</p>
      </div>
    </div>
  );
}
