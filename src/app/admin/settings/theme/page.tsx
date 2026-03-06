'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { useSearchParams } from 'next/navigation';
import { getSettings, updateSettings } from '@/lib/firestore/settings_db';
import { Settings, defaultSettings, PaymentMethod } from '@/lib/firestore/settings';
import { storage } from '@/lib/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { useLanguage } from '@/context/LanguageContext';
import { useCurrency } from '@/context/CurrencyContext';

const ThemePage = () => {
  const { t } = useLanguage();
  const { defaultCurrency } = useCurrency();
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState('logo');
  const [settings, setSettings] = useState<Settings>(defaultSettings);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState<{ [key: string]: boolean }>({});

  const normalizeThemeFont = () => 'Bader Goldstar';

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
        const merged = { ...defaultSettings, ...data };
        setSettings({
          ...merged,
          theme: {
            ...merged.theme,
            fonts: {
              heading: normalizeThemeFont(),
              body: normalizeThemeFont(),
            },
          },
        });
      }
    } catch {
      // Failed to fetch settings
      alert(t('admin.theme_fetch_failed') || 'فشل تحميل الإعدادات');
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const handleSave = async () => {
    setSaving(true);
    // Check if demo mode is enabled
    if (settings.demoMode) {
      alert(t('admin.settings.save_disabled_demo') || 'حفظ الإعدادات معطّل في الوضع التجريبي.');
      setSaving(false);
      return;
    }
    try {
      await updateSettings(settings);
      alert(t('admin.theme_save_success') || 'تم حفظ إعدادات المظهر بنجاح!');
    } catch {
      // Failed to save settings
      alert(t('admin.theme_save_failed') || 'فشل حفظ الإعدادات');
    } finally {
      setSaving(false);
    }
  };

  const handleInputChange = (
    section: 'colors' | 'fonts' | 'topBar',
    field: string,
    value: unknown
  ) => {
    setSettings((prev) => {
      const currentTheme = prev.theme || defaultSettings.theme;
      if (section === 'colors') {
        return {
          ...prev,
          theme: {
            ...currentTheme,
            colors: {
              ...(currentTheme.colors || defaultSettings.theme.colors),
              [field]: value,
            },
          },
        };
      }
      if (section === 'fonts') {
        return {
          ...prev,
          theme: {
            ...currentTheme,
            fonts: {
              heading: 'Bader Goldstar',
              body: 'Bader Goldstar',
            },
          },
        };
      }
      if (section === 'topBar') {
        const existingTopBar = currentTheme.topBar || defaultSettings.theme.topBar;
        const topBarValue = field === 'enabled' ? Boolean(value) : value;
        return {
          ...prev,
          theme: {
            ...currentTheme,
            topBar: {
              enabled: existingTopBar?.enabled ?? false,
              text: existingTopBar?.text ?? '',
              backgroundColor: existingTopBar?.backgroundColor ?? '#000000',
              textColor: existingTopBar?.textColor ?? '#ffffff',
              [field]: topBarValue,
            },
          },
        };
      }
      return prev;
    });
  };

  const handleFileUpload = async (
    file: File,
    field: 'logoUrl' | 'faviconUrl' | 'loginImageUrl' | string
  ): Promise<string> => {
    if (!file) {
      throw new Error('No file provided');
    }

    const fieldKey = field === 'logoUrl' || field === 'faviconUrl' || field === 'loginImageUrl' ? field : 'custom';
    setUploading((prev) => ({ ...prev, [fieldKey]: true }));
    try {
      const storagePath = field === 'logoUrl' || field === 'faviconUrl' || field === 'loginImageUrl' 
        ? `theme/${field}_${Date.now()}_${file.name}`
        : `${field}/${Date.now()}_${file.name}`;
      const storageRef = ref(storage, storagePath);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);
      
      if (field === 'logoUrl' || field === 'faviconUrl' || field === 'loginImageUrl') {
        setSettings((prev) => ({
          ...prev,
          theme: {
            ...prev.theme,
            [field]: url,
          },
        }));
      }
      
      return url;
    } catch {
      // Failed to upload image
      alert(t('admin.settings.upload_image_failed') || 'فشل رفع الصورة');
      throw new Error('Upload failed');
    } finally {
      setUploading((prev) => ({ ...prev, [fieldKey]: false }));
    }
  };

  const tabs = [
    { id: 'logo', label: t('admin.theme_tab_logo') || 'شعار التطبيق والأيقونة المفضلة' },
    { id: 'login', label: t('admin.theme_tab_login') || 'صورة تسجيل الدخول' },
    { id: 'colors', label: t('admin.theme_tab_colors') || 'ألوان الموقع' },
    { id: 'fonts', label: t('admin.theme_tab_fonts') || 'خطوط الموقع' },
    { id: 'topbar', label: t('admin.theme_tab_topbar') || 'شريط علوي' },
    { id: 'payment', label: t('admin.theme_tab_payment') || 'طرق الدفع' },
  ];

  const fontOptions = [
    { value: 'Bader Goldstar', label: 'Bader Goldstar' },
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
    <div className="p-4 sm:p-6 md:p-8 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-semibold text-gray-900 mb-2">
          {t('admin.theme_title') || t('admin.theme') || 'إعدادات المظهر'}
        </h1>
        <p className="text-gray-500 text-sm">{t('admin.theme_subtitle') || "Customize your store's appearance and branding"}</p>
      </div>
      
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="flex border-b border-gray-200 flex-wrap overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`whitespace-nowrap py-4 px-6 border-b-2 font-medium text-sm transition-all focus:outline-none ${
                activeTab === tab.id
                  ? 'border-black text-black bg-gray-50'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="p-4 sm:p-6 md:p-8">
          {/* App Logo & Favicon */}
          {activeTab === 'logo' && (
            <div className="space-y-8 animate-fadeIn">
              <div>
                <h3 className="text-xl font-bold text-gray-900 mb-1">
                  {t('admin.theme_logo_section_title') || 'شعار التطبيق والأيقونة المفضلة'}
                </h3>
                <p className="text-gray-500 text-sm">
                  {t('admin.theme_logo_section_subtitle') ||
                    'قم بتحديث أصول علامتك التجارية وهويتك المرئية.'}
                </p>
              </div>
              
              <div className="grid grid-cols-1 gap-8">
                {/* Logo Upload */}
                <div className="bg-gray-50 p-6 rounded-xl border border-gray-200">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                      <label className="block text-base font-bold text-gray-900 mb-1">
                        {t('admin.theme_logo_website_label') || 'شعار الموقع'}
                      </label>
                      <p className="text-sm text-gray-500">
                        {t('admin.theme_logo_website_hint') ||
                          'معروض في الرأس. الحجم الموصى به: 200 × 60 بكسل (PNG/SVG).'
                        }
                      </p>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="h-16 w-40 bg-white border border-gray-200 border-dashed rounded-lg flex items-center justify-center text-gray-400 text-xs font-medium overflow-hidden relative">
                        {settings.theme.logoUrl ? (
                          <Image src={settings.theme.logoUrl} alt="Logo" fill className="object-contain" unoptimized />
                        ) : (
                          t('admin.theme_logo_preview') || 'معاينة'
                        )}
                        {uploading.logoUrl && (
                          <div className="absolute inset-0 bg-black/50 flex.items-center justify-center text-white text-xs">
                            {t('admin.theme_logo_uploading') || 'جاري الرفع...'}
                          </div>
                        )}
                      </div>
                      <label className="cursor-pointer px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 hover:text-black transition-colors shadow-sm">
                        {t('admin.theme_logo_change_button') || 'يتغير'}
                        <input 
                          type="file" 
                          className="hidden" 
                          accept="image/*"
                          onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0], 'logoUrl')}
                        />
                      </label>
                    </div>
                  </div>
                </div>

                {/* Favicon Upload */}
                <div className="bg-gray-50 p-6 rounded-xl border border-gray-200">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                      <label className="block text-base font-bold text-gray-900 mb-1">
                        {t('admin.theme_logo_favicon_label') || 'الأيقونة المفضلة'}
                      </label>
                      <p className="text-sm text-gray-500">
                        {t('admin.theme_logo_favicon_hint') ||
                          'رمز علامة تبويب المتصفح. الحجم الموصى به: 32x32 بكسل (ICO/PNG).'}
                      </p>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="h-12 w-12 bg-white border border-gray-200 border-dashed rounded-lg flex items-center justify-center text-gray-400 text-xs font-medium overflow-hidden relative">
                        {settings.theme.faviconUrl ? (
                          <Image src={settings.theme.faviconUrl} alt="Favicon" fill className="object-contain" unoptimized />
                        ) : (
                          t('admin.theme_logo_favicon_placeholder') || '32x32'
                        )}
                        {uploading.faviconUrl && (
                          <div className="absolute inset-0 bg-black/50 flex items-center justify-center text-white text-xs">
                            {t('admin.theme_logo_uploading') || 'جاري الرفع...'}
                          </div>
                        )}
                      </div>
                      <label className="cursor-pointer px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 hover:text-black transition-colors shadow-sm">
                        {t('admin.theme_logo_change_button') || 'يتغير'}
                        <input 
                          type="file" 
                          className="hidden" 
                          accept="image/*"
                          onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0], 'faviconUrl')}
                        />
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Login Image */}
          {activeTab === 'login' && (
            <div className="space-y-8 animate-fadeIn">
              <div>
                <h3 className="text-xl font-bold text-gray-900 mb-1">
                  {t('admin.theme_login_section_title') || 'صورة تسجيل الدخول'}
                </h3>
                <p className="text-gray-500 text-sm">
                  {t('admin.theme_login_section_subtitle') ||
                    'قم بتحميل صورة لعرضها على صفحة تسجيل الدخول.'}
                </p>
              </div>
              
              <div className="bg-gray-50 p-6 rounded-xl border border-gray-200">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <label className="block text-base font-bold text-gray-900 mb-1">
                      {t('admin.theme_login_label') || 'صورة صفحة تسجيل الدخول'}
                    </label>
                    <p className="text-sm text-gray-500">
                      {t('admin.theme_login_hint') ||
                        'الحجم الموصى به: 800 × 600 بكسل (JPG/PNG).'}
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="h-32 w-48 bg-white border border-gray-200 border-dashed rounded-lg flex items-center justify-center text-gray-400 text-xs font-medium overflow-hidden relative">
                      {settings.theme.loginImageUrl ? (
                        <Image src={settings.theme.loginImageUrl} alt="Login Image" fill className="object-cover" unoptimized />
                      ) : (
                        t('admin.theme_logo_preview') || 'معاينة'
                      )}
                      {uploading.loginImageUrl && (
                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center text-white text-xs">{t('admin.theme_logo_uploading') || 'جاري الرفع...'}</div>
                      )}
                    </div>
                    <label className="cursor-pointer px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 hover:text-black transition-colors shadow-sm">
                      {settings.theme.loginImageUrl
                        ? t('admin.theme_login_upload_button_change') || 'يتغير'
                        : t('admin.theme_login_upload_button_upload') || 'رفع'}
                      <input 
                        type="file" 
                        className="hidden" 
                        accept="image/*"
                        onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0], 'loginImageUrl')}
                      />
                    </label>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Website Colors */}
          {activeTab === 'colors' && (
            <div className="space-y-8 animate-fadeIn">
              <div>
                <h3 className="text-xl font-bold text-gray-900 mb-1">
                  {t('admin.theme_colors_section_title') || 'ألوان الموقع'}
                </h3>
                <p className="text-gray-500 text-sm">
                  {t('admin.theme_colors_section_subtitle') ||
                    'تخصيص نظام الألوان لموقع الويب الخاص بك.'}
                </p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    {t('admin.theme_colors_header_background') || 'خلفية الرأس'}
                  </label>
                  <div className="flex gap-2">
                    <input 
                      type="color" 
                      value={settings.theme.colors?.headerBackground || '#ffffff'}
                      onChange={(e) => handleInputChange('colors', 'headerBackground', e.target.value)}
                      className="h-10 w-16 p-1 border border-gray-300 rounded cursor-pointer"
                    />
                    <input 
                      type="text" 
                      value={settings.theme.colors?.headerBackground || '#ffffff'}
                      onChange={(e) => handleInputChange('colors', 'headerBackground', e.target.value)}
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent outline-none font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    {t('admin.theme_colors_header_text') || 'نص الرأس'}
                  </label>
                  <div className="flex gap-2">
                    <input 
                      type="color" 
                      value={settings.theme.colors?.headerText || '#000000'}
                      onChange={(e) => handleInputChange('colors', 'headerText', e.target.value)}
                      className="h-10 w-16 p-1 border border-gray-300 rounded cursor-pointer"
                    />
                    <input 
                      type="text" 
                      value={settings.theme.colors?.headerText || '#000000'}
                      onChange={(e) => handleInputChange('colors', 'headerText', e.target.value)}
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent outline-none font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    {t('admin.theme_colors_footer_background') || 'خلفية التذييل'}
                  </label>
                  <div className="flex gap-2">
                    <input 
                      type="color" 
                      value={settings.theme.colors?.footerBackground || '#1f2937'}
                      onChange={(e) => handleInputChange('colors', 'footerBackground', e.target.value)}
                      className="h-10 w-16 p-1 border border-gray-300 rounded cursor-pointer"
                    />
                    <input 
                      type="text" 
                      value={settings.theme.colors?.footerBackground || '#1f2937'}
                      onChange={(e) => handleInputChange('colors', 'footerBackground', e.target.value)}
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent outline-none font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    {t('admin.theme_colors_footer_text') || 'نص التذييل'}
                  </label>
                  <div className="flex gap-2">
                    <input 
                      type="color" 
                      value={settings.theme.colors?.footerText || '#ffffff'}
                      onChange={(e) => handleInputChange('colors', 'footerText', e.target.value)}
                      className="h-10 w-16 p-1 border border-gray-300 rounded cursor-pointer"
                    />
                    <input 
                      type="text" 
                      value={settings.theme.colors?.footerText || '#ffffff'}
                      onChange={(e) => handleInputChange('colors', 'footerText', e.target.value)}
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent outline-none font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    {t('admin.theme_colors_primary_button') || 'الزر الأساسي'}
                  </label>
                  <div className="flex gap-2">
                    <input 
                      type="color" 
                      value={settings.theme.colors?.primaryButton || '#000000'}
                      onChange={(e) => handleInputChange('colors', 'primaryButton', e.target.value)}
                      className="h-10 w-16 p-1 border border-gray-300 rounded cursor-pointer"
                    />
                    <input 
                      type="text" 
                      value={settings.theme.colors?.primaryButton || '#000000'}
                      onChange={(e) => handleInputChange('colors', 'primaryButton', e.target.value)}
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent outline-none font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    {t('admin.theme_colors_primary_button_text') ||
                      'نص الزر الأساسي'}
                  </label>
                  <div className="flex gap-2">
                    <input 
                      type="color" 
                      value={settings.theme.colors?.primaryButtonText || '#ffffff'}
                      onChange={(e) => handleInputChange('colors', 'primaryButtonText', e.target.value)}
                      className="h-10 w-16 p-1 border border-gray-300 rounded cursor-pointer"
                    />
                    <input 
                      type="text" 
                      value={settings.theme.colors?.primaryButtonText || '#ffffff'}
                      onChange={(e) => handleInputChange('colors', 'primaryButtonText', e.target.value)}
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent outline-none font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    {t('admin.theme_colors_secondary_button') || 'الزر الثانوي'}
                  </label>
                  <div className="flex gap-2">
                    <input 
                      type="color" 
                      value={settings.theme.colors?.secondaryButton || '#f3f4f6'}
                      onChange={(e) => handleInputChange('colors', 'secondaryButton', e.target.value)}
                      className="h-10 w-16 p-1 border border-gray-300 rounded cursor-pointer"
                    />
                    <input 
                      type="text" 
                      value={settings.theme.colors?.secondaryButton || '#f3f4f6'}
                      onChange={(e) => handleInputChange('colors', 'secondaryButton', e.target.value)}
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent outline-none font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    {t('admin.theme_colors_secondary_button_text') ||
                      'نص الزر الثانوي'}
                  </label>
                  <div className="flex gap-2">
                    <input 
                      type="color" 
                      value={settings.theme.colors?.secondaryButtonText || '#000000'}
                      onChange={(e) => handleInputChange('colors', 'secondaryButtonText', e.target.value)}
                      className="h-10 w-16 p-1 border border-gray-300 rounded cursor-pointer"
                    />
                    <input 
                      type="text" 
                      value={settings.theme.colors?.secondaryButtonText || '#000000'}
                      onChange={(e) => handleInputChange('colors', 'secondaryButtonText', e.target.value)}
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent outline-none font-mono"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Website Fonts */}
          {activeTab === 'fonts' && (
            <div className="space-y-8 animate-fadeIn">
              <div>
                <h3 className="text-xl font-bold text-gray-900 mb-1">
                  {t('admin.theme_fonts_section_title') || 'خطوط الموقع'}
                </h3>
                <p className="text-gray-500 text-sm">
                  {t('admin.theme_fonts_section_subtitle') ||
                    'اختر الخطوط للعناوين والنص الأساسي.'}
                </p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    {t('admin.theme_fonts_heading_label') || 'خط العناوين'}
                  </label>
                  <select 
                    value={settings.theme.fonts?.heading || 'Bader Goldstar'}
                    onChange={(e) => handleInputChange('fonts', 'heading', e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent outline-none transition-all bg-white"
                  >
                    {fontOptions.map(font => (
                      <option key={font.value} value={font.value}>{font.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    {t('admin.theme_fonts_body_label') || 'خط النص'}
                  </label>
                  <select 
                    value={settings.theme.fonts?.body || 'Bader Goldstar'}
                    onChange={(e) => handleInputChange('fonts', 'body', e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent outline-none transition-all bg-white"
                  >
                    {fontOptions.map(font => (
                      <option key={font.value} value={font.value}>{font.label}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Top Bar */}
          {activeTab === 'topbar' && (
            <div className="space-y-8 animate-fadeIn">
              <div>
                <h3 className="text-xl font-bold text-gray-900 mb-1">
                  {t('admin.theme_topbar_section_title') || 'شريط علوي'}
                </h3>
                <p className="text-gray-500 text-sm">
                  {t('admin.theme_topbar_section_subtitle') ||
                    'قم بتكوين الشعار الترويجي في الجزء العلوي من موقع الويب الخاص بك.'}
                </p>
              </div>
              
              <div className="space-y-6">
                <div className="flex items-center p-4 border border-gray-200 rounded-lg">
                  <input 
                    type="checkbox" 
                    checked={settings.theme.topBar?.enabled || false}
                    onChange={(e) => handleInputChange('topBar', 'enabled', e.target.checked)}
                    className="w-5 h-5 text-black border-gray-300 rounded focus:ring-black" 
                  />
                  <div className="ml-3">
                    <span className="block text-sm font-medium text-gray-900">
                      {t('admin.theme_topbar_enabled_label') || 'تمكين الشريط العلوي'}
                    </span>
                    <span className="block text-sm text-gray-500">
                      {t('admin.theme_topbar_enabled_hint') ||
                        'إظهار الرسالة الترويجية في أعلى الموقع'}
                    </span>
                  </div>
                </div>

                {settings.theme.topBar?.enabled && (
                  <>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        {t('admin.theme_topbar_message_label') || 'نص الرسالة'}
                      </label>
                      <input 
                        type="text" 
                        value={settings.theme.topBar?.text || ''}
                        onChange={(e) => handleInputChange('topBar', 'text', e.target.value)}
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent outline-none transition-all" 
                      placeholder={
                        t('admin.theme_topbar_message_placeholder') ||
                        `FREE SHIPPING ON ORDERS OVER ${defaultCurrency?.symbol || ''} 5000`
                      }
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          {t('admin.theme_topbar_background_label') || 'لون الخلفية'}
                        </label>
                        <div className="flex gap-2">
                          <input 
                            type="color" 
                            value={settings.theme.topBar?.backgroundColor || '#000000'}
                            onChange={(e) => handleInputChange('topBar', 'backgroundColor', e.target.value)}
                            className="h-10 w-16 p-1 border border-gray-300 rounded cursor-pointer"
                          />
                          <input 
                            type="text" 
                            value={settings.theme.topBar?.backgroundColor || '#000000'}
                            onChange={(e) => handleInputChange('topBar', 'backgroundColor', e.target.value)}
                            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent outline-none font-mono"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          {t('admin.theme_topbar_text_label') || 'لون النص'}
                        </label>
                        <div className="flex gap-2">
                          <input 
                            type="color" 
                            value={settings.theme.topBar?.textColor || '#ffffff'}
                            onChange={(e) => handleInputChange('topBar', 'textColor', e.target.value)}
                            className="h-10 w-16 p-1 border border-gray-300 rounded cursor-pointer"
                          />
                          <input 
                            type="text" 
                            value={settings.theme.topBar?.textColor || '#ffffff'}
                            onChange={(e) => handleInputChange('topBar', 'textColor', e.target.value)}
                            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent outline-none font-mono"
                          />
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Payment Methods */}
          {activeTab === 'payment' && (
            <div className="space-y-8 animate-fadeIn">
              <div>
                <h2 className="text-lg font-semibold text-gray-900 mb-2">
                  {t('admin.theme_payment_methods_title') || 'طرق الدفع'}
                </h2>
                <p className="text-sm text-gray-500 mb-6">
                  {t('admin.theme_payment_methods_subtitle') || 'أضف أيقونات طرق الدفع التي سيتم عرضها في التذييل'}
                </p>

                {/* Add New Payment Method */}
                <div className="mb-6 p-4 border border-gray-200 rounded-lg bg-gray-50">
                  <h3 className="text-sm font-semibold text-gray-700 mb-4">
                    {t('admin.theme_payment_add_new') || 'إضافة طريقة دفع جديدة'}
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        {t('admin.theme_payment_name') || 'اسم طريقة الدفع'}
                      </label>
                      <input
                        type="text"
                        id="newPaymentName"
                        placeholder={t('admin.theme_payment_name_placeholder') || 'مثال: فيزا، ماستركارد، باي بال'}
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        {t('admin.theme_payment_image') || 'صورة طريقة الدفع'}
                      </label>
                      <input
                        type="file"
                        id="newPaymentImage"
                        accept="image/*"
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent outline-none text-sm"
                      />
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={async () => {
                      const nameInput = document.getElementById('newPaymentName') as HTMLInputElement;
                      const imageInput = document.getElementById('newPaymentImage') as HTMLInputElement;
                      const name = nameInput?.value.trim();
                      const imageFile = imageInput?.files?.[0];

                      if (!name) {
                        alert(t('admin.theme_payment_name_required') || 'الرجاء إدخال اسم طريقة الدفع');
                        return;
                      }
                      if (!imageFile) {
                        alert(t('admin.theme_payment_image_required') || 'الرجاء اختيار صورة');
                        return;
                      }

                      // Check if demo mode is enabled
                      if (settings.demoMode) {
                        alert(t('admin.settings.save_disabled_demo') || 'حفظ الإعدادات معطّل في الوضع التجريبي.');
                        return;
                      }
                      try {
                        setUploading((prev) => ({ ...prev, 'newPayment': true }));
                        
                        const imageUrl = await handleFileUpload(imageFile, 'payment-methods');
                        
                        const newPaymentMethod: PaymentMethod = {
                          id: Date.now().toString(),
                          name,
                          imageUrl,
                          order: (settings.theme.paymentMethods?.length || 0) + 1,
                        };
                        const updatedSettings = {
                          ...settings,
                          theme: {
                            ...settings.theme,
                            paymentMethods: [...(settings.theme.paymentMethods || []), newPaymentMethod],
                          },
                        };
                        setSettings(updatedSettings);
                        
                        // Save to Firestore immediately
                        await updateSettings(updatedSettings);

                        nameInput.value = '';
                        imageInput.value = '';
                        alert(t('admin.theme_payment_added') || 'تمت إضافة طريقة الدفع بنجاح!');
                      } catch {
                        alert(t('admin.theme_payment_add_failed') || 'فشلت إضافة طريقة الدفع.');
                      } finally {
                        setUploading((prev) => ({ ...prev, 'newPayment': false }));
                      }
                    }}
                    disabled={uploading['newPayment']}
                    className="mt-4 px-4 py-2 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {uploading['newPayment'] ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white inline" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        {t('admin.common.uploading') || 'جاري الرفع...'}
                      </>
                    ) : (
                      t('admin.theme_payment_add_button') || 'أضف طريقة الدفع'
                    )}
                  </button>
                </div>

                {/* Existing Payment Methods */}
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-gray-700">
                    {t('admin.theme_payment_existing') || 'طرق الدفع الحالية'}
                  </h3>
                  {settings.theme.paymentMethods && settings.theme.paymentMethods.length > 0 ? (
                    <div className="space-y-3">
                      {settings.theme.paymentMethods.map((method) => (
                        <div key={method.id} className="flex items-center gap-4 p-4 border border-gray-200 rounded-lg bg-white">
                          <div className="flex-shrink-0">
                            {method.imageUrl ? (
                              <Image
                                src={method.imageUrl}
                                alt={method.name}
                                width={60}
                                height={40}
                                className="object-contain rounded border border-gray-200 bg-white p-2"
                              />
                            ) : (
                              <div className="w-[60px] h-[40px] border border-gray-200 rounded bg-gray-100 flex items-center justify-center text-xs text-gray-400">
                                No Image
                              </div>
                            )}
                          </div>
                          <div className="flex-1">
                            <p className="font-medium text-gray-900">{method.name}</p>
                            <p className="text-xs text-gray-500 mt-1">{method.imageUrl}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={async () => {
                                // Check if demo mode is enabled
                                if (settings.demoMode) {
                                  alert(t('admin.settings.save_disabled_demo') || 'حفظ الإعدادات معطّل في الوضع التجريبي.');
                                  return;
                                }
                                const newName = prompt(t('admin.theme_payment_edit_name') || 'أدخل الاسم الجديد:', method.name);
                                if (newName && newName.trim()) {
                                  try {
                                    const updatedSettings = {
                                      ...settings,
                                      theme: {
                                        ...settings.theme,
                                        paymentMethods: settings.theme.paymentMethods?.map((pm) =>
                                          pm.id === method.id ? { ...pm, name: newName.trim() } : pm
                                        ),
                                      },
                                    };
                                    setSettings(updatedSettings);
                                    await updateSettings(updatedSettings);
                                  } catch {
                                    alert(t('admin.theme_payment_add_failed') || 'فشل تحديث طريقة الدفع');
                                  }
                                }
                              }}
                              className="px-3 py-1.5 text-sm text-gray-700 border border-gray-300 rounded hover:bg-gray-50 transition-colors"
                            >
                              {t('admin.common.edit') || 'تعديل'}
                            </button>
                            <button
                              type="button"
                              onClick={async () => {
                                const fileInput = document.createElement('input');
                                fileInput.type = 'file';
                                fileInput.accept = 'image/*';
                                fileInput.onchange = async (e) => {
                                  const file = (e.target as HTMLInputElement).files?.[0];
                                  if (file) {
                                    // Check if demo mode is enabled
                                    if (settings.demoMode) {
                                      alert(t('admin.settings.save_disabled_demo') || 'حفظ الإعدادات معطّل في الوضع التجريبي.');
                                      return;
                                    }
                                    try {
                                      setUploading((prev) => ({ ...prev, [`payment-${method.id}`]: true }));
                                      const imageUrl = await handleFileUpload(file, 'payment-methods');
                                      const updatedSettings = {
                                        ...settings,
                                        theme: {
                                          ...settings.theme,
                                          paymentMethods: settings.theme.paymentMethods?.map((pm) =>
                                            pm.id === method.id ? { ...pm, imageUrl } : pm
                                          ),
                                        },
                                      };
                                      setSettings(updatedSettings);
                                      await updateSettings(updatedSettings);
                                    } catch {
                                      alert(t('admin.theme_payment_image_update_failed') || 'فشل تحديث الصورة');
                                    } finally {
                                      setUploading((prev) => ({ ...prev, [`payment-${method.id}`]: false }));
                                    }
                                  }
                                };
                                fileInput.click();
                              }}
                              disabled={uploading[`payment-${method.id}`]}
                              className="px-3 py-1.5 text-sm text-gray-700 border border-gray-300 rounded hover:bg-gray-50 transition-colors disabled:opacity-50"
                            >
                              {uploading[`payment-${method.id}`] ? (
                                t('admin.common.uploading') || 'جاري الرفع...'
                              ) : (
                                t('admin.theme_payment_change_image') || 'تغيير الصورة'
                              )}
                            </button>
                            <button
                              type="button"
                              onClick={async () => {
                                // Check if demo mode is enabled
                                if (settings.demoMode) {
                                  alert(t('admin.settings.save_disabled_demo') || 'حفظ الإعدادات معطّل في الوضع التجريبي.');
                                  return;
                                }
                                if (confirm(t('admin.theme_payment_delete_confirm') || `Are you sure you want to delete ${method.name}?`)) {
                                  try {
                                    const updatedSettings = {
                                      ...settings,
                                      theme: {
                                        ...settings.theme,
                                        paymentMethods: settings.theme.paymentMethods?.filter((pm) => pm.id !== method.id),
                                      },
                                    };
                                    setSettings(updatedSettings);
                                    await updateSettings(updatedSettings);
                                  } catch {
                                    alert(t('admin.theme_payment_add_failed') || 'فشل حذف طريقة الدفع');
                                  }
                                }
                              }}
                              className="px-3 py-1.5 text-sm text-red-600 border border-red-300 rounded hover:bg-red-50 transition-colors"
                            >
                              {t('admin.common.delete') || 'حذف'}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500 py-4 text-center">
                      {t('admin.theme_payment_no_methods') || 'لم تتم إضافة أي طرق دفع حتى الآن. أضف واحدة أعلاه للبدء.'}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="mt-8 sm:mt-12 pt-6 border-t border-gray-200 flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-3 sm:gap-4">
            <button
              type="button"
              onClick={fetchSettings}
              className="w-full sm:w-auto px-6 py-2.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 hover:text-black transition-colors"
              disabled={saving}
            >
              Discard Changes
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className={`w-full sm:w-auto px-6 py-2.5 bg-gray-900 text-white rounded-lg text-sm font-semibold hover:bg-gray-800 transition-colors flex items-center justify-center ${saving ? 'opacity-70 cursor-not-allowed' : ''}`}
            >
              {saving ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Saving...
                </>
              ) : (
                'Save Theme Settings'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ThemePage;

