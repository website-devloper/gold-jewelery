'use client';

import React, { useState, useEffect } from 'react';
import { ShippingZone } from '@/lib/firestore/shipping';
import { addShippingZone, updateShippingZone, getShippingZone } from '@/lib/firestore/shipping_db';
import { getCountries, getStates, getCities } from '@/lib/firestore/geography_db';
import { Country, State, City } from '@/lib/firestore/geography';
import { getSettings } from '@/lib/firestore/settings_db';
import { useLanguage } from '@/context/LanguageContext';
import Dialog from '../ui/Dialog';

interface ShippingZoneFormProps {
  zoneId?: string;
  onSuccess: () => void;
  onCancel: () => void;
}

const ShippingZoneForm: React.FC<ShippingZoneFormProps> = ({ zoneId, onSuccess, onCancel }) => {
  const { t } = useLanguage();
  const [loading, setLoading] = useState(!!zoneId);
  const [error, setError] = useState<string | null>(null);
  const [countries, setCountries] = useState<Country[]>([]);
  const [states, setStates] = useState<State[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [selectedCountryIds, setSelectedCountryIds] = useState<string[]>([]);
  const [zone, setZone] = useState<Omit<ShippingZone, 'id' | 'createdAt' | 'updatedAt'>>({
    name: '',
    description: '',
    countries: [],
    states: [],
    cities: [],
    isActive: true,
  });
  const [showInfoDialog, setShowInfoDialog] = useState(false);
  const [infoDialogMessage, setInfoDialogMessage] = useState('');
  const [infoDialogType, setInfoDialogType] = useState<'success' | 'error'>('error');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const fetchedCountries = await getCountries();
        setCountries(fetchedCountries);

        if (zoneId) {
          const fetchedZone = await getShippingZone(zoneId);
          if (fetchedZone) {
            setZone({
              name: fetchedZone.name,
              description: fetchedZone.description || '',
              countries: fetchedZone.countries || [],
              states: fetchedZone.states || [],
              cities: fetchedZone.cities || [],
              isActive: fetchedZone.isActive,
            });
            setSelectedCountryIds(fetchedZone.countries || []);
          }
        }
      } catch {
        // Failed to fetch data
        setError('Failed to load data.');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [zoneId]);

  // Load states when countries are selected
  useEffect(() => {
    const loadStates = async () => {
      if (selectedCountryIds.length > 0) {
        try {
          const allStates: State[] = [];
          for (const countryId of selectedCountryIds) {
            const countryStates = await getStates(countryId);
            allStates.push(...countryStates);
          }
          setStates(allStates.filter((s, index, self) =>
            index === self.findIndex((st) => st.id === s.id)
          ));
        } catch {
          // Failed to load states
          setStates([]);
        }
      } else {
        setStates([]);
        setCities([]);
      }
    };
    loadStates();
  }, [selectedCountryIds]);

  // Load cities when states are selected
  useEffect(() => {
    const loadCities = async () => {
      if (zone.states && zone.states.length > 0) {
        try {
          const allCities: City[] = [];
          for (const stateId of zone.states) {
            const stateCities = await getCities(stateId);
            allCities.push(...stateCities);
          }
          setCities(allCities.filter((c, index, self) =>
            index === self.findIndex((ci) => ci.id === c.id)
          ));
        } catch {
          // Failed to load cities
          setCities([]);
        }
      } else {
        setCities([]);
      }
    };
    loadCities();
  }, [zone.states]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setZone(prev => ({ ...prev, [name]: value }));
  };

  const handleCountryToggle = (countryId: string) => {
    const newCountries = zone.countries.includes(countryId)
      ? zone.countries.filter(id => id !== countryId)
      : [...zone.countries, countryId];

    setSelectedCountryIds(newCountries);

    // Filter states and cities based on selected countries
    setZone(prev => {
      const filteredStates = prev.states?.filter(s => {
        const state = states.find(st => st.id === s);
        if (!state) return false;
        // Check if state's country is in new countries list
        return newCountries.includes(state.countryId || '');
      }) || [];

      const filteredCities = prev.cities?.filter(c => {
        const city = cities.find(ci => ci.id === c);
        if (!city) return false;
        const state = states.find(st => st.id === city.stateId);
        if (!state) return false;
        return newCountries.includes(state.countryId || '');
      }) || [];

      return {
        ...prev,
        countries: newCountries,
        states: filteredStates,
        cities: filteredCities,
      };
    });
  };

  const handleStateToggle = (stateId: string) => {
    setZone(prev => ({
      ...prev,
      states: prev.states?.includes(stateId)
        ? prev.states.filter(id => id !== stateId)
        : [...(prev.states || []), stateId],
      // Clear cities if state is removed
      cities: prev.cities?.filter(c => {
        const city = cities.find(ci => ci.id === c);
        return city && city.stateId === stateId ? false : true;
      }) || [],
    }));
  };

  const handleCityToggle = (cityId: string) => {
    setZone(prev => ({
      ...prev,
      cities: prev.cities?.includes(cityId)
        ? prev.cities.filter(id => id !== cityId)
        : [...(prev.cities || []), cityId],
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (zone.countries.length === 0) {
      setInfoDialogMessage(t('shipping.select_country') || 'يرجى اختيار دولة واحدة على الأقل');
      setInfoDialogType('error');
      setShowInfoDialog(true);
      return;
    }

    const settings = await getSettings();
    if (settings?.demoMode) {
      setInfoDialogMessage(t('admin.settings.save_disabled_demo') || 'حفظ الإعدادات معطّل في الوضع التجريبي.');
      setInfoDialogType('error');
      setShowInfoDialog(true);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      if (zoneId) {
        await updateShippingZone(zoneId, zone);
      } else {
        await addShippingZone(zone);
      }
      setInfoDialogMessage(zoneId ? (t('admin.shipping_zone_update_success') || 'تم تحديث منطقة الشحن بنجاح!') : (t('admin.shipping_zone_create_success') || 'تم إنشاء منطقة الشحن بنجاح!'));
      setInfoDialogType('success');
      setShowInfoDialog(true);
      setTimeout(() => {
        onSuccess();
      }, 1500);
    } catch {
      // Failed to save shipping zone
      setError('Failed to save shipping zone. Please try again.');
      setInfoDialogMessage('Failed to save shipping zone. Please try again.');
      setInfoDialogType('error');
      setShowInfoDialog(true);
    } finally {
      setLoading(false);
    }
  };

  if (loading && zoneId && !zone.name) {
    return <div className="text-center py-12">Loading zone data...</div>;
  }

  return (
    <div className="bg-white shadow rounded-lg p-6">
      <h2 className="text-2xl font-bold mb-6 text-gray-800">
        {zoneId ? 'تعديل منطقة الشحن' : 'إضافة منطقة شحن جديدة'}
      </h2>
      {error && <div className="text-red-500 bg-red-50 p-4 rounded-lg mb-6">{error}</div>}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="md:col-span-2">
            <label htmlFor="name" className="block text-gray-700 text-sm font-bold mb-2">اسم المنطقة *</label>
            <input
              type="text"
              id="name"
              name="name"
              value={zone.name}
              onChange={handleChange}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black outline-none"
            />
          </div>

          <div className="md:col-span-2">
            <label htmlFor="description" className="block text-gray-700 text-sm font-bold mb-2">الوصف</label>
            <textarea
              id="description"
              name="description"
              value={zone.description}
              onChange={handleChange}
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black outline-none"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-gray-700 text-sm font-bold mb-2">الدول *</label>
            <div className="border border-gray-300 rounded-lg p-4 max-h-64 overflow-y-auto">
              {countries.length === 0 ? (
                <p className="text-gray-500 text-sm">جاري تحميل الدول...</p>
              ) : (
                <div className="space-y-2">
                  {countries.map(country => (
                    <label key={country.id} className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-2 rounded">
                      <input
                        type="checkbox"
                        checked={country.id ? zone.countries.includes(country.id) : false}
                        onChange={() => country.id && handleCountryToggle(country.id)}
                        className="w-4 h-4"
                      />
                      <span className="text-sm text-gray-700">{country.name}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>
            <p className="text-xs text-gray-500 mt-2">
              المحددة: {zone.countries.length} دولة
            </p>
          </div>

          {zone.countries.length > 0 && states.length > 0 && (
            <div className="md:col-span-2">
              <label className="block text-gray-700 text-sm font-bold mb-2">{t('shipping.optional_states') || 'الولايات (اختياري - اتركه فارغاً لكل الولايات)'}</label>
              <div className="border border-gray-300 rounded-lg p-4 max-h-64 overflow-y-auto">
                <div className="space-y-2">
                  {states.map(state => (
                    <label key={state.id} className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-2 rounded">
                      <input
                        type="checkbox"
                        checked={state.id ? zone.states?.includes(state.id) || false : false}
                        onChange={() => state.id && handleStateToggle(state.id)}
                        className="w-4 h-4"
                      />
                      <span className="text-sm text-gray-700">{state.name}</span>
                    </label>
                  ))}
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                المحددة: {zone.states?.length || 0} ولايات
                {(!zone.states || zone.states.length === 0) && ' (كل الولايات في الدول المحددة)'}
              </p>
            </div>
          )}

          {zone.states && zone.states.length > 0 && cities.length > 0 && (
            <div className="md:col-span-2">
              <label className="block text-gray-700 text-sm font-bold mb-2">{t('shipping.optional_cities') || 'المدن (اختياري - اتركه فارغاً لكل المدن)'}</label>
              <div className="border border-gray-300 rounded-lg p-4 max-h-64 overflow-y-auto">
                <div className="space-y-2">
                  {cities.map(city => (
                    <label key={city.id} className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-2 rounded">
                      <input
                        type="checkbox"
                        checked={city.id ? zone.cities?.includes(city.id) || false : false}
                        onChange={() => city.id && handleCityToggle(city.id)}
                        className="w-4 h-4"
                      />
                      <span className="text-sm text-gray-700">{city.name}</span>
                    </label>
                  ))}
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                المحددة: {zone.cities?.length || 0} مدن
                {(!zone.cities || zone.cities.length === 0) && ' (كل المدن في الولايات المحددة)'}
              </p>
            </div>
          )}

          <div className="md:col-span-2">
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                name="isActive"
                checked={zone.isActive}
                onChange={(e) => setZone(prev => ({ ...prev, isActive: e.target.checked }))}
                className="w-5 h-5"
              />
              <span className="text-gray-700 font-medium">منطقة نشطة</span>
            </label>
          </div>
        </div>

        <div className="flex items-center justify-end gap-4 pt-6">
          <button
            type="button"
            onClick={onCancel}
            className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors"
            disabled={loading}
          >
            إلغاء
          </button>
          <button
            type="submit"
            className="px-6 py-2 bg-black text-white rounded-lg font-medium hover:bg-gray-800 transition-colors disabled:opacity-70"
            disabled={loading}
          >
            {loading ? 'جاري الحفظ...' : (zoneId ? 'تحديث المنطقة' : 'إنشاء منطقة')}
          </button>
        </div>
      </form>

      {/* Info Dialog */}
      <Dialog
        isOpen={showInfoDialog}
        onClose={() => setShowInfoDialog(false)}
        title={infoDialogType === 'success' ? (t('common.success') || 'نجاح') : (t('common.error') || 'خطأ')}
        message={infoDialogMessage}
        type={infoDialogType}
        showCancel={false}
        confirmText={t('common.close') || 'إغلاق'}
      />
    </div>
  );
};

export default ShippingZoneForm;

