'use client';

import React, { useState, useEffect } from 'react';
import { getAllLanguages } from '@/lib/firestore/internationalization_db';
import {
  getAllTranslations,
  createTranslation,
  updateTranslation,
  deleteTranslation,
  bulkCreateTranslations,
} from '@/lib/firestore/translations_db';
import { Language } from '@/lib/firestore/internationalization';
import { Translation, DEFAULT_TRANSLATION_KEYS } from '@/lib/firestore/translations';
import { useLanguage } from '@/context/LanguageContext';

const TranslationsPage = () => {
  const { t } = useLanguage();
  const [languages, setLanguages] = useState<Language[]>([]);
  const [selectedLanguage, setSelectedLanguage] = useState<string>('');
  const [translations, setTranslations] = useState<Translation[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingTranslation, setEditingTranslation] = useState<Translation | null>(null);
  const [formData, setFormData] = useState({
    key: '',
    value: '',
    namespace: 'common',
  });
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchLanguages();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (selectedLanguage) {
      fetchTranslations();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedLanguage]);

  const fetchLanguages = async () => {
    try {
      const data = await getAllLanguages(false); // Get all languages, not just active
      setLanguages(data);
      if (data.length > 0 && !selectedLanguage) {
        setSelectedLanguage(data[0].code);
      }
    } catch {
      // Failed to fetch languages
      alert(
        t('admin.translations_languages_load_failed') ||
          'فشل تحميل اللغات. يرجى التحقق من إضافة اللغات في الإعدادات > اللغات'
      );
    } finally {
      setLoading(false);
    }
  };

  const fetchTranslations = async () => {
    if (!selectedLanguage) return;
    try {
      const data = await getAllTranslations(selectedLanguage);
      setTranslations(data);
    } catch {
      // Failed to fetch translations
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLanguage) {
      alert(t('admin.translations_select_language_first') || 'يرجى اختيار لغة أولاً');
      return;
    }

    try {
      if (editingTranslation) {
        await updateTranslation(editingTranslation.id!, {
          key: formData.key,
          value: formData.value,
          namespace: formData.namespace,
        });
      } else {
        await createTranslation({
          key: formData.key,
          value: formData.value,
          languageCode: selectedLanguage,
          namespace: formData.namespace,
        });
      }
      setShowForm(false);
      setEditingTranslation(null);
      resetForm();
      fetchTranslations();
    } catch {
      // Failed to save translation
      alert(t('admin.translations_save_failed') || 'فشل حفظ الترجمة');
    }
  };

  const handleEdit = (translation: Translation) => {
    setEditingTranslation(translation);
    setFormData({
      key: translation.key,
      value: translation.value,
      namespace: translation.namespace || 'common',
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (
      window.confirm(
        t('admin.translations_delete_confirm') ||
          'هل أنت متأكد أنك تريد حذف هذه الترجمة؟'
      )
    ) {
      try {
        await deleteTranslation(id);
        fetchTranslations();
      } catch {
        // Failed to delete translation
        alert(t('admin.translations_delete_failed') || 'فشل حذف الترجمة');
      }
    }
  };

  const handleBulkImport = async () => {
    if (!selectedLanguage) {
      alert(t('admin.translations_select_language_first') || 'يرجى اختيار لغة أولاً');
      return;
    }

    const translationsToImport = Object.entries(DEFAULT_TRANSLATION_KEYS).map(([key, value]) => ({
      key,
      value,
      languageCode: selectedLanguage,
      namespace: key.split('.')[0] || 'common',
    }));

    try {
      await bulkCreateTranslations(translationsToImport);
      alert(
        t('admin.translations_import_success') || 'تم استيراد الترجمات الافتراضية بنجاح!'
      );
      fetchTranslations();
    } catch {
      // Failed to import translations
      alert(t('admin.translations_import_failed') || 'فشل استيراد الترجمات');
    }
  };

  const resetForm = () => {
    setFormData({
      key: '',
      value: '',
      namespace: 'common',
    });
  };

  const filteredTranslations = translations.filter(t =>
    t.key.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.value.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // const namespaces = Array.from(new Set(translations.map(t => t.namespace || 'common'))); // Currently unused but may be needed for future filtering

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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-semibold text-gray-900 mb-2">
            {t('admin.translations_title') || 'الترجمات'}
          </h1>
          <p className="text-gray-500 text-sm">{t('admin.translations_subtitle') || 'إدارة الترجمات لجميع اللغات'}</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <select
            value={selectedLanguage}
            onChange={(e) => setSelectedLanguage(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent outline-none text-sm"
            disabled={languages.length === 0}
          >
            <option value="">
              {languages.length === 0
                ? t('admin.translations_select_language_placeholder_no_languages') ||
                  'لا توجد لغات متاحة - أضف اللغات أولاً'
                : t('admin.translations_select_language_placeholder') || 'اختيار اللغة'}
            </option>
            {languages.map(lang => (
              <option key={lang.id || lang.code} value={lang.code}>
                {lang.flag ? `${lang.flag} ` : ''}{lang.nativeName} ({lang.name}) {!lang.isActive ? '(Inactive)' : ''}
              </option>
            ))}
          </select>
          <button
            onClick={() => {
              resetForm();
              setShowForm(true);
              setEditingTranslation(null);
            }}
            className="bg-gray-900 text-white px-4 py-2 rounded-lg hover:bg-gray-800 transition-colors text-sm font-semibold"
            disabled={!selectedLanguage}
          >
            {t('admin.translations_add_button') || 'إضافة ترجمة'}
          </button>
          <button
            onClick={handleBulkImport}
            className="bg-gray-100 text-gray-900 px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors text-sm font-semibold"
            disabled={!selectedLanguage}
          >
            {t('admin.translations_import_defaults_button') || 'استيراد الافتراضيات'}
          </button>
        </div>
      </div>

      {selectedLanguage && (
        <>
          <div className="mb-4">
            <input
              type="text"
              placeholder={
                t('admin.translations_search_placeholder') || 'بحث في الترجمات...'
              }
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full md:w-1/3 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            {filteredTranslations.length === 0 ? (
              <div className="p-8 sm:p-12 text-center text-gray-500">
                <p className="text-base sm:text-lg font-medium mb-2">
                  {translations.length === 0
                    ? t('admin.translations_empty_no_translations') ||
                      'No translations found. Click "Import Defaults" to get started.'
                    : t('admin.translations_empty_no_match') ||
                      'لا توجد ترجمات تطابق بحثك.'}
                </p>
              </div>
            ) : (
              <>
                {/* Desktop Table View */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-200">
                        <th className="px-4 sm:px-6 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">{t('admin.translations_table_key') || 'المفتاح'}</th>
                        <th className="px-4 sm:px-6 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">{t('admin.translations_table_translation') || 'الترجمة'}</th>
                        <th className="px-4 sm:px-6 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">{t('admin.translations_table_namespace') || 'المساحة'}</th>
                        <th className="px-4 sm:px-6 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider text-right">{t('admin.translations_table_actions') || 'الإجراءات'}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {filteredTranslations.map((translation) => (
                        <tr key={translation.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-4 sm:px-6 py-4 text-sm font-medium text-gray-900">{translation.key}</td>
                          <td className="px-4 sm:px-6 py-4 text-sm text-gray-600">{translation.value}</td>
                          <td className="px-4 sm:px-6 py-4 text-sm text-gray-600">{translation.namespace || 'common'}</td>
                          <td className="px-4 sm:px-6 py-4 text-right space-x-2">
                            <button
                              onClick={() => handleEdit(translation)}
                              className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                            >
                              {t('admin.translations_edit_button') || 'تعديل'}
                            </button>
                            <button
                              onClick={() => handleDelete(translation.id!)}
                              className="text-red-600 hover:text-red-800 text-sm font-medium"
                            >
                              {t('admin.translations_delete_button') || 'حذف'}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Card View */}
                <div className="md:hidden divide-y divide-gray-200">
                  {filteredTranslations.map((translation) => (
                    <div key={translation.id} className="p-4 hover:bg-gray-50 transition-colors">
                      <div className="mb-3">
                        <h3 className="text-sm font-semibold text-gray-900 mb-1">{translation.key}</h3>
                        <p className="text-xs text-gray-600 mb-2">{translation.value}</p>
                        <span className="inline-block px-2.5 py-1 rounded-md text-xs font-semibold bg-gray-100 text-gray-700">
                          {translation.namespace || 'common'}
                        </span>
                      </div>
                      <div className="flex gap-2 pt-3 border-t border-gray-100">
                        <button
                          onClick={() => handleEdit(translation)}
                          className="flex-1 px-3 py-2 bg-blue-50 text-blue-600 rounded-md text-sm font-medium hover:bg-blue-100 transition-colors"
                        >
                          {t('admin.translations_edit_button') || 'تعديل'}
                        </button>
                        <button
                          onClick={() => handleDelete(translation.id!)}
                          className="flex-1 px-3 py-2 bg-red-50 text-red-600 rounded-md text-sm font-medium hover:bg-red-100 transition-colors"
                        >
                          {t('admin.translations_delete_button') || 'حذف'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </>
      )}

      {showForm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-4 sm:p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">
              {editingTranslation
                ? t('admin.translations_modal_title_edit') || 'تعديل الترجمة'
                : t('admin.translations_modal_title_add') || 'إضافة ترجمة'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  {t('admin.translations_field_key_label') || 'المفتاح'}
                </label>
                <input
                  type="text"
                  value={formData.key}
                  onChange={(e) => setFormData({ ...formData, key: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder={
                    t('admin.translations_field_key_placeholder') ||
                    'على سبيل المثال، Products.add_to_cart'
                  }
                  required
                  disabled={!!editingTranslation}
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  {t('admin.translations_field_translation_label') || 'الترجمة'}
                </label>
                <textarea
                  value={formData.value}
                  onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none h-24"
                  placeholder={
                    t('admin.translations_field_translation_placeholder') ||
                    'أدخل النص المترجم'
                  }
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  {t('admin.translations_field_namespace_label') || 'المساحة'}
                </label>
                <select
                  value={formData.namespace}
                  onChange={(e) => setFormData({ ...formData, namespace: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                >
                  <option value="common">
                    {t('admin.translations_namespace_common') || 'شائع'}
                  </option>
                  <option value="products">
                    {t('admin.translations_namespace_products') || 'المنتجات'}
                  </option>
                  <option value="cart">
                    {t('admin.translations_namespace_cart') || 'السلة'}
                  </option>
                  <option value="checkout">
                    {t('admin.translations_namespace_checkout') || 'إتمام الشراء'}
                  </option>
                  <option value="nav">
                    {t('admin.translations_namespace_nav') || 'ملاحة'}
                  </option>
                  <option value="footer">
                    {t('admin.translations_namespace_footer') || 'تذييل'}
                  </option>
                  <option value="admin">
                    {t('admin.translations_namespace_admin') || 'مشرف'}
                  </option>
                </select>
              </div>
              <div className="flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    setEditingTranslation(null);
                    resetForm();
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  {t('admin.translations_cancel_button') || t('common.cancel') || 'إلغاء'}
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  {editingTranslation
                    ? t('admin.translations_update_button') ||
                      t('common.update') ||
                      'تحديث'
                    : t('admin.translations_create_button') ||
                      t('common.create') ||
                      'يخلق'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default TranslationsPage;

