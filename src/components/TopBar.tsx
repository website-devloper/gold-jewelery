'use client';

import { useSettings } from '../context/SettingsContext';
import { useLanguage } from '../context/LanguageContext';
import { useState, useEffect } from 'react';

const TopBar = () => {
  const { settings } = useSettings();
  const { t } = useLanguage();
  const topBar = settings?.theme?.topBar;
  const [currentTime, setCurrentTime] = useState('');

  // Gold price data (static for now — backend integration later)
  const GOLD_PRICES = [
    { label: t('common.gold_18k') || 'ذهب عيار 18', price: 465.31, unit: 'ريال' },
    { label: t('common.gold_21k') || 'ذهب عيار 21', price: 542.86, unit: 'ريال' },
    { label: t('common.gold_22k') || 'ذهب عيار 22', price: 568.3, unit: 'ريال' },
    { label: t('common.gold_24k') || 'ذهب عيار 24', price: 620.42, unit: 'ريال' },
    { label: t('common.silver_oz') || 'فضة أونصة', price: 81.54, unit: 'دولار' },
    { label: t('common.gold_oz') || 'ذهب أونصة', price: 5140.69, unit: 'ريال' },
  ];

  useEffect(() => {
    const update = () => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }));
    };
    update();
    const interval = setInterval(update, 60000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="w-full border-b" style={{ backgroundColor: '#1C1C1C', borderColor: 'rgba(207, 178, 87, 0.15)' }}>
      {/* Top promotional strip */}
      <div
        className="flex items-center justify-center gap-2 px-4 py-1.5"
        style={{ backgroundColor: '#111111', borderBottom: '1px solid rgba(207, 178, 87, 0.1)' }}
      >
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4" style={{ color: '#CFB257' }}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 0 1-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 0 0-3.213-9.193 2.056 2.056 0 0 0-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 0 0-10.026 0 1.106 1.106 0 0 0-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" />
        </svg>
        <span className="text-sm md:text-base font-medium tracking-wide" style={{ color: '#CFB257' }}>
          {topBar?.text ? t(topBar.text) : (t('common.free_shipping_gold') || 'شحن مجاني على كامل السلة عند طلبك احدى سبائك الذهب عيار 24')}
        </span>
      </div>

      {/* Gold Prices Row */}
      <div className="flex items-center justify-between px-2 md:px-4 py-1.5 max-w-[1400px] mx-auto">
        <div className="flex-1 overflow-x-auto scrollbar-hide">
          <div className="flex items-stretch gap-0">
            {GOLD_PRICES.map((item, i) => (
              <div
                key={i}
                className="flex flex-col items-center justify-center px-4 md:px-6 py-2 shrink-0 border-r last:border-r-0"
                style={{ borderColor: 'rgba(207, 178, 87, 0.15)' }}
              >
                <span className="text-xs md:text-sm font-medium whitespace-nowrap" style={{ color: '#BFA75B' }}>
                  {item.label}
                </span>
                <div className="flex items-center gap-1.5 mt-1">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3.5 h-3.5" style={{ color: '#CFB257' }}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0 1 15.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 0 1 3 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 0 0-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 0 1-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 0 0 3 15h-.75M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm3 0h.008v.008H18V10.5Zm-12 0h.008v.008H6V10.5Z" />
                  </svg>
                  <span className="text-sm md:text-base font-semibold whitespace-nowrap" style={{ color: '#FFFFFF' }}>
                    {item.price.toFixed(2)} {item.unit}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Close button on far left (RTL-style) */}
        <button
          className="shrink-0 ml-2 w-6 h-6 flex items-center justify-center rounded-full hover:bg-gray-800 transition-colors"
          style={{ color: '#BFA75B' }}
          aria-label="Close"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3.5 h-3.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
};

export default TopBar;
