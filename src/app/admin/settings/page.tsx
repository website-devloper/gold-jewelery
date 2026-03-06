'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { getSettings, updateSettings } from '@/lib/firestore/settings_db';
import { Settings, defaultSettings } from '@/lib/firestore/settings';
import Switch from '@/components/Switch';
import { useLanguage } from '@/context/LanguageContext';
import { useSettings } from '@/context/SettingsContext';
import { getCountries } from '@/lib/firestore/geography_db';
import { Country } from '@/lib/firestore/geography';

const SettingsPage = () => {
  const { t } = useLanguage();
  const { settings: appSettings } = useSettings();
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState('company');
  const [settings, setSettings] = useState<Settings>(defaultSettings);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testingSMTP, setTestingSMTP] = useState(false);
  const [smtpTestResult, setSmtpTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [testEmailAddress, setTestEmailAddress] = useState('');
  const [countries, setCountries] = useState<Country[]>([]);
  const [showDialog, setShowDialog] = useState(false);
  const [dialogMessage, setDialogMessage] = useState('');
  const [dialogType, setDialogType] = useState<'success' | 'error'>('success');

  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab) {
      setActiveTab(tab);
    }
  }, [searchParams]);

  const fetchSettings = useCallback(async () => {
    try {
      const data = await getSettings();
      if (data) {
        // Merge with default settings to ensure new fields are present if added later
        setSettings({ ...defaultSettings, ...data });
      }
    } catch {
      // Failed to fetch settings
      setDialogMessage(t('admin.settings.load_failed') || 'فشل تحميل الإعدادات');
      setDialogType('error');
      setShowDialog(true);
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  useEffect(() => {
    const fetchCountries = async () => {
      try {
        const countriesData = await getCountries();
        setCountries(countriesData);
      } catch {
        // Failed to fetch countries
        setCountries([]);
      }
    };
    fetchCountries();
  }, []);

  const handleSave = async () => {
    // Check if demo mode is enabled
    if (appSettings?.demoMode) {
      setDialogMessage(t('admin.settings.save_disabled_demo') || 'لا يمكن حفظ الإعدادات في الوضع التجريبي.');
      setDialogType('error');
      setShowDialog(true);
      return;
    }

    setSaving(true);
    try {
      await updateSettings(settings);
      setDialogMessage(t('admin.settings.save_success') || 'تم حفظ الإعدادات بنجاح!');
      setDialogType('success');
      setShowDialog(true);
    } catch {
      // Failed to save settings
      setDialogMessage(t('admin.settings.save_failed') || 'فشل حفظ الإعدادات');
      setDialogType('error');
      setShowDialog(true);
    } finally {
      setSaving(false);
    }
  };

  const handleInputChange = (
    section: keyof Settings,
    field: string,
    value: unknown
  ) => {
    setSettings((prev) => {
      if (section === 'seo') {
        return {
          ...prev,
          seo: {
            ...(prev.seo || {}),
            [field]: value,
          } as Settings['seo'],
        };
      }
      if (section === 'payment') {
        return {
          ...prev,
          payment: {
            ...(prev.payment || {}),
            [field]: value,
          } as Settings['payment'],
        };
      }
      if (section === 'emailNotifications') {
        return {
          ...prev,
          emailNotifications: {
            ...(prev.emailNotifications || {}),
            [field]: value,
          } as Settings['emailNotifications'],
        };
      }
      if (section === 'site') {
        const prevSite = prev.site || defaultSettings.site;
        const nextSite = {
          ...prevSite,
          [field]: value,
        } as Settings['site'];

        // Ensure at least one login option (phone / google / email) remains enabled
        if (
          field === 'enablePhoneLogin' ||
          field === 'enableGoogleLogin' ||
          field === 'enableEmailLogin'
        ) {
          const phoneEnabled = nextSite.enablePhoneLogin !== false;
          const googleEnabled = nextSite.enableGoogleLogin !== false;
          const emailEnabled = nextSite.enableEmailLogin !== false;

          if (!phoneEnabled && !googleEnabled && !emailEnabled) {
            setDialogMessage(
              t('admin.settings_site_login_options_error') ||
                'يجب تمكين خيار تسجيل دخول واحد على الأقل (الهاتف أو Google أو البريد الإلكتروني).'
            );
            setDialogType('error');
            setShowDialog(true);
            return prev; // Block change
          }
        }

        return {
          ...prev,
          site: nextSite,
        };
      }

      const currentSection = prev[section];
      return {
        ...prev,
        [section]: {
          ...(currentSection as unknown as Record<string, unknown>),
          [field]: value,
        },
      };
    });
  };


  const tabs = [
    { id: 'company', label: t('admin.settings_tab_company') || 'الشركة' },
    { id: 'site', label: t('admin.settings_tab_site') || 'إعداد الموقع' },
    { id: 'seo', label: t('admin.settings_tab_seo') || 'إعدادات تحسين محركات البحث' },
    { id: 'smtp', label: t('admin.settings_tab_smtp') || 'SMTP' },
    {
      id: 'emailNotifications',
      label: t('admin.settings_tab_email_notifications') || 'إشعارات البريد الإلكتروني',
    },
    { id: 'social', label: t('admin.settings_tab_social') || 'وسائل التواصل الاجتماعي' },
    { id: 'features', label: t('admin.settings_tab_features') || 'سمات' },
    { id: 'pages', label: t('admin.settings_tab_pages') || 'الصفحات' },
    { id: 'geography', label: t('admin.settings_tab_geography') || 'الجغرافيا' },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="relative">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-gray-900"></div>
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-xs font-semibold">
            {t('admin.common.loading') || 'جاري التحميل...'}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 md:space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-semibold text-gray-900 mb-2">
          {t('admin.settings') || 'الإعدادات'}
        </h1>
        <p className="text-gray-500 text-sm">{t('admin.settings_subtitle') || 'إدارة إعدادات متجرك وتكوينه'}</p>
      </div>
      
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          {/* Mobile Tabs - Scrollable */}
          <div className="md:hidden overflow-x-auto border-b border-gray-200">
            <div className="flex min-w-max">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`whitespace-nowrap py-3 px-4 border-b-2 font-medium text-xs transition-all focus:outline-none ${
                    activeTab === tab.id
                      ? 'border-gray-900 text-gray-900 bg-gray-50'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Desktop Tabs */}
          <div className="hidden md:flex border-b border-gray-200 flex-wrap">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`whitespace-nowrap py-4 px-6 border-b-2 font-medium text-sm transition-all focus:outline-none ${
                  activeTab === tab.id
                    ? 'border-gray-900 text-gray-900 bg-gray-50'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="p-4 sm:p-6 md:p-8">
            {/* Company Settings */}
            {activeTab === 'company' && (
              <div className="space-y-8 animate-fadeIn">
                <div>
                    <h2 className="text-xl font-bold text-gray-900 mb-1">
                      {t('admin.settings_company_title') || 'معلومات الشركة'}
                    </h2>
                    <p className="text-gray-500 text-sm">
                      {t('admin.settings_company_subtitle') ||
                        'أدخل تفاصيل عملك ليتم عرضها على الفواتير وصفحات الاتصال.'}
                    </p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                  <div className="col-span-1 md:col-span-2">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      {t('admin.settings_company_name') || 'اسم الشركة'}
                    </label>
                    <input 
                      type="text" 
                      value={settings.company.name || ''}
                      onChange={(e) => handleInputChange('company', 'name', e.target.value)}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent outline-none transition-all" 
                      placeholder="e.g. Pardah" 
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      {t('admin.settings_company_email') || 'عنوان البريد الإلكتروني'}
                    </label>
                    <input 
                      type="email" 
                      value={settings.company.email || ''}
                      onChange={(e) => handleInputChange('company', 'email', e.target.value)}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent outline-none transition-all" 
                      placeholder="contact@company.com" 
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      {t('admin.settings_company_phone') || 'رقم الهاتف'}
                    </label>
                    <input 
                      type="text" 
                      value={settings.company.phone || ''}
                      onChange={(e) => handleInputChange('company', 'phone', e.target.value)}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent outline-none transition-all" 
                      placeholder="+92 300 1234567" 
                    />
                  </div>

                  <div className="col-span-1 md:col-span-2">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      {t('admin.settings_company_website') || 'رابط الموقع'}
                    </label>
                    <input 
                      type="text" 
                      value={settings.company.website || ''}
                      onChange={(e) => handleInputChange('company', 'website', e.target.value)}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent outline-none transition-all" 
                      placeholder="https://www.pardah.com" 
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      {t('admin.settings_company_website_hint', {
                        example: settings.company.website || 'https://example.com',
                      }) ||
                        `This URL will be used for generating canonical URLs on product pages (e.g., ${
                          settings.company.website || 'https://example.com'
                        }/products/product-slug)`}
                    </p>
                  </div>

                  <div className="col-span-1 md:col-span-2">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      {t('admin.settings_company_address') || 'العنوان'}
                    </label>
                    <input 
                      type="text" 
                      value={settings.company.address || ''}
                      onChange={(e) => handleInputChange('company', 'address', e.target.value)}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent outline-none transition-all" 
                      placeholder="Street address, building number, etc." 
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      {t('admin.settings_company_city') || 'المدينة'}
                    </label>
                    <input 
                      type="text" 
                      value={settings.company.city || ''}
                      onChange={(e) => handleInputChange('company', 'city', e.target.value)}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent outline-none transition-all" 
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      {t('admin.settings_company_state') || 'الولاية/المقاطعة'}
                    </label>
                    <input 
                      type="text" 
                      value={settings.company.state || ''}
                      onChange={(e) => handleInputChange('company', 'state', e.target.value)}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent outline-none transition-all" 
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      {t('admin.settings_company_country_code') || 'رمز الدولة'}
                    </label>
                    <input 
                      type="text" 
                      value={settings.company.countryCode || ''}
                      onChange={(e) => handleInputChange('company', 'countryCode', e.target.value)}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent outline-none transition-all" 
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      {t('admin.settings_company_zip') || 'الرمز البريدي'}
                    </label>
                    <input 
                      type="text" 
                      value={settings.company.zipCode || ''}
                      onChange={(e) => handleInputChange('company', 'zipCode', e.target.value)}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent outline-none transition-all" 
                    />
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'seo' && (
              <div className="space-y-8 animate-fadeIn">
                <div>
                  <h2 className="text-xl font-bold text-gray-900 mb-1">
                    {t('admin.settings_seo_title') || 'إعدادات تحسين محركات البحث'}
                  </h2>
                  <p className="text-gray-500 text-sm">
                    {t('admin.settings_seo_subtitle') ||
                      'قم بتكوين إعدادات تحسين محرك البحث لمتجرك.'}
                  </p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                  <div className="col-span-1 md:col-span-2">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      {t('admin.settings_seo_site_title') || 'عنوان الموقع'}
                    </label>
                    <input 
                      type="text" 
                      value={settings.seo?.siteTitle || ''}
                      onChange={(e) => handleInputChange('seo', 'siteTitle', e.target.value)}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent outline-none transition-all" 
                      placeholder="Pardah - Elegant Abayas & Fashion" 
                    />
                  </div>

                  <div className="col-span-1 md:col-span-2">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      {t('admin.settings_seo_site_description') || 'وصف الموقع'}
                    </label>
                    <textarea 
                      value={settings.seo?.siteDescription || ''}
                      onChange={(e) => handleInputChange('seo', 'siteDescription', e.target.value)}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent outline-none transition-all h-24 resize-none" 
                      placeholder="Discover the latest collection of elegant abayas..."
                    />
                  </div>

                  <div className="col-span-1 md:col-span-2">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      {t('admin.settings_seo_keywords') || 'الكلمات الرئيسية (مفصولة بفواصل)'}
                    </label>
                    <input 
                      type="text" 
                      value={Array.isArray(settings.seo?.siteKeywords) ? settings.seo.siteKeywords.join(', ') : ''}
                      onChange={(e) => handleInputChange('seo', 'siteKeywords', e.target.value.split(',').map(k => k.trim()).filter(k => k))}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent outline-none transition-all" 
                      placeholder="abaya, modest fashion, islamic clothing" 
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      {t('admin.settings_seo_og_site_name') || 'افتح اسم موقع الرسم البياني'}
                    </label>
                    <input 
                      type="text" 
                      value={settings.seo?.ogSiteName || ''}
                      onChange={(e) => handleInputChange('seo', 'ogSiteName', e.target.value)}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent outline-none transition-all" 
                      placeholder="Pardah" 
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      {t('admin.settings_seo_og_locale') || 'افتح لغة الرسم البياني'}
                    </label>
                    <input 
                      type="text" 
                      value={settings.seo?.ogLocale || ''}
                      onChange={(e) => handleInputChange('seo', 'ogLocale', e.target.value)}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent outline-none transition-all" 
                      placeholder="en_US" 
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      {t('admin.settings_seo_twitter_card') || 'نوع بطاقة تويتر'}
                    </label>
                    <select 
                      value={settings.seo?.twitterCard || 'summary_large_image'}
                      onChange={(e) => handleInputChange('seo', 'twitterCard', e.target.value)}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent outline-none transition-all"
                    >
                      <option value="summary">{t('admin.settings_seo_twitter_summary') || 'ملخص'}</option>
                      <option value="summary_large_image">
                        {t('admin.settings_seo_twitter_summary_large') || 'ملخص الصورة الكبيرة'}
                      </option>
                      <option value="app">{t('admin.settings_seo_twitter_app') || 'برنامج'}</option>
                      <option value="player">
                        {t('admin.settings_seo_twitter_player') || 'لاعب'}
                      </option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      {t('admin.settings_seo_org_name') || 'اسم المنظمة'}
                    </label>
                    <input 
                      type="text" 
                      value={settings.seo?.organizationName || ''}
                      onChange={(e) => handleInputChange('seo', 'organizationName', e.target.value)}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent outline-none transition-all" 
                      placeholder="Pardah" 
                    />
                  </div>

                  <div className="col-span-1 md:col-span-2">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      {t('admin.settings_seo_org_url') || 'عنوان URL الخاص بالمنظمة'}
                    </label>
                    <input 
                      type="text" 
                      value={settings.seo?.organizationUrl || ''}
                      onChange={(e) => handleInputChange('seo', 'organizationUrl', e.target.value)}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent outline-none transition-all" 
                      placeholder="https://www.pardah.com" 
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      {t('admin.settings_seo_ga_id') || 'معرف جوجل أناليتكس'}
                    </label>
                    <input 
                      type="text" 
                      value={settings.seo?.googleAnalyticsId || ''}
                      onChange={(e) => handleInputChange('seo', 'googleAnalyticsId', e.target.value)}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent outline-none transition-all" 
                      placeholder="G-XXXXXXXXXX" 
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      {t('admin.settings_seo_gtm_id') || 'معرف إدارة العلامات من Google'}
                    </label>
                    <input 
                      type="text" 
                      value={settings.seo?.googleTagManagerId || ''}
                      onChange={(e) => handleInputChange('seo', 'googleTagManagerId', e.target.value)}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent outline-none transition-all" 
                      placeholder="GTM-XXXXXXX" 
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      {t('admin.settings_seo_fb_pixel') || 'معرف الفيسبوك بكسل'}
                    </label>
                    <input 
                      type="text" 
                      value={settings.seo?.facebookPixelId || ''}
                      onChange={(e) => handleInputChange('seo', 'facebookPixelId', e.target.value)}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent outline-none transition-all" 
                      placeholder="123456789012345" 
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      {t('admin.settings_seo_google_verification') || 'رمز التحقق جوجل'}
                    </label>
                    <input 
                      type="text" 
                      value={settings.seo?.googleVerificationCode || ''}
                      onChange={(e) => handleInputChange('seo', 'googleVerificationCode', e.target.value)}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent outline-none transition-all" 
                      placeholder="Verification code from Google Search Console" 
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      {t('admin.settings_seo_bing_verification') || 'رمز التحقق بينج'}
                    </label>
                    <input 
                      type="text" 
                      value={settings.seo?.bingVerificationCode || ''}
                      onChange={(e) => handleInputChange('seo', 'bingVerificationCode', e.target.value)}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent outline-none transition-all" 
                      placeholder="Verification code from Bing Webmaster Tools" 
                    />
                  </div>

                  <div className="col-span-1 md:col-span-2">
                    <Switch
                      label={t('admin.settings_seo_sitemap') || 'تمكين خريطة الموقع'}
                      checked={settings.seo?.sitemapEnabled ?? true}
                      onChange={(e) =>
                        handleInputChange('seo', 'sitemapEnabled', e.target.checked)
                      }
                    />
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'geography' && (
              <div className="space-y-8 animate-fadeIn">
                <div>
                  <h2 className="text-xl font-bold text-gray-900 mb-1">
                    {t('admin.settings_geography_title') || 'إعدادات الجغرافيا'}
                  </h2>
                  <p className="text-gray-500 text-sm">
                    {t('admin.settings_geography_subtitle') ||
                      'قم بتكوين الإعدادات الجغرافية لمتجرك.'}
                  </p>
                </div>
                <Switch
                  label={t('admin.settings_geography_countries') || 'الدول'}
                  checked={settings.geography.countries}
                  onChange={(e) =>
                    handleInputChange('geography', 'countries', e.target.checked)
                  }
                />
                <Switch
                  label={t('admin.settings_geography_states') || 'الولايات/المقاطعات'}
                  checked={settings.geography.states}
                  onChange={(e) =>
                    handleInputChange('geography', 'states', e.target.checked)
                  }
                />
                <Switch
                  label={t('admin.settings_geography_cities') || 'المدن'}
                  checked={settings.geography.cities}
                  onChange={(e) =>
                    handleInputChange('geography', 'cities', e.target.checked)
                  }
                />
              </div>
            )}

            {activeTab === 'pages' && (
              <div className="space-y-8 animate-fadeIn">
                <div>
                  <h2 className="text-xl font-bold text-gray-900 mb-1">
                    {t('admin.settings_pages_title') || 'إعدادات الصفحات'}
                  </h2>
                  <p className="text-gray-500 text-sm">
                    {t('admin.settings_pages_subtitle') ||
                      'تمكين أو تعطيل صفحات المعلومات المختلفة على موقعك.'}
                  </p>
                </div>
                <Switch
                  label={t('admin.settings_pages_about') || 'من نحن'}
                  checked={settings.pages.aboutUs}
                  onChange={(e) =>
                    handleInputChange('pages', 'aboutUs', e.target.checked)
                  }
                />
                <Switch
                  label={t('admin.settings_pages_privacy') || 'سياسة الخصوصية'}
                  checked={settings.pages.privacyPolicy}
                  onChange={(e) =>
                    handleInputChange('pages', 'privacyPolicy', e.target.checked)
                  }
                />
                <Switch
                  label={t('admin.settings_pages_terms') || 'شروط الخدمة'}
                  checked={settings.pages.termsOfService}
                  onChange={(e) =>
                    handleInputChange('pages', 'termsOfService', e.target.checked)
                  }
                />
                <Switch
                  label={t('admin.settings_pages_shipping_returns') || 'الشحن والإرجاع'}
                  checked={settings.pages.shippingReturns}
                  onChange={(e) =>
                    handleInputChange(
                      'pages',
                      'shippingReturns',
                      e.target.checked
                    )
                  }
                />
                <Switch
                  label={t('admin.settings_pages_size_guide') || 'دليل المقاسات'}
                  checked={settings.pages.sizeGuide}
                  onChange={(e) =>
                    handleInputChange('pages', 'sizeGuide', e.target.checked)
                  }
                />
                <Switch
                  label={t('admin.settings_pages_store_locator') || 'محدد موقع المتاجر'}
                  checked={settings.pages.storeLocator}
                  onChange={(e) =>
                    handleInputChange('pages', 'storeLocator', e.target.checked)
                  }
                />
                <Switch
                  label={t('admin.settings_pages_careers') || 'الوظائف'}
                  checked={settings.pages.careers}
                  onChange={(e) =>
                    handleInputChange('pages', 'careers', e.target.checked)
                  }
                />
                <Switch
                  label={t('admin.settings_pages_faqs') || 'الأسئلة الشائعة'}
                  checked={settings.pages.faqs}
                  onChange={(e) =>
                    handleInputChange('pages', 'faqs', e.target.checked)
                  }
                />
                <Switch
                  label={t('admin.settings_pages_contact') || 'اتصل بنا'}
                  checked={settings.pages.contactUs}
                  onChange={(e) =>
                    handleInputChange('pages', 'contactUs', e.target.checked)
                  }
                />
              </div>
            )}

            {activeTab === 'features' && (
              <div className="space-y-8 animate-fadeIn">
                <div>
                  <h2 className="text-xl font-bold text-gray-900 mb-1">
                    {t('admin.settings_features_title') || 'إعدادات الميزات'}
                  </h2>
                  <p className="text-gray-500 text-sm">
                    {t('admin.settings_features_subtitle') ||
                      'التحكم في إمكانية رؤية ووظائف الميزات المختلفة عبر متجرك.'}
                  </p>
                </div>
                <Switch
                  label={t('admin.settings_features_category') || 'الفئة'}
                  checked={settings.features.category}
                  onChange={(e) =>
                    handleInputChange('features', 'category', e.target.checked)
                  }
                />
                <Switch
                  label={t('admin.settings_features_brands') || 'العلامات التجارية'}
                  checked={settings.features.brands}
                  onChange={(e) =>
                    handleInputChange('features', 'brands', e.target.checked)
                  }
                />
                <Switch
                  label={t('admin.settings_features_collections') || 'المجموعات'}
                  checked={settings.features.collections}
                  onChange={(e) =>
                    handleInputChange('features', 'collections', e.target.checked)
                  }
                />
                <Switch
                  label={t('admin.settings_features_size') || 'المقاس'}
                  checked={settings.features.size}
                  onChange={(e) =>
                    handleInputChange('features', 'size', e.target.checked)
                  }
                />
                <Switch
                  label={t('admin.settings_features_colors') || 'الألوان'}
                  checked={settings.features.colors}
                  onChange={(e) =>
                    handleInputChange('features', 'colors', e.target.checked)
                  }
                />
                <Switch
                  label={t('admin.settings_features_banners') || 'اللافتات'}
                  checked={settings.features.banners}
                  onChange={(e) =>
                    handleInputChange('features', 'banners', e.target.checked)
                  }
                />
                <Switch
                  label={t('admin.settings_features_coupons') || 'القسائم'}
                  checked={settings.features.coupons}
                  onChange={(e) =>
                    handleInputChange('features', 'coupons', e.target.checked)
                  }
                />
                <Switch
                  label={t('admin.settings_features_email_marketing') || 'التسويق عبر البريد'}
                  checked={settings.features.emailMarketing}
                  onChange={(e) =>
                    handleInputChange(
                      'features',
                      'emailMarketing',
                      e.target.checked
                    )
                  }
                />
                <Switch
                  label={t('admin.settings_features_notifications') || 'الإشعارات'}
                  checked={settings.features.notifications}
                  onChange={(e) =>
                    handleInputChange(
                      'features',
                      'notifications',
                      e.target.checked
                    )
                  }
                />
                <Switch
                  label={t('admin.settings_features_blog') || 'المدونة'}
                  checked={settings.features.blog}
                  onChange={(e) =>
                    handleInputChange('features', 'blog', e.target.checked)
                  }
                />
                <Switch
                  label={t('admin.settings_features_wishlist') || 'المفضلة'}
                  checked={settings.features.wishlist}
                  onChange={(e) =>
                    handleInputChange('features', 'wishlist', e.target.checked)
                  }
                />
                <Switch
                  label={t('admin.settings_features_product_reviews') || 'تقييمات المنتج'}
                  checked={settings.features.productReviews}
                  onChange={(e) =>
                    handleInputChange('features', 'productReviews', e.target.checked)
                  }
                />
                <Switch
                  label={t('admin.settings_features_product_bundles') || 'مجموعات المنتجات'}
                  checked={settings.features.productBundles}
                  onChange={(e) =>
                    handleInputChange('features', 'productBundles', e.target.checked)
                  }
                />
                <Switch
                  label={t('admin.settings_features_product_templates') || 'قوالب المنتجات'}
                  checked={settings.features.productTemplates}
                  onChange={(e) =>
                    handleInputChange('features', 'productTemplates', e.target.checked)
                  }
                />
                <Switch
                  label={t('admin.settings_features_recently_viewed') || 'تم عرضها مؤخرًا'}
                  checked={settings.features.recentlyViewed}
                  onChange={(e) =>
                    handleInputChange('features', 'recentlyViewed', e.target.checked)
                  }
                />
                <Switch
                  label={t('admin.settings_features_product_recommendations') || 'توصيات المنتج'}
                  checked={settings.features.productRecommendations}
                  onChange={(e) =>
                    handleInputChange('features', 'productRecommendations', e.target.checked)
                  }
                />
                <Switch
                  label={t('admin.settings_features_import_export') || 'استيراد/تصدير'}
                  checked={settings.features.importExport}
                  onChange={(e) =>
                    handleInputChange('features', 'importExport', e.target.checked)
                  }
                />
                <Switch
                  label={t('admin.settings_features_abandoned_carts') || 'السلال المهجورة'}
                  checked={settings.features.abandonedCarts}
                  onChange={(e) =>
                    handleInputChange('features', 'abandonedCarts', e.target.checked)
                  }
                />
                <Switch
                  label={t('admin.settings_features_customer_segmentation') || 'تقسيم العملاء'}
                  checked={settings.features.customerSegmentation}
                  onChange={(e) =>
                    handleInputChange('features', 'customerSegmentation', e.target.checked)
                  }
                />
              </div>
            )}

            {/* Site Settings */}
            {activeTab === 'site' && (
              <div className="space-y-8 animate-fadeIn">
                <div>
                    <h2 className="text-xl font-bold text-gray-900 mb-1">
                      {t('admin.settings_site_title') || 'إعداد الموقع'}
                    </h2>
                    <p className="text-gray-500 text-sm">
                      {t('admin.settings_site_subtitle') ||
                        'إدارة إعدادات الموقع العامة والتعريب والميزات.'}
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      {t('admin.settings_site_date_format') || 'تنسيق التاريخ'}
                    </label>
                    <select 
                      value={settings.site.dateFormat || 'DD-MM-YYYY'}
                      onChange={(e) => handleInputChange('site', 'dateFormat', e.target.value)}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent outline-none transition-all bg-white"
                    >
                      <option value="DD-MM-YYYY">DD-MM-YYYY</option>
                      <option value="MM-DD-YYYY">MM-DD-YYYY</option>
                      <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      {t('admin.settings_site_time_format') || 'تنسيق الوقت'}
                    </label>
                    <select 
                      value={settings.site.timeFormat || '12 Hour'}
                      onChange={(e) => handleInputChange('site', 'timeFormat', e.target.value)}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent outline-none transition-all bg-white"
                    >
                      <option value="12 Hour">12 Hour</option>
                      <option value="24 Hour">24 Hour</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      {t('admin.settings_site_timezone') || 'المنطقة الزمنية الافتراضية'}
                    </label>
                    <select 
                      value={settings.site.timezone || 'Asia/Karachi'}
                      onChange={(e) => handleInputChange('site', 'timezone', e.target.value)}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent outline-none transition-all bg-white"
                    >
                      {/* UTC */}
                      <option value="UTC">UTC</option>

                      {/* Africa */}
                      <option value="Africa/Cairo">Africa/Cairo</option>
                      <option value="Africa/Johannesburg">Africa/Johannesburg</option>
                      <option value="Africa/Lagos">Africa/Lagos</option>
                      <option value="Africa/Nairobi">Africa/Nairobi</option>

                      {/* Americas */}
                      <option value="America/Los_Angeles">America/Los_Angeles (PST)</option>
                      <option value="America/Denver">America/Denver (MST)</option>
                      <option value="America/Chicago">America/Chicago (CST)</option>
                      <option value="America/New_York">America/New_York (EST)</option>
                      <option value="America/Sao_Paulo">America/Sao_Paulo</option>
                      <option value="America/Mexico_City">America/Mexico_City</option>
                      <option value="America/Toronto">America/Toronto</option>
                      <option value="America/Vancouver">America/Vancouver</option>

                      {/* Europe */}
                      <option value="Europe/London">Europe/London</option>
                      <option value="Europe/Paris">Europe/Paris</option>
                      <option value="Europe/Berlin">Europe/Berlin</option>
                      <option value="Europe/Madrid">Europe/Madrid</option>
                      <option value="Europe/Rome">Europe/Rome</option>
                      <option value="Europe/Amsterdam">Europe/Amsterdam</option>
                      <option value="Europe/Stockholm">Europe/Stockholm</option>
                      <option value="Europe/Istanbul">Europe/Istanbul</option>
                      <option value="Europe/Moscow">Europe/Moscow</option>

                      {/* Middle East / Asia */}
                      <option value="Asia/Dubai">Asia/Dubai</option>
                      <option value="Asia/Riyadh">Asia/Riyadh</option>
                      <option value="Asia/Tehran">Asia/Tehran</option>
                      <option value="Asia/Karachi">Asia/Karachi</option>
                      <option value="Asia/Kolkata">Asia/Kolkata</option>
                      <option value="Asia/Dhaka">Asia/Dhaka</option>
                      <option value="Asia/Bangkok">Asia/Bangkok</option>
                      <option value="Asia/Singapore">Asia/Singapore</option>
                      <option value="Asia/Hong_Kong">Asia/Hong_Kong</option>
                      <option value="Asia/Shanghai">Asia/Shanghai</option>
                      <option value="Asia/Tokyo">Asia/Tokyo</option>
                      <option value="Asia/Seoul">Asia/Seoul</option>
                      <option value="Asia/Jakarta">Asia/Jakarta</option>
                      <option value="Asia/Kuala_Lumpur">Asia/Kuala_Lumpur</option>

                      {/* Oceania */}
                      <option value="Australia/Sydney">Australia/Sydney</option>
                      <option value="Australia/Melbourne">Australia/Melbourne</option>
                      <option value="Pacific/Auckland">Pacific/Auckland</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      {t('admin.settings_site_default_country') || 'البلد الافتراضي'}
                    </label>
                    <select 
                      value={settings.site.defaultCountry || 'PK'}
                      onChange={(e) => handleInputChange('site', 'defaultCountry', e.target.value)}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent outline-none transition-all bg-white"
                    >
                      {countries.length > 0 ? (
                        countries
                          .sort((a, b) => a.name.localeCompare(b.name))
                          .map((country) => (
                            <option key={country.id} value={country.isoCode}>
                              {country.name} ({country.isoCode})
                            </option>
                          ))
                      ) : (
                        <option value="PK">Pakistan (PK)</option>
                      )}
                    </select>
                    <p className="text-xs text-gray-500 mt-1">
                      {t('admin.settings_site_default_country_hint') || 'سيتم استخدام هذا البلد كإعداد افتراضي لإدخال رقم الهاتف عبر الموقع.'}
                    </p>
                  </div>

                  <div className="col-span-1 md:col-span-2">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      {t('admin.settings_site_copyright') || 'نص حقوق التأليف والنشر'}
                    </label>
                    <input 
                      type="text" 
                      value={settings.site.copyrightText || ''}
                      onChange={(e) => handleInputChange('site', 'copyrightText', e.target.value)}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent outline-none transition-all" 
                    />
                  </div>


                  <div className="col-span-1 md:col-span-2">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      {t('admin.settings_site_google_maps_key') || 'مفتاح API لخرائط Google'}
                    </label>
                    <input 
                      type="text" 
                      value={appSettings?.demoMode && settings.site.googleMapsApiKey 
                        ? '*'.repeat(Math.min(settings.site.googleMapsApiKey.length, 40))
                        : (settings.site.googleMapsApiKey || '')}
                      onChange={(e) => handleInputChange('site', 'googleMapsApiKey', e.target.value)}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent outline-none transition-all" 
                      placeholder="AIzaSy..."
                      disabled={appSettings?.demoMode}
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      {t('admin.settings_site_google_maps_hint') ||
                        'مطلوب لميزة محدد موقع المتجر. احصل على مفتاح API الخاص بك من Google Cloud Console.'}
                    </p>
                  </div>

                   <div className="col-span-1 md:col-span-2 border-t border-gray-100 pt-6 mt-2">
                      <h4 className="text-base sm:text-lg font-bold text-gray-900 mb-4">{t('admin.settings_feature_toggles') || 'تبديل الميزات'}</h4>
                      <div className="space-y-4">
                          <label className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors">
                              <input 
                                type="checkbox" 
                                checked={settings.site.enableLanguageSwitcher}
                                onChange={(e) => handleInputChange('site', 'enableLanguageSwitcher', e.target.checked)}
                                className="w-5 h-5 text-black border-gray-300 rounded focus:ring-black" 
                              />
                              <div className="ml-3">
                              <span className="block text-sm font-medium text-gray-900">
                                {t('admin.settings_site_language_switcher') || 'محول اللغة'}
                              </span>
                              <span className="block text-sm text-gray-500">
                                {t('admin.settings_site_language_switcher_hint') ||
                                  'تمكين المستخدمين من التبديل بين اللغات في الواجهة الأمامية.'}
                              </span>
                              </div>
                          </label>
                          
                          <label className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors">
                              <input 
                                type="checkbox" 
                                checked={settings.site.enablePhoneVerification ?? false}
                                onChange={(e) => handleInputChange('site', 'enablePhoneVerification', e.target.checked)}
                                className="w-5 h-5 text-black border-gray-300 rounded focus:ring-black" 
                              />
                              <div className="ml-3">
                                <span className="block text-sm font-medium text-gray-900">
                                  {t('admin.settings_site_phone_verification') || 'التحقق من الهاتف'}
                                </span>
                                <span className="block text-sm text-gray-500">
                                  {t('admin.settings_site_phone_verification_hint') ||
                                    'اطلب من المستخدمين التحقق من رقم هواتفهم أثناء الخروج أو الاشتراك.'}
                                </span>
                              </div>
                          </label>

                          <div className="mt-4 pt-4 border-t border-gray-200">
                            <h3 className="text-sm font-semibold text-gray-900 mb-3">
                              {t('admin.settings_site_login_options') || 'خيارات تسجيل الدخول'}
                            </h3>
                            
                            <label className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors">
                              <input 
                                type="checkbox" 
                                checked={settings.site.enablePhoneLogin ?? true}
                                onChange={(e) => handleInputChange('site', 'enablePhoneLogin', e.target.checked)}
                                className="w-5 h-5 text-black border-gray-300 rounded focus:ring-black" 
                              />
                              <div className="ml-3">
                                <span className="block text-sm font-medium text-gray-900">
                                  {t('admin.settings_site_phone_login') || 'تسجيل الدخول عبر الهاتف'}
                                </span>
                                <span className="block text-sm text-gray-500">
                                  {t('admin.settings_site_phone_login_hint') ||
                                    'السماح للمستخدمين بتسجيل الدخول باستخدام رقم الهاتف.'}
                                </span>
                              </div>
                            </label>

                            <label className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors">
                              <input 
                                type="checkbox" 
                                checked={settings.site.enableGoogleLogin ?? true}
                                onChange={(e) => handleInputChange('site', 'enableGoogleLogin', e.target.checked)}
                                className="w-5 h-5 text-black border-gray-300 rounded focus:ring-black" 
                              />
                              <div className="ml-3">
                                <span className="block text-sm font-medium text-gray-900">
                                  {t('admin.settings_site_google_login') || 'تسجيل الدخول جوجل'}
                                </span>
                                <span className="block text-sm text-gray-500">
                                  {t('admin.settings_site_google_login_hint') ||
                                    'السماح للمستخدمين بتسجيل الدخول باستخدام Google.'}
                                </span>
                              </div>
                            </label>

                            <label className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors">
                              <input 
                                type="checkbox" 
                                checked={settings.site.enableEmailLogin ?? true}
                                onChange={(e) => handleInputChange('site', 'enableEmailLogin', e.target.checked)}
                                className="w-5 h-5 text-black border-gray-300 rounded focus:ring-black" 
                              />
                              <div className="ml-3">
                                <span className="block text-sm font-medium text-gray-900">
                                  {t('admin.settings_site_email_login') || 'تسجيل الدخول عبر البريد'}
                                </span>
                                <span className="block text-sm text-gray-500">
                                  {t('admin.settings_site_email_login_hint') ||
                                    'السماح للمستخدمين بتسجيل الدخول باستخدام البريد الإلكتروني.'}
                                </span>
                              </div>
                            </label>
                          </div>
                      </div>
                   </div>
                </div>
              </div>
            )}

            {/* SMTP Settings */}
            {activeTab === 'smtp' && (
              <div className="space-y-8 animate-fadeIn">
                <div>
                    <h3 className="text-xl font-bold text-gray-900 mb-1">
                      {t('admin.settings_smtp_title') || 'تكوين البريد الإلكتروني SMTP'}
                    </h3>
                    <p className="text-gray-500 text-sm">
                      {t('admin.settings_smtp_subtitle') ||
                        'قم بتكوين إعدادات خادم البريد الإلكتروني الخاص بك لإرسال رسائل البريد الإلكتروني الخاصة بالمعاملات.'}
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                  <div className="col-span-1 md:col-span-1">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      {t('admin.settings_smtp_host') || 'مضيف البريد'}{' '}
                      <span className="text-red-500">*</span>
                    </label>
                    <input 
                      type="text" 
                      value={settings.smtp.host || ''}
                      onChange={(e) => handleInputChange('smtp', 'host', e.target.value)}
                      placeholder="smtp.gmail.com" 
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent outline-none transition-all" 
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      {t('admin.settings_smtp_host_hint') ||
                        'على سبيل المثال، smtp.gmail.com، smtp.mail.yahoo.com'}
                    </p>
                  </div>

                  <div className="col-span-1 md:col-span-1">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      {t('admin.settings_smtp_port') || 'ميناء البريد'}{' '}
                      <span className="text-red-500">*</span>
                    </label>
                    <input 
                      type="text" 
                      value={settings.smtp.port || ''}
                      onChange={(e) => handleInputChange('smtp', 'port', e.target.value)}
                      placeholder="587" 
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent outline-none transition-all" 
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      {t('admin.settings_smtp_port_hint') ||
                        'المنافذ المشتركة: 587 (TLS)، 465 (SSL)، 25 (لا شيء)'}
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      {t('admin.settings_smtp_username') || 'اسم مستخدم البريد'}{' '}
                      <span className="text-red-500">*</span>
                    </label>
                    <input 
                      type="text" 
                      value={settings.smtp.username || ''}
                      onChange={(e) => handleInputChange('smtp', 'username', e.target.value)}
                      placeholder="your-email@example.com"
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent outline-none transition-all" 
                    />
                  </div>

                  <div>
                    <label className="block text.sm font-semibold text-gray-700 mb-2">
                      {t('admin.settings_smtp_password') || 'كلمة مرور البريد'}{' '}
                      <span className="text-red-500">*</span>
                    </label>
                    <input 
                      type="password" 
                      value={appSettings?.demoMode && settings.smtp.password 
                        ? '*'.repeat(Math.min(settings.smtp.password.length, 20))
                        : (settings.smtp.password || '')}
                      onChange={(e) => handleInputChange('smtp', 'password', e.target.value)}
                      placeholder="Your email password or app password"
                      disabled={appSettings?.demoMode}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent outline-none transition-all" 
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      {t('admin.settings_smtp_password_hint') ||
                        'بالنسبة إلى Gmail، استخدم كلمة مرور التطبيق بدلاً من كلمة المرور العادية'}
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      {t('admin.settings_smtp_from_name') || 'البريد من الاسم'}{' '}
                      <span className="text-red-500">*</span>
                    </label>
                    <input 
                      type="text" 
                      value={settings.smtp.fromName || ''}
                      onChange={(e) => handleInputChange('smtp', 'fromName', e.target.value)}
                      placeholder="Pardah Support" 
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent outline-none transition-all" 
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      {t('admin.settings_smtp_from_name_hint') ||
                        "Display name shown in recipient's inbox"}
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      {t('admin.settings_smtp_from_email') || 'البريد من البريد الإلكتروني'}{' '}
                      <span className="text-red-500">*</span>
                    </label>
                    <input 
                      type="email" 
                      value={settings.smtp.fromEmail || ''}
                      onChange={(e) => handleInputChange('smtp', 'fromEmail', e.target.value)}
                      placeholder="no-reply@pardah.com" 
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent outline-none transition-all" 
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      {t('admin.settings_smtp_from_email_hint') ||
                        'يجب أن يتطابق مع البريد الإلكتروني الخاص بحساب SMTP الخاص بك'}
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      {t('admin.settings_smtp_encryption') || 'تشفير البريد'}{' '}
                      <span className="text-red-500">*</span>
                    </label>
                    <select 
                      value={settings.smtp.encryption}
                      onChange={(e) => handleInputChange('smtp', 'encryption', e.target.value as 'tls' | 'ssl' | 'none')}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent outline-none transition-all bg-white"
                    >
                      <option value="tls">{t('admin.settings_smtp_tls') || 'طبقة النقل الآمنة (مستحسن)'}</option>
                      <option value="ssl">{t('admin.settings_smtp_ssl') || 'طبقة المقابس الآمنة'}</option>
                      <option value="none">{t('admin.settings_smtp_none') || 'بدون'}</option>
                    </select>
                    <p className="text-xs text-gray-500 mt-1">
                      {t('admin.settings_smtp_encryption_hint') ||
                        'TLS للمنفذ 587، SSL للمنفذ 465'}
                    </p>
                  </div>
                </div>

                {/* Test SMTP Section */}
                <div className="border-t border-gray-200 pt-6 mt-6">
                  <h4 className="text-lg font-bold text-gray-900 mb-4">
                    {t('admin.settings_smtp_test_title') || 'اختبار تكوين SMTP'}
                  </h4>
                  
                  <div className="bg-gray-50 rounded-xl p-6 space-y-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        {t('admin.settings_smtp_test_email') || 'اختبار عنوان البريد الإلكتروني'}
                      </label>
                      <div className="flex gap-3">
                        <input 
                          type="email" 
                          value={testEmailAddress}
                          onChange={(e) => setTestEmailAddress(e.target.value)}
                          placeholder={t('admin.settings_smtp_test_email_placeholder') || 'test@example.com'}
                          className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent outline-none transition-all" 
                        />
                        <button
                          type="button"
                          onClick={async () => {
                            if (!testEmailAddress) {
                              setDialogMessage(
                                t('admin.settings_smtp_test_email_required') ||
                                  'الرجاء إدخال عنوان بريد إلكتروني تجريبي'
                              );
                              setDialogType('error');
                              setShowDialog(true);
                              return;
                            }
                            
                            setTestingSMTP(true);
                            setSmtpTestResult(null);
                            
                            try {
                              const response = await fetch('/api/test-smtp', {
                                method: 'POST',
                                headers: {
                                  'Content-Type': 'application/json',
                                },
                                body: JSON.stringify({
                                  smtp: settings.smtp,
                                  testEmail: testEmailAddress,
                                }),
                              });
                              
                              const result = await response.json();
                              
                              if (result.success) {
                                setSmtpTestResult({
                                  success: true,
                                  message:
                                    t('admin.settings_smtp_test_success', {
                                      email: testEmailAddress,
                                    }) ||
                                    `Test email sent successfully to ${testEmailAddress}! Please check your inbox.`
                                });
                              } else {
                                setSmtpTestResult({
                                  success: false,
                                  message:
                                    result.error ||
                                    t('admin.settings_smtp_test_failed') ||
                                    'فشل في إرسال البريد الإلكتروني التجريبي. الرجاء التحقق من إعدادات SMTP الخاصة بك.'
                                });
                              }
                            } catch (error) {
                              setSmtpTestResult({
                                success: false,
                                message:
                                  error instanceof Error
                                    ? error.message
                                    : t('admin.settings_smtp_test_error') ||
                                      'حدث خطأ أثناء اختبار SMTP',
                              });
                            } finally {
                              setTestingSMTP(false);
                            }
                          }}
                          disabled={testingSMTP || !settings.smtp.host || !settings.smtp.port || !settings.smtp.username}
                          className="px-6 py-2.5 bg-black text-white rounded-lg font-semibold hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {testingSMTP
                            ? t('admin.settings_smtp_test_sending') || 'جاري الإرسال...'
                            : t('admin.settings_smtp_test_send') || 'إرسال البريد الإلكتروني للاختبار'}
                        </button>
                      </div>
                    </div>

                    {smtpTestResult && (
                      <div className={`p-4 rounded-lg ${
                        smtpTestResult.success 
                          ? 'bg-green-50 border border-green-200' 
                          : 'bg-red-50 border border-red-200'
                      }`}>
                        <div className="flex items-start gap-3">
                          {smtpTestResult.success ? (
                            <svg className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          ) : (
                            <svg className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          )}
                          <p
                            className={`text-sm font-medium ${
                            smtpTestResult.success ? 'text-green-800' : 'text-red-800'
                          }`}
                          >
                            {smtpTestResult.message}
                          </p>
                        </div>
                      </div>
                    )}

                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <h5 className="text-sm font-semibold text-blue-900 mb-2">
                        {t('admin.settings_smtp_common_title') || 'إعدادات SMTP الشائعة:'}
                      </h5>
                      <div className="text-xs text-blue-800 space-y-1">
                        <p>
                          {t('admin.settings_smtp_common_gmail') ||
                            'Gmail: smtp.gmail.com، المنفذ: 587، TLS، استخدم كلمة مرور التطبيق'}
                        </p>
                        <p>
                          {t('admin.settings_smtp_common_yahoo') ||
                            'ياهو: smtp.mail.yahoo.com، المنفذ: 587، TLS'}
                        </p>
                        <p>
                          {t('admin.settings_smtp_common_outlook') ||
                            'التوقعات: smtp-mail.outlook.com، المنفذ: 587، TLS'}
                        </p>
                        <p>
                          {t('admin.settings_smtp_common_custom') ||
                            'مخصص: تحقق مع مزود البريد الإلكتروني الخاص بك'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Email Notifications */}
            {activeTab === 'emailNotifications' && (
              <div className="space-y-8 animate-fadeIn">
                <div>
                  <h3 className="text-xl font-bold text-gray-900 mb-1">
                    {t('admin.settings_email_title') || 'إعدادات إشعارات البريد الإلكتروني'}
                  </h3>
                  <p className="text-gray-500 text-sm">
                    {t('admin.settings_email_subtitle') ||
                      'قم بتكوين إشعارات البريد الإلكتروني التلقائية للعملاء والمسؤولين.'}
                  </p>
                </div>

                {/* Customer Email Notifications */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                  <h4 className="text-lg font-bold text-gray-900 mb-6">
                    {t('admin.settings_email_customer_title') || 'إشعارات البريد الإلكتروني للعملاء'}
                  </h4>
                  
                  <div className="space-y-6">
                    {/* Order Placed */}
                    <div className="border border-gray-200 rounded-lg p-5">
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <h5 className="text-base font-semibold text-gray-900">
                            {t('admin.settings_email_customer_order_placed') || 'طلب البريد الإلكتروني الموضوع'}
                          </h5>
                          <p className="text-sm text-gray-500 mt-1">
                            {t('admin.settings_email_customer_order_placed_hint') ||
                              'أرسل بريدًا إلكترونيًا للتأكيد عندما يقدم العميل طلبًا'}
                          </p>
                        </div>
                        <Switch
                          label=""
                          checked={settings.emailNotifications?.customerOrderPlaced ?? true}
                          onChange={(e) => handleInputChange('emailNotifications', 'customerOrderPlaced', e.target.checked)}
                        />
                      </div>
                      {settings.emailNotifications?.customerOrderPlaced && (
                        <div className="space-y-4 mt-4 pt-4 border-t border-gray-200">
                          <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                              {t('admin.settings_email_subject') || 'موضوع البريد الإلكتروني'}
                            </label>
                            <input
                              type="text"
                              value={settings.emailNotifications?.customerOrderPlacedSubject || 'Order Confirmation - Order #{orderId}'}
                              onChange={(e) => handleInputChange('emailNotifications', 'customerOrderPlacedSubject', e.target.value)}
                              placeholder="Order Confirmation - Order #{orderId}"
                              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent outline-none transition-all"
                            />
                            <p className="text-xs text-gray-500 mt-1">
                              {t('admin.settings_email_variables_order_placed') ||
                                'Available variables: {orderId}, {customerName}, {orderTotal}'}
                            </p>
                          </div>
                          <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                              {t('admin.settings_email_template') || 'قالب البريد الإلكتروني (HTML)'}
                            </label>
                            <textarea
                              value={settings.emailNotifications?.customerOrderPlacedTemplate || ''}
                              onChange={(e) => handleInputChange('emailNotifications', 'customerOrderPlacedTemplate', e.target.value)}
                              placeholder="Enter HTML email template..."
                              rows={8}
                              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent outline-none transition-all font-mono text-sm"
                            />
                            <p className="text-xs text-gray-500 mt-1">
                              {t('admin.settings_email_variables_order_placed_template') ||
                                'Leave empty to use default template. Available variables: {orderId}, {customerName}, {orderTotal}, {orderItems}, {shippingAddress}'}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Order Status Update */}
                    <div className="border border-gray-200 rounded-lg p-5">
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <h5 className="text-base font-semibold text-gray-900">
                            {t('admin.settings_email_status_update') ||
                              'تحديث حالة الطلب عبر البريد الإلكتروني'}
                          </h5>
                          <p className="text-sm text-gray-500 mt-1">
                            {t('admin.settings_email_status_update_hint') ||
                              'إرسال بريد إلكتروني عند تغير حالة الطلب (المعالجة، الشحن، وما إلى ذلك)'}
                          </p>
                        </div>
                        <Switch
                          label=""
                          checked={settings.emailNotifications?.customerOrderStatusUpdate ?? true}
                          onChange={(e) => handleInputChange('emailNotifications', 'customerOrderStatusUpdate', e.target.checked)}
                        />
                      </div>
                      {settings.emailNotifications?.customerOrderStatusUpdate && (
                        <div className="space-y-4 mt-4 pt-4 border-t border-gray-200">
                          <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                              {t('admin.settings_email_subject') || 'موضوع البريد الإلكتروني'}
                            </label>
                            <input
                              type="text"
                              value={settings.emailNotifications?.customerOrderStatusUpdateSubject || 'Order Status Update - Order #{orderId}'}
                              onChange={(e) => handleInputChange('emailNotifications', 'customerOrderStatusUpdateSubject', e.target.value)}
                              placeholder="Order Status Update - Order #{orderId}"
                              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent outline-none transition-all"
                            />
                            <p className="text-xs text-gray-500 mt-1">
                              {t('admin.settings_email_variables_status_update') ||
                                'Available variables: {orderId}, {customerName}, {orderStatus}'}
                            </p>
                          </div>
                          <div>
                            <label className="block text.sm font-semibold text-gray-700 mb-2">
                              {t('admin.settings_email_template') || 'قالب البريد الإلكتروني (HTML)'}
                            </label>
                            <textarea
                              value={settings.emailNotifications?.customerOrderStatusUpdateTemplate || ''}
                              onChange={(e) => handleInputChange('emailNotifications', 'customerOrderStatusUpdateTemplate', e.target.value)}
                              placeholder="Enter HTML email template..."
                              rows={8}
                              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent outline-none transition-all font-mono text-sm"
                            />
                            <p className="text-xs text-gray-500 mt-1">
                              {t('admin.settings_email_variables_status_update_template') ||
                                'Leave empty to use default template. Available variables: {orderId}, {customerName}, {orderStatus}, {trackingNumber}'}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Order Delivered */}
                    <div className="border border-gray-200 rounded-lg p-5">
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <h5 className="text-base font-semibold text-gray-900">
                            {t('admin.settings_email_delivered') || 'تسليم الطلب عبر البريد الإلكتروني'}
                          </h5>
                          <p className="text-sm text-gray-500 mt-1">
                            {t('admin.settings_email_delivered_hint') ||
                              'إرسال البريد الإلكتروني عندما يتم تسليم الطلب'}
                          </p>
                        </div>
                        <Switch
                          label=""
                          checked={settings.emailNotifications?.customerOrderDelivered ?? true}
                          onChange={(e) => handleInputChange('emailNotifications', 'customerOrderDelivered', e.target.checked)}
                        />
                      </div>
                      {settings.emailNotifications?.customerOrderDelivered && (
                        <div className="space-y-4 mt-4 pt-4 border-t border-gray-200">
                          <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                              {t('admin.settings_email_subject') || 'موضوع البريد الإلكتروني'}
                            </label>
                            <input
                              type="text"
                              value={settings.emailNotifications?.customerOrderDeliveredSubject || 'Your Order Has Been Delivered - Order #{orderId}'}
                              onChange={(e) => handleInputChange('emailNotifications', 'customerOrderDeliveredSubject', e.target.value)}
                              placeholder="Your Order Has Been Delivered - Order #{orderId}"
                              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent outline-none transition-all"
                            />
                            <p className="text-xs text-gray-500 mt-1">
                              {t('admin.settings_email_variables_delivered') ||
                                'Available variables: {orderId}, {customerName}'}
                            </p>
                          </div>
                          <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                              {t('admin.settings_email_template') || 'قالب البريد الإلكتروني (HTML)'}
                            </label>
                            <textarea
                              value={settings.emailNotifications?.customerOrderDeliveredTemplate || ''}
                              onChange={(e) => handleInputChange('emailNotifications', 'customerOrderDeliveredTemplate', e.target.value)}
                              placeholder="Enter HTML email template..."
                              rows={8}
                              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent outline-none transition-all font-mono text-sm"
                            />
                            <p className="text-xs text-gray-500 mt-1">
                              {t('admin.settings_email_variables_delivered_template') ||
                                'Leave empty to use default template. Available variables: {orderId}, {customerName}, {deliveryDate}'}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Admin Email Notifications */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                  <h4 className="text-lg font-bold text-gray-900 mb-6">
                    {t('admin.settings_email_admin_title') || 'إشعارات البريد الإلكتروني للمشرف'}
                  </h4>
                  
                  <div className="border border-gray-200 rounded-lg p-5">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h5 className="text-base font-semibold text-gray-900">
                          {t('admin.settings_email_admin_new_order') || 'إشعار الطلب الجديد'}
                        </h5>
                        <p className="text-sm text-gray-500 mt-1">
                          {t('admin.settings_email_admin_new_order_hint') ||
                            'أرسل بريدًا إلكترونيًا إلى المشرف عند تقديم طلب جديد'}
                        </p>
                      </div>
                      <Switch
                        label=""
                        checked={settings.emailNotifications?.adminNewOrder ?? true}
                        onChange={(e) => handleInputChange('emailNotifications', 'adminNewOrder', e.target.checked)}
                      />
                    </div>
                    {settings.emailNotifications?.adminNewOrder && (
                      <div className="space-y-4 mt-4 pt-4 border-t border-gray-200">
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">
                            {t('admin.settings_email_admin_addresses') || 'عناوين البريد الإلكتروني للمسؤول'}
                          </label>
                          <input
                            type="text"
                            value={settings.emailNotifications?.adminNewOrderEmails?.join(', ') || ''}
                            onChange={(e) => {
                              const emails = e.target.value.split(',').map(email => email.trim()).filter(email => email);
                              handleInputChange('emailNotifications', 'adminNewOrderEmails', emails);
                            }}
                            placeholder="admin@example.com, manager@example.com"
                            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent outline-none transition-all"
                          />
                          <p className="text-xs text-gray-500 mt-1">
                            {t('admin.settings_email_admin_addresses_hint') ||
                              'أدخل عناوين بريد إلكتروني مفصولة بفواصل لتلقي إشعارات الطلبات الجديدة'}
                          </p>
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">
                            {t('admin.settings_email_subject') || 'موضوع البريد الإلكتروني'}
                          </label>
                          <input
                            type="text"
                            value={settings.emailNotifications?.adminNewOrderSubject || 'New Order Received - Order #{orderId}'}
                            onChange={(e) => handleInputChange('emailNotifications', 'adminNewOrderSubject', e.target.value)}
                            placeholder="New Order Received - Order #{orderId}"
                            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent outline-none transition-all"
                          />
                          <p className="text-xs text-gray-500 mt-1">
                            {t('admin.settings_email_variables_admin_new_order') ||
                              'Available variables: {orderId}, {customerName}, {orderTotal}'}
                          </p>
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">
                            {t('admin.settings_email_template') || 'قالب البريد الإلكتروني (HTML)'}
                          </label>
                          <textarea
                            value={settings.emailNotifications?.adminNewOrderTemplate || ''}
                            onChange={(e) => handleInputChange('emailNotifications', 'adminNewOrderTemplate', e.target.value)}
                            placeholder="Enter HTML email template..."
                            rows={8}
                            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent outline-none transition-all font-mono text-sm"
                          />
                          <p className="text-xs text-gray-500 mt-1">
                            {t('admin.settings_email_variables_admin_new_order_template') ||
                              'Leave empty to use default template. Available variables: {orderId}, {customerName}, {customerEmail}, {orderTotal}, {orderItems}, {shippingAddress}, {paymentMethod}'}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Social Media */}
            {activeTab === 'social' && (
              <div className="space-y-8 animate-fadeIn">
                <div>
                    <h3 className="text-xl font-bold text-gray-900 mb-1">
                      {t('admin.settings_social_title') || 'روابط وسائل التواصل الاجتماعي'}
                    </h3>
                    <p className="text-gray-500 text-sm">
                      {t('admin.settings_social_subtitle') ||
                        'قم بتوصيل ملفات تعريف الوسائط الاجتماعية الخاصة بك لعرضها في التذييل.'}
                    </p>
                </div>

                <div className="space-y-4 md:space-y-6">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      {t('admin.settings_social_facebook') || 'رابط فيسبوك'}
                    </label>
                    <div className="flex rounded-lg shadow-sm">
                      <span className="inline-flex items-center px-3 sm:px-4 rounded-l-lg border border-r-0 border-gray-300 bg-gray-50 text-gray-500 text-xs sm:text-sm font-medium">
                        facebook.com/
                      </span>
                      <input 
                        type="text" 
                        value={settings.social.facebook || ''}
                        onChange={(e) => handleInputChange('social', 'facebook', e.target.value)}
                        className="flex-1 block w-full px-3 sm:px-4 py-2.5 rounded-none rounded-r-lg border border-gray-300 focus:ring-2 focus:ring-black focus:border-transparent outline-none transition-all text-sm" 
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      {t('admin.settings_social_instagram') || 'رابط انستغرام'}
                    </label>
                    <div className="flex rounded-lg shadow-sm">
                      <span className="inline-flex items-center px-3 sm:px-4 rounded-l-lg border border-r-0 border-gray-300 bg-gray-50 text-gray-500 text-xs sm:text-sm font-medium">
                        instagram.com/
                      </span>
                      <input 
                        type="text" 
                        value={settings.social.instagram || ''}
                        onChange={(e) => handleInputChange('social', 'instagram', e.target.value)}
                        className="flex-1 block w-full px-3 sm:px-4 py-2.5 rounded-none rounded-r-lg border border-gray-300 focus:ring-2 focus:ring-black focus:border-transparent outline-none transition-all text-sm" 
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      {t('admin.settings_social_twitter') || 'رابط X (تويتر)'}
                    </label>
                    <div className="flex rounded-lg shadow-sm">
                      <span className="inline-flex items-center px-3 sm:px-4 rounded-l-lg border border-r-0 border-gray-300 bg-gray-50 text-gray-500 text-xs sm:text-sm font-medium">
                        x.com/
                      </span>
                      <input 
                        type="text" 
                        value={settings.social.twitter || ''}
                        onChange={(e) => handleInputChange('social', 'twitter', e.target.value)}
                        className="flex-1 block w-full px-3 sm:px-4 py-2.5 rounded-none rounded-r-lg border border-gray-300 focus:ring-2 focus:ring-black focus:border-transparent outline-none transition-all text-sm" 
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      {t('admin.settings_social_youtube') || 'رابط يوتيوب'}
                    </label>
                    <div className="flex rounded-lg shadow-sm">
                      <span className="inline-flex items-center px-3 sm:px-4 rounded-l-lg border border-r-0 border-gray-300 bg-gray-50 text-gray-500 text-xs sm:text-sm font-medium">
                        youtube.com/
                      </span>
                      <input 
                        type="text" 
                        value={settings.social.youtube || ''}
                        onChange={(e) => handleInputChange('social', 'youtube', e.target.value)}
                        className="flex-1 block w-full px-3 sm:px-4 py-2.5 rounded-none rounded-r-lg border border-gray-300 focus:ring-2 focus:ring-black focus:border-transparent outline-none transition-all text-sm" 
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="mt-8 sm:mt-12 pt-6 border-t border-gray-200 flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-3 sm:gap-4">
              <button
                type="button"
                onClick={fetchSettings}
                className="px-4 sm:px-6 py-2.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 hover:text-black transition-colors"
                disabled={saving}
              >
                {t('admin.settings_discard') || 'تجاهل التغييرات'}
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className={`px-4 sm:px-6 py-2.5 bg-gray-900 text-white rounded-lg text-sm font-semibold hover:bg-gray-800 transition-all flex items-center justify-center ${saving ? 'opacity-70 cursor-not-allowed' : ''}`}
              >
                {saving ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    {t('admin.settings_saving') || 'جاري الحفظ...'}
                  </>
                ) : (
                  t('admin.settings_save') || 'حفظ الإعدادات'
                )}
              </button>
          </div>
        </div>
      </div>

      {/* Success/Error Dialog */}
      {showDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-start gap-4">
              {dialogType === 'success' ? (
                <div className="flex-shrink-0 w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6 text-green-600">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              ) : (
                <div className="flex-shrink-0 w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6 text-red-600">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 9.75l4.5 4.5m0-4.5l-4.5 4.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              )}
              <div className="flex-1">
                <h3 className={`text-lg font-semibold mb-1 ${dialogType === 'success' ? 'text-green-900' : 'text-red-900'}`}>
                  {dialogType === 'success' ? (t('admin.common.success') || 'نجاح') : (t('admin.common.error') || 'خطأ')}
                </h3>
                <p className="text-gray-600 text-sm mb-4">
                  {dialogMessage}
                </p>
                <button
                  onClick={() => setShowDialog(false)}
                  className={`w-full px-4 py-2.5 rounded-lg text-sm font-semibold transition-colors ${
                    dialogType === 'success'
                      ? 'bg-gray-900 text-white hover:bg-gray-800'
                      : 'bg-red-600 text-white hover:bg-red-700'
                  }`}
                >
                  {t('admin.common.ok') || 'OK'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SettingsPage;
