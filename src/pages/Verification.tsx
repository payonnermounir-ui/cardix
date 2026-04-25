import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@/store/authStore';
import { supabase } from '@/lib/supabase';
import { countries } from '@/data/countries';

export default function Verification() {
  const { t, i18n } = useTranslation();
  const { user, profile, fetchProfile } = useAuthStore();
  const navigate = useNavigate();

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [country, setCountry] = useState('');
  const [countryCode, setCountryCode] = useState('+1');
  const [phone, setPhone] = useState('');
  const [cardName, setCardName] = useState('');
  const [docType, setDocType] = useState<'id' | 'passport'>('id');
  const [idFront, setIdFront] = useState<File | null>(null);
  const [idBack, setIdBack] = useState<File | null>(null);
  const [passport, setPassport] = useState<File | null>(null);
  const [idFrontPreview, setIdFrontPreview] = useState('');
  const [idBackPreview, setIdBackPreview] = useState('');
  const [passportPreview, setPassportPreview] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [searchCountry, setSearchCountry] = useState('');
  const [showCountries, setShowCountries] = useState(false);
  const [searchCode, setSearchCode] = useState('');
  const [showCodes, setShowCodes] = useState(false);

  useEffect(() => {
    if (profile) {
      if (profile.kyc_status === 'approved') {
        navigate('/dashboard');
        return;
      }
      setFirstName(profile.first_name || '');
      setLastName(profile.last_name || '');
      setCountry(profile.country || '');
      setPhone(profile.phone || '');
      setCardName(profile.card_name || '');
    }
  }, [profile]);

  const filteredCountries = countries.filter(
    (c) =>
      c.name.toLowerCase().includes(searchCountry.toLowerCase()) ||
      c.code.toLowerCase().includes(searchCountry.toLowerCase())
  );

  const filteredCodes = countries.filter(
    (c) =>
      c.phone.includes(searchCode) ||
      c.name.toLowerCase().includes(searchCode.toLowerCase())
  );

  const selectedCountry = countries.find((c) => c.code === country);

  function handleFile(file: File | null, setter: (f: File | null) => void, setPreview: (s: string) => void) {
    if (file) {
      setter(file);
      const reader = new FileReader();
      reader.onload = () => setPreview(reader.result as string);
      reader.readAsDataURL(file);
    } else {
      setter(null);
      setPreview('');
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setSuccess(false);

    if (!firstName.trim() || !lastName.trim()) {
      setError(t('kyc.errorName') || 'First name and last name are required');
      return;
    }
    if (!country) {
      setError(t('kyc.errorCountry') || 'Please select your country');
      return;
    }
    if (!phone.trim()) {
      setError(t('kyc.errorPhone') || 'Phone number is required');
      return;
    }
    if (!cardName.trim()) {
      setError(t('kyc.errorCardName') || 'Card name is required');
      return;
    }
    if (docType === 'id' && (!idFront || !idBack)) {
      setError(t('kyc.errorDocs') || 'Please upload both sides of your ID');
      return;
    }
    if (docType === 'passport' && !passport) {
      setError(t('kyc.errorPassport') || 'Please upload your passport');
      return;
    }

    setSubmitting(true);

    // Upload files to Supabase Storage
    let idFrontUrl = '';
    let idBackUrl = '';
    let passportUrl = '';

    try {
      if (idFront) {
        const fileName = `${user!.id}/id_front_${Date.now()}`;
        const { error: uploadErr } = await supabase.storage
          .from('kyc-docs')
          .upload(fileName, idFront);
        if (!uploadErr) {
          const { data: urlData } = supabase.storage.from('kyc-docs').getPublicUrl(fileName);
          idFrontUrl = urlData.publicUrl;
        }
      }
      if (idBack) {
        const fileName = `${user!.id}/id_back_${Date.now()}`;
        const { error: uploadErr } = await supabase.storage
          .from('kyc-docs')
          .upload(fileName, idBack);
        if (!uploadErr) {
          const { data: urlData } = supabase.storage.from('kyc-docs').getPublicUrl(fileName);
          idBackUrl = urlData.publicUrl;
        }
      }
      if (passport) {
        const fileName = `${user!.id}/passport_${Date.now()}`;
        const { error: uploadErr } = await supabase.storage
          .from('kyc-docs')
          .upload(fileName, passport);
        if (!uploadErr) {
          const { data: urlData } = supabase.storage.from('kyc-docs').getPublicUrl(fileName);
          passportUrl = urlData.publicUrl;
        }
      }
    } catch {
      // Continue even if upload fails - we'll save form data
    }

    const fullPhone = `${countryCode}${phone}`;

    const { error: updateErr } = await supabase
      .from('profiles')
      .update({
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        country,
        phone: fullPhone,
        card_name: cardName.trim(),
        kyc_status: 'pending',
        kyc_verified: false,
      })
      .eq('id', user!.id);

    if (updateErr) {
      setError(updateErr.message);
      setSubmitting(false);
      return;
    }

    // Save KYC submission record
    await supabase.from('kyc_submissions').upsert({
      user_id: user!.id,
      doc_type: docType,
      id_front_url: idFrontUrl || null,
      id_back_url: idBackUrl || null,
      passport_url: passportUrl || null,
      status: 'pending',
    }, { onConflict: 'user_id' });

    await fetchProfile(user!.id);
    setSuccess(true);
    setSubmitting(false);
  }

  const isRTL = i18n.language === 'ar';

  if (profile?.kyc_status === 'approved') {
    return null;
  }

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
        {t('kyc.title') || 'Identity Verification'}
      </h2>

      {profile?.kyc_status === 'pending' && !success && (
        <div className="rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 p-4 text-sm text-amber-700 dark:text-amber-300">
          ⏳ {t('kyc.pending') || 'Your verification is under review. You will be notified once approved.'}
        </div>
      )}

      {profile?.kyc_status === 'rejected' && (
        <div className="rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4 text-sm text-red-700 dark:text-red-300">
          ❌ {t('kyc.rejected') || 'Your verification was rejected. Please resubmit with correct information.'}
        </div>
      )}

      {success && (
        <div className="rounded-xl bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 p-4 text-sm text-green-700 dark:text-green-300">
          ✅ {t('kyc.success') || 'Verification submitted successfully! Your application is under review.'}
        </div>
      )}

      <div className="rounded-2xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 p-6 shadow-sm">
        <div className="mb-6 p-4 rounded-xl bg-indigo-50 dark:bg-indigo-900/20 text-sm text-indigo-700 dark:text-indigo-300">
          💡 {t('kyc.note') || 'You must verify your identity before creating virtual cards. Card creation costs $10.'}
        </div>

        <form onSubmit={handleSubmit} className="space-y-5" dir={isRTL ? 'rtl' : 'ltr'}>
          {/* First & Last Name */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('kyc.firstName') || 'First Name'} *
              </label>
              <input
                type="text"
                required
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder={t('kyc.firstNamePlaceholder') || 'John'}
                className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-4 py-2.5 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('kyc.lastName') || 'Last Name'} *
              </label>
              <input
                type="text"
                required
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder={t('kyc.lastNamePlaceholder') || 'Doe'}
                className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-4 py-2.5 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all"
              />
            </div>
          </div>

          {/* Country */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('kyc.country') || 'Country'} *
            </label>
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowCountries(!showCountries)}
                className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-4 py-2.5 text-sm text-left flex items-center gap-2 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all"
              >
                {selectedCountry ? (
                  <>
                    <span className="text-lg">{selectedCountry.code === 'MA' ? '🇲🇦' : selectedCountry.code === 'DZ' ? '🇩🇿' : selectedCountry.code === 'TN' ? '🇹🇳' : selectedCountry.code === 'EG' ? '🇪🇬' : selectedCountry.code === 'SA' ? '🇸🇦' : selectedCountry.code === 'AE' ? '🇦🇪' : selectedCountry.code === 'FR' ? '🇫🇷' : selectedCountry.code === 'GB' ? '🇬🇧' : selectedCountry.code === 'US' ? '🇺🇸' : selectedCountry.code === 'DE' ? '🇩🇪' : selectedCountry.code === 'QA' ? '🇶🇦' : selectedCountry.code === 'KW' ? '🇰🇼' : selectedCountry.code === 'OM' ? '🇴🇲' : selectedCountry.code === 'BH' ? '🇧🇭' : selectedCountry.code === 'JO' ? '🇯🇴' : selectedCountry.code === 'LB' ? '🇱🇧' : selectedCountry.code === 'IQ' ? '🇮🇶' : selectedCountry.code === 'SY' ? '🇸🇾' : selectedCountry.code === 'YE' ? '🇾🇪' : selectedCountry.code === 'PS' ? '🇵🇸' : selectedCountry.code === 'SD' ? '🇸🇩' : selectedCountry.code === 'LY' ? '🇱🇾' : selectedCountry.code === 'TR' ? '🇹🇷' : selectedCountry.code === 'PK' ? '🇵🇰' : selectedCountry.code === 'IN' ? '🇮🇳' : selectedCountry.code === 'BD' ? '🇧🇩' : selectedCountry.code === 'ID' ? '🇮🇩' : selectedCountry.code === 'MY' ? '🇲🇾' : selectedCountry.code === 'CN' ? '🇨🇳' : selectedCountry.code === 'JP' ? '🇯🇵' : selectedCountry.code === 'KR' ? '🇰🇷' : selectedCountry.code === 'NG' ? '🇳🇬' : selectedCountry.code === 'ZA' ? '🇿🇦' : selectedCountry.code === 'BR' ? '🇧🇷' : selectedCountry.code === 'CA' ? '🇨🇦' : selectedCountry.code === 'IT' ? '🇮🇹' : selectedCountry.code === 'ES' ? '🇪🇸' : selectedCountry.code === 'RU' ? '🇷🇺' : selectedCountry.code === 'AU' ? '🇦🇺' : '🌍'}
                    </span>
                    <span className="text-gray-900 dark:text-white">{selectedCountry.name}</span>
                  </>
                ) : (
                  <span className="text-gray-400">{t('kyc.selectCountry') || 'Select country...'}</span>
                )}
                <span className="ml-auto text-gray-400">{showCountries ? '▲' : '▼'}</span>
              </button>
              {showCountries && (
                <div className="absolute z-50 mt-1 w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-lg max-h-60 overflow-hidden">
                  <div className="p-2">
                    <input
                      type="text"
                      value={searchCountry}
                      onChange={(e) => setSearchCountry(e.target.value)}
                      placeholder={t('kyc.searchCountry') || 'Search country...'}
                      className="w-full rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 px-3 py-1.5 text-sm text-gray-900 dark:text-white placeholder-gray-400 outline-none"
                      autoFocus
                    />
                  </div>
                  <div className="overflow-y-auto max-h-48">
                    {filteredCountries.map((c) => (
                      <button
                        key={c.code}
                        type="button"
                        onClick={() => {
                          setCountry(c.code);
                          setCountryCode(c.phone);
                          setShowCountries(false);
                          setSearchCountry('');
                        }}
                        className={`w-full flex items-center gap-2 px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${
                          country === c.code ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600' : 'text-gray-700 dark:text-gray-300'
                        }`}
                      >
                        <span>{c.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Phone */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('kyc.phone') || 'Phone Number'} *
            </label>
            <div className="flex gap-2">
              <div className="relative w-32 shrink-0">
                <button
                  type="button"
                  onClick={() => setShowCodes(!showCodes)}
                  className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-3 py-2.5 text-sm text-gray-900 dark:text-white flex items-center gap-1 focus:border-indigo-500 outline-none"
                >
                  <span>{countryCode}</span>
                  <span className="ml-auto text-gray-400 text-xs">{showCodes ? '▲' : '▼'}</span>
                </button>
                {showCodes && (
                  <div className="absolute z-50 mt-1 w-48 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-lg max-h-48 overflow-hidden">
                    <div className="p-1">
                      <input
                        type="text"
                        value={searchCode}
                        onChange={(e) => setSearchCode(e.target.value)}
                        placeholder="Search..."
                        className="w-full rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 px-2 py-1 text-xs outline-none"
                        autoFocus
                      />
                    </div>
                    <div className="overflow-y-auto max-h-36">
                      {filteredCodes.map((c) => (
                        <button
                          key={c.code}
                          type="button"
                          onClick={() => {
                            setCountryCode(c.phone);
                            setShowCodes(false);
                            setSearchCode('');
                          }}
                          className={`w-full px-3 py-1.5 text-xs text-left hover:bg-gray-100 dark:hover:bg-gray-700 ${
                            countryCode === c.phone ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600' : 'text-gray-700 dark:text-gray-300'
                          }`}
                        >
                          {c.name} ({c.phone})
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <input
                type="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/[^0-9]/g, ''))}
                placeholder="612345678"
                className="flex-1 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-4 py-2.5 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all"
              />
            </div>
          </div>

          {/* Card Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('kyc.cardName') || 'Name on Bank Card'} *
            </label>
            <input
              type="text"
              required
              value={cardName}
              onChange={(e) => setCardName(e.target.value.toUpperCase())}
              placeholder={t('kyc.cardNamePlaceholder') || 'JOHN DOE'}
              className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-4 py-2.5 text-sm text-gray-900 dark:text-white placeholder-gray-400 font-mono tracking-wider focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all"
              maxLength={27}
            />
            <p className="text-xs text-gray-400 mt-1">
              {t('kyc.cardNameHint') || 'This name will appear on your virtual card'}
            </p>
          </div>

          {/* Document Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('kyc.docType') || 'Document Type'} *
            </label>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setDocType('id')}
                className={`flex-1 rounded-xl border p-3 text-sm font-medium transition-all ${
                  docType === 'id'
                    ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300 shadow-sm'
                    : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-gray-300'
                }`}
              >
                🪪 {t('kyc.nationalId') || 'National ID Card'}
              </button>
              <button
                type="button"
                onClick={() => setDocType('passport')}
                className={`flex-1 rounded-xl border p-3 text-sm font-medium transition-all ${
                  docType === 'passport'
                    ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300 shadow-sm'
                    : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-gray-300'
                }`}
              >
                📘 {t('kyc.passport') || 'Passport'}
              </button>
            </div>
          </div>

          {/* Document Upload */}
          {docType === 'id' ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('kyc.idFront') || 'ID Card - Front'} *
                </label>
                <div className="relative">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleFile(e.target.files?.[0] || null, setIdFront, setIdFrontPreview)}
                    className="hidden"
                    id="idFront"
                  />
                  <label
                    htmlFor="idFront"
                    className={`flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-4 cursor-pointer transition-all ${
                      idFrontPreview
                        ? 'border-green-400 bg-green-50 dark:bg-green-900/10'
                        : 'border-gray-300 dark:border-gray-600 hover:border-indigo-400 bg-gray-50 dark:bg-gray-800'
                    }`}
                  >
                    {idFrontPreview ? (
                      <img src={idFrontPreview} alt="ID Front" className="h-32 object-contain rounded-lg" />
                    ) : (
                      <div className="text-center">
                        <span className="text-2xl">📸</span>
                        <p className="text-xs text-gray-400 mt-1">{t('kyc.upload') || 'Click to upload'}</p>
                      </div>
                    )}
                  </label>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('kyc.idBack') || 'ID Card - Back'} *
                </label>
                <div className="relative">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleFile(e.target.files?.[0] || null, setIdBack, setIdBackPreview)}
                    className="hidden"
                    id="idBack"
                  />
                  <label
                    htmlFor="idBack"
                    className={`flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-4 cursor-pointer transition-all ${
                      idBackPreview
                        ? 'border-green-400 bg-green-50 dark:bg-green-900/10'
                        : 'border-gray-300 dark:border-gray-600 hover:border-indigo-400 bg-gray-50 dark:bg-gray-800'
                    }`}
                  >
                    {idBackPreview ? (
                      <img src={idBackPreview} alt="ID Back" className="h-32 object-contain rounded-lg" />
                    ) : (
                      <div className="text-center">
                        <span className="text-2xl">📸</span>
                        <p className="text-xs text-gray-400 mt-1">{t('kyc.upload') || 'Click to upload'}</p>
                      </div>
                    )}
                  </label>
                </div>
              </div>
            </div>
          ) : (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('kyc.passportUpload') || 'Passport'} *
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => handleFile(e.target.files?.[0] || null, setPassport, setPassportPreview)}
                className="hidden"
                id="passport"
              />
              <label
                htmlFor="passport"
                className={`flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-6 cursor-pointer transition-all ${
                  passportPreview
                    ? 'border-green-400 bg-green-50 dark:bg-green-900/10'
                    : 'border-gray-300 dark:border-gray-600 hover:border-indigo-400 bg-gray-50 dark:bg-gray-800'
                }`}
              >
                {passportPreview ? (
                  <img src={passportPreview} alt="Passport" className="h-40 object-contain rounded-lg" />
                ) : (
                  <div className="text-center">
                    <span className="text-3xl">📘</span>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">{t('kyc.uploadPassport') || 'Upload passport photo'}</p>
                    <p className="text-xs text-gray-400 mt-1">{t('kyc.uploadHint') || 'JPG, PNG - Max 5MB'}</p>
                  </div>
                )}
              </label>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="rounded-lg bg-red-50 dark:bg-red-900/20 p-3 text-sm text-red-600 dark:text-red-400">
              {error}
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-200 dark:shadow-indigo-900/30 hover:from-indigo-700 hover:to-violet-700 disabled:opacity-50 transition-all"
          >
            {submitting
              ? t('common.loading')
              : profile?.kyc_status === 'rejected'
              ? (t('kyc.resubmit') || 'Resubmit Verification')
              : (t('kyc.submit') || 'Submit Verification')}
          </button>
        </form>
      </div>
    </div>
  );
}
