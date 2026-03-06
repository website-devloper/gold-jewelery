'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useSettings } from '../context/SettingsContext';
import { useLanguage } from '../context/LanguageContext';
import { addNewsletterSubscription } from '@/lib/firestore/newsletter_db';

const Footer = () => {
  const { settings } = useSettings();
  const { currentLanguage, t } = useLanguage();
  const isRTL = currentLanguage?.isRTL || false;

  const socialLinks = settings?.social || { facebook: '', instagram: '', twitter: '', youtube: '' };
  const isValidUrl = (url: string | undefined): boolean => {
    if (!url) return false;
    const trimmed = url.trim();
    return trimmed !== '' && trimmed !== '#' && !trimmed.startsWith('http://') && !trimmed.startsWith('https://');
  };

  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const scrollToTop = () => window.scrollTo({ top: 0, behavior: 'smooth' });

  const handleNewsletterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setSubmitting(true);
    try {
      await addNewsletterSubscription({ email: email.trim(), source: 'footer' });
      setSubmitted(true);
      setEmail('');
    } catch {
      setError('Subscription failed.');
    } finally {
      setSubmitting(false);
    }
  };

  const footerBg = settings?.theme?.colors?.footerBackground || '#111827';
  const footerText = settings?.theme?.colors?.footerText || '#ffffff';

  return (
    <footer style={{ backgroundColor: footerBg, color: footerText }} className="relative border-t border-gray-800">
      <button onClick={scrollToTop} className={`absolute top-0 ${isRTL ? 'left-8' : 'right-8'} -translate-y-1/2 bg-white text-gray-900 p-3 rounded-full shadow-lg`}>
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 15.75l7.5-7.5 7.5 7.5" /></svg>
      </button>

      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-8">
          <div>
            <h4 className="text-white font-semibold text-sm mb-4 uppercase tracking-wider">{t('footer.shop') || 'Shop'}</h4>
            <ul className="space-y-3 text-sm text-gray-400">
              <li><Link href="/shop" className="hover:text-white transition-colors">{t('footer.all_products') || 'All Products'}</Link></li>
              <li><Link href="/categories" className="hover:text-white transition-colors">{t('nav.categories') || 'Categories'}</Link></li>
              <li><Link href="/brands" className="hover:text-white transition-colors">{t('common.brands') || 'Brands'}</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="text-white font-semibold text-sm mb-4 uppercase tracking-wider">{t('footer.company') || 'Company'}</h4>
            <ul className="space-y-3 text-sm text-gray-400">
              {settings?.pages?.aboutUs && <li><Link href="/about" className="hover:text-white transition-colors">{t('footer.about_us') || 'About Us'}</Link></li>}
              {settings?.pages?.contactUs && <li><Link href="/contact" className="hover:text-white transition-colors">{t('footer.contact') || 'Contact'}</Link></li>}
            </ul>
          </div>
          <div className="col-span-2 md:col-span-4 lg:col-span-2">
            <h4 className="text-white font-semibold text-sm mb-4 uppercase tracking-wider">{t('footer.newsletter_title') || 'Newsletter'}</h4>
            <form onSubmit={handleNewsletterSubmit} className="flex gap-2">
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" className="flex-1 bg-white/10 border border-gray-700 px-4 py-2 rounded-lg text-sm" />
              <button type="submit" disabled={submitting} className="bg-white text-gray-900 px-4 py-2 rounded-lg text-sm font-bold">
                {submitting ? '...' : (t('footer.subscribe') || 'Join')}
              </button>
            </form>
          </div>
        </div>
        <div className="mt-12 pt-8 border-t border-gray-800 flex flex-col md:flex-row justify-between items-center text-sm text-gray-400">
          <p>{settings?.site?.copyrightText || `© ${new Date().getFullYear()} Pardah. All rights reserved.`}</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
