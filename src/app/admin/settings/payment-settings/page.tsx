'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { getSettings, updateSettings } from '@/lib/firestore/settings_db';
import { Settings, defaultSettings } from '@/lib/firestore/settings';
import Switch from '@/components/Switch';
import { useLanguage } from '@/context/LanguageContext';
import { useCurrency } from '@/context/CurrencyContext';

const PaymentSettingsPage = () => {
  const { t } = useLanguage();
  const { defaultCurrency } = useCurrency();
  const [settings, setSettings] = useState<Settings>(defaultSettings);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchSettings = useCallback(async () => {
    try {
      const data = await getSettings();
      if (data) {
        setSettings({ ...defaultSettings, ...data });
      }
    } catch {
      // Failed to fetch settings
      alert(t('admin.payment_settings_load_failed') || 'فشل تحميل الإعدادات');
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const handleSave = async () => {
    // Check if demo mode is enabled
    if (settings.demoMode) {
      alert(t('admin.settings.save_disabled_demo') || 'حفظ الإعدادات معطّل في الوضع التجريبي.');
      return;
    }
    setSaving(true);
    try {
      await updateSettings(settings);
      alert(
        t('admin.payment_settings_save_success') ||
          'تم حفظ إعدادات الدفع بنجاح!'
      );
    } catch {
      // Failed to save settings
      alert(t('admin.payment_settings_save_failed') || 'فشل حفظ الإعدادات');
    } finally {
      setSaving(false);
    }
  };

  const handleInputChange = (field: string, value: unknown) => {
    setSettings((prev) => ({
      ...prev,
      payment: {
        ...prev.payment,
        [field]: value,
      },
    }));
  };

  const handleSwitchChange = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
    handleInputChange(field, e.target.checked);
  };

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
        <h1 className="text-2xl sm:text-3xl font-semibold text-gray-900">
          {t('admin.payment_settings_title') || 'إعدادات الدفع'}
        </h1>
        <p className="text-gray-500 text-sm mt-1">
          {t('admin.payment_settings_subtitle') ||
            'تكوين طرق وخيارات الدفع'}
        </p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6 space-y-6">
        <div>
          <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-1">
            {t('admin.payment_settings_section_methods_title') || 'طرق الدفع'}
          </h2>
          <p className="text-gray-500 text-sm">
            {t('admin.payment_settings_section_methods_subtitle') ||
              'تمكين أو تعطيل طرق الدفع لمتجرك'}
          </p>
        </div>

        <div className="space-y-4 sm:space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 border border-gray-200 rounded-lg">
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-gray-900 mb-1">
                {t('admin.payment_settings_cod_title') || 'الدفع عند الاستلام'}
              </h3>
              <p className="text-sm text-gray-500">
                {t('admin.payment_settings_cod_description') ||
                  'السماح للعملاء بالدفع عند استلام طلباتهم'}
              </p>
            </div>
            <Switch
              label=""
              checked={settings.payment.enableCOD}
              onChange={handleSwitchChange('enableCOD')}
            />
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 border border-gray-200 rounded-lg">
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-gray-900 mb-1">
                {t('admin.payment_settings_local_title') || 'الدفع المحلي'}
              </h3>
              <p className="text-sm text-gray-500">
                {t('admin.payment_settings_local_description') ||
                  'تمكين طرق الدفع المحلية (التحويل المصرفي، وما إلى ذلك)'}
              </p>
            </div>
            <Switch
              label=""
              checked={settings.payment.enableLocalPayment}
              onChange={handleSwitchChange('enableLocalPayment')}
            />
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 border border-gray-200 rounded-lg">
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-gray-900 mb-1">
                {t('admin.payment_settings_online_title') || 'الدفع عبر الإنترنت'}
              </h3>
              <p className="text-sm text-gray-500">
                {t('admin.payment_settings_online_description') ||
                  'تمكين بوابات الدفع عبر الإنترنت (Stripe، PayPal، إلخ.)'}
              </p>
            </div>
            <Switch
              label=""
              checked={settings.payment.enableOnlinePayment}
              onChange={handleSwitchChange('enableOnlinePayment')}
            />
          </div>

          <div className="p-4 border border-gray-200 rounded-lg space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="flex-1">
                <h3 className="text-sm font-semibold text-gray-900 mb-1">
                  {t('admin.payment_settings_advance_title') || 'الدفع المقدم'}
                </h3>
                <p className="text-sm text-gray-500">
                  {t('admin.payment_settings_advance_description') ||
                    'السماح للعملاء بتسديد دفعات مسبقة/جزئية'}
                </p>
              </div>
              <Switch
                label=""
                checked={settings.payment.enableAdvancePayment}
                onChange={handleSwitchChange('enableAdvancePayment')}
              />
            </div>
            
            {settings.payment.enableAdvancePayment && (
              <div className="pt-4 border-t border-gray-200 space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    {t('admin.payment_settings_advance_type_label') || 'نوع الدفع'}
                  </label>
                  <select
                    value={settings.payment.advancePaymentType}
                    onChange={(e) => handleInputChange('advancePaymentType', e.target.value as 'percentage' | 'fixed')}
                    className="w-full sm:max-w-xs px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent outline-none"
                  >
                    <option value="percentage">
                      {t('admin.payment_settings_advance_type_percentage') || 'نسبة مئوية'}
                    </option>
                    <option value="fixed">
                      {t('admin.payment_settings_advance_type_fixed') || 'مبلغ ثابت'}
                    </option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    {settings.payment.advancePaymentType === 'percentage'
                      ? t(
                          'admin.payment_settings_advance_value_label_percentage'
                        ) || 'النسبة المئوية (%)'
                      : t('admin.payment_settings_advance_value_label_fixed') ||
                        `Fixed Amount${defaultCurrency?.symbol ? ` (${defaultCurrency.symbol})` : ''}`}
                  </label>
                  <input
                    type="number"
                    step={settings.payment.advancePaymentType === 'percentage' ? '1' : '0.01'}
                    min="0"
                    max={
                      settings.payment.advancePaymentType === 'percentage'
                        ? '100'
                        : undefined
                    }
                    value={settings.payment.advancePaymentValue}
                    onChange={(e) => handleInputChange('advancePaymentValue', parseFloat(e.target.value) || 0)}
                    className="w-full sm:max-w-xs px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent outline-none"
                    placeholder={
                      settings.payment.advancePaymentType === 'percentage'
                        ? t(
                            'admin.payment_settings_advance_value_placeholder_percentage'
                          ) || '50'
                        : t('admin.payment_settings_advance_value_placeholder_fixed') ||
                          '1000'
                    }
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    {settings.payment.advancePaymentType === 'percentage'
                      ? t('admin.payment_settings_advance_value_hint_percentage') ||
                        'أدخل النسبة المئوية (0-100) من إجمالي مبلغ الطلب'
                      : t('admin.payment_settings_advance_value_hint_fixed') ||
                        `Enter fixed amount${defaultCurrency?.symbol ? ` in ${defaultCurrency.symbol}` : ''}`}
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 border border-gray-200 rounded-lg">
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-gray-900 mb-1">
                {t('admin.payment_settings_wallet_title') || 'المحفظة'}
              </h3>
              <p className="text-sm text-gray-500">
                {t('admin.payment_settings_wallet_description') ||
                  'تمكين ميزة المحفظة للعملاء لتخزين واستخدام الرصيد'}
              </p>
            </div>
            <Switch
              label=""
              checked={settings.payment.enableWallet}
              onChange={handleSwitchChange('enableWallet')}
            />
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 border border-gray-200 rounded-lg">
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-gray-900 mb-1">
                {t('admin.payment_settings_loyalty_title') || 'نقاط الولاء'}
              </h3>
              <p className="text-sm text-gray-500">
                {t('admin.payment_settings_loyalty_description') ||
                  'تفعيل نظام نقاط الولاء لمكافآت العملاء'}
              </p>
            </div>
            <Switch
              label=""
              checked={settings.payment.enableLoyaltyPoint}
              onChange={handleSwitchChange('enableLoyaltyPoint')}
            />
          </div>
        </div>

        {/* Loyalty Point Value */}
        {settings.payment.enableLoyaltyPoint && (
          <div className="mt-8 pt-6 border-t border-gray-200">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                {t('admin.payment_settings_loyalty_value_label') ||
                  'قيمة نقطة الولاء'}
              </label>
              <p className="text-sm text-gray-500 mb-4">
                {t('admin.payment_settings_loyalty_value_description') ||
                  `Conversion rate: 1 point = X amount${defaultCurrency?.symbol ? ` (e.g., 1 point = 1 ${defaultCurrency.symbol})` : ''}`}
              </p>
              <input
                type="number"
                step="0.01"
                min="0"
                value={settings.payment.loyaltyPointValue}
                onChange={(e) => handleInputChange('loyaltyPointValue', parseFloat(e.target.value) || 0)}
                className="w-full sm:max-w-xs px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent outline-none"
                placeholder={
                  t('admin.payment_settings_loyalty_value_placeholder') || '1.00'
                }
              />
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="mt-6 sm:mt-8 pt-6 border-t border-gray-200 flex flex-col sm:flex-row items-stretch sm:items-center sm:justify-end gap-3 sm:gap-4">
          <button
            type="button"
            onClick={fetchSettings}
            className="px-4 sm:px-6 py-2.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 hover:text-gray-900 transition-colors"
            disabled={saving}
          >
            {t('admin.payment_settings_discard_button') ||
              t('admin.settings_discard') || 'تجاهل التغييرات'}
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
                {t('admin.payment_settings_saving') || 'جاري الحفظ...'}
              </>
            ) : (
              t('admin.payment_settings_save_button') ||
              t('admin.settings_save') || 'حفظ الإعدادات'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default PaymentSettingsPage;

