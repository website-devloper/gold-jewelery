'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useSettings } from '../context/SettingsContext';
import { useLanguage } from '../context/LanguageContext';
import { addNewsletterSubscription } from '@/lib/firestore/newsletter_db';

const FooterLink = ({ href, children }: { href: string; children: React.ReactNode }) => (
  <Link
    href={href}
    className="block text-base transition-all duration-200 hover:translate-x-1"
    style={{ color: '#6B4226' }}
    onMouseEnter={(e) => (e.currentTarget.style.color = '#B69349')}
    onMouseLeave={(e) => (e.currentTarget.style.color = '#6B4226')}
  >
    {children}
  </Link>
);

const Footer = () => {
  const { settings } = useSettings();
  const { t } = useLanguage();

  const socialLinks = settings?.social || { facebook: '', instagram: '', twitter: '', youtube: '' };

  const isValidUrl = (url: string | undefined): boolean => {
    if (!url) return false;
    const trimmed = url.trim();
    return trimmed !== '' && trimmed !== '#' && trimmed !== 'http://' && trimmed !== 'https://';
  };

  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const scrollToTop = () => { window.scrollTo({ top: 0, behavior: 'smooth' }); };

  const handleNewsletterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) { setError('Please enter a valid email address.'); return; }
    setSubmitting(true);
    setError(null);
    try {
      await addNewsletterSubscription({ email: email.trim(), source: 'footer' });
      setSubmitted(true);
      setEmail('');
      setTimeout(() => setSubmitted(false), 3000);
    } catch {
      setError('Failed to subscribe. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <footer style={{ backgroundColor: '#1A1A1A', color: '#FFFFFF' }} className="relative z-10">

      {/* ══ Layer 1: Back to Top ══ */}
      <div className="border-b border-white/5 py-6">
        <button
          onClick={scrollToTop}
          className="flex items-center justify-center gap-2 mx-auto text-sm font-medium hover:text-[#B69349] transition-colors duration-300"
          style={{ color: '#FFFFFF' }}
        >
          <span>{t('footer.back_to_top') || 'العودة إلى أعلى'}</span>
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 15.75l7.5-7.5 7.5 7.5" />
          </svg>
        </button>
      </div>

      <div className="page-container px-4 sm:px-6 lg:px-8">

        {/* ══ Layer 2: Social & Newsletter ══ */}
        <div className="py-12 flex flex-col lg:flex-row items-center justify-between gap-10">

          {/* Social Icons (Left) */}
          <div className="flex items-center gap-4">
            {[
              { id: 'facebook', icon: <path d="M18 2h-3a5 5 0 00-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 011-1h3z" /> },
              { id: 'snapchat', icon: <path d="M12 2c-4.4 0-8 3.6-8 8 0 3.3 2.1 6.1 5 7.2v.8c0 .6.4 1 1 1s1-.4 1-1v-.8c2.9-1.1 5-3.9 5-7.2 0-4.4-3.6-8-8-8zm4 8c0 2.2-1.8 4-4 4s-4-1.8-4-4 1.8-4 4-4 4 1.8 4 4z" /> },
              { id: 'twitter', icon: <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" /> },
              { id: 'instagram', icon: <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" /> }
            ].map((soc) => (
              <a
                key={soc.id}
                href={isValidUrl((socialLinks as any)[soc.id]) ? ((socialLinks as any)[soc.id].startsWith('http') ? (socialLinks as any)[soc.id] : `https://${(socialLinks as any)[soc.id]}`) : '#'}
                className="w-12 h-12 flex items-center justify-center rounded-full bg-[#3E3E3E] text-white hover:bg-[#B69349] transition-all duration-300"
                target="_blank"
                rel="noopener noreferrer"
              >
                <svg fill="currentColor" className="w-5 h-5" viewBox="0 0 24 24">{soc.icon}</svg>
              </a>
            ))}
          </div>

          {/* Newsletter (Right) */}
          <div className="flex flex-col md:flex-row items-center gap-6 text-center md:text-right">
            <div>
              <h3 className="text-2xl font-bold" style={{ color: '#FFFFFF' }}>{t('footer.newsletter_title_alt') || 'كن أول من يعرف!'}</h3>
              <p className="text-sm opacity-70 mt-1">{t('footer.newsletter_desc_alt') || 'اشترك بنشرتنا البريدية ليصلك كل جديد.'}</p>
            </div>
            <form onSubmit={handleNewsletterSubmit} className="flex h-12 overflow-hidden rounded-md min-w-[320px]">
              <input
                type="email"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setError(null); }}
                placeholder={t('footer.email_placeholder_alt') || 'ادخل البريد الإلكتروني'}
                className="flex-1 bg-[#3E3E3E] px-4 text-sm focus:outline-none"
                style={{ color: '#FFFFFF' }}
                required
              />
              <button
                type="submit"
                className="px-8 bg-[#C59D5F] text-[#1A1A1A] font-bold text-sm hover:bg-[#B69349] transition-colors duration-300"
              >
                {t('footer.subscribe_alt') || 'اشترك'}
              </button>
            </form>
          </div>
        </div>

        <div className="border-t border-white/5 py-16">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 text-right">

            {/* Col 4: Logo & About (Visually Rightmost in RTL) */}
            <div className="lg:order-4">
              <div className="flex justify-start lg:justify-end mb-6">
                {(settings?.theme?.logoUrl || true) ? (
                  <Image
                    src={settings?.theme?.logoUrl || '/logo.png'}
                    alt="Logo"
                    width={180}
                    height={60}
                    className="h-14 w-auto object-contain brightness-200"
                    unoptimized
                  />
                ) : (
                  <h3 className="text-2xl font-bold tracking-tight" style={{ color: '#B69349' }}>{settings?.company?.name || "ALSAAB JEWELRY"}</h3>
                )}
              </div>
              <p className="text-sm leading-[1.8] opacity-80 max-w-xs ml-auto">
                {t('footer.about_alt') || 'تسوق الآن من مجوهرات الصعب عبر الإنترنت، وتمتع بتشكيلة فاخرة من السبائك الذهبية عيار 24 والمشغولات الذهبية عيار 21 و18 المميزة. نحن نخدمكم من قلب القصيم - مدينة بريدة'}
              </p>
            </div>

            {/* Col 3: Links */}
            <div className="lg:order-3">
              <h4 className="text-lg font-bold mb-8" style={{ color: '#B69349' }}>{t('footer.links_interest') || 'روابط تهمك'}</h4>
              <ul className="space-y-4 text-sm font-medium opacity-80">
                <li><Link href="/about" className="hover:text-[#B69349] transition-colors">{t('footer.about_us') || 'من نحن'}</Link></li>
                <li><Link href="/faq" className="hover:text-[#B69349] transition-colors">{t('footer.faq') || 'الأسئلة الشائعة'}</Link></li>
                <li><Link href="/stores" className="hover:text-[#B69349] transition-colors">{t('footer.stores') || 'مواقع الفروع'}</Link></li>
                <li><Link href="/returns" className="hover:text-[#B69349] transition-colors">{t('footer.returns') || 'سياسة الاسترجاع والاستبدال'}</Link></li>
                <li><Link href="/privacy" className="hover:text-[#B69349] transition-colors">{t('footer.privacy') || 'سياسة الخصوصية'}</Link></li>
                <li><Link href="/terms" className="hover:text-[#B69349] transition-colors">{t('footer.terms') || 'شروط الاستخدام'}</Link></li>
              </ul>
            </div>

            {/* Col 2: Customer Service Icons */}
            <div className="lg:order-2">
              <h4 className="text-lg font-bold mb-8" style={{ color: '#B69349' }}>{t('footer.customer_service') || 'خدمة العملاء'}</h4>
              <div className="flex flex-wrap justify-end gap-3">
                {[
                  { id: 'telegram', icon: <path d="M20.665 3.717l-17.73 6.837c-1.21.486-1.203 1.161-.222 1.462l4.552 1.42l10.532-6.645c.498-.303.953-.14.579.192l-8.533 7.701l-.331 4.954c.486 0 .699-.223.971-.486l2.333-2.27l4.852 3.584c.894.492 1.538.24 1.761-.832l3.184-15.004c.326-1.307-.5-1.9-1.353-1.503z" /> },
                  { id: 'email', icon: <path d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /> },
                  { id: 'phone', icon: <path d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /> },
                  { id: 'mobile', icon: <path d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" /> },
                  { id: 'whatsapp', icon: <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L0 24l6.335-1.662c1.72.937 3.659 1.432 5.63 1.433h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" /> }
                ].map((icon) => (
                  <a
                    key={icon.id}
                    href="#"
                    className="w-12 h-12 flex items-center justify-center rounded-lg bg-[#3E3E3E] text-white hover:bg-[#B69349] transition-all"
                  >
                    <svg fill="currentColor" className="w-5 h-5" viewBox="0 0 24 24">{icon.icon}</svg>
                  </a>
                ))}
              </div>
            </div>

            {/* Col 1: VAT & Secondary Logo */}
            <div className="lg:order-1 flex flex-col items-center lg:items-start text-center lg:text-right">
              <h4 className="text-lg font-bold mb-6" style={{ color: '#B69349' }}>{t('footer.vat_number') || 'الرقم الضريبي'}</h4>
              <p className="text-2xl font-bold tracking-[0.2em] mb-8" style={{ color: '#CFB257' }}>1234567890</p>

              <div className="opacity-50 grayscale hover:grayscale-0 transition-all">
                <Image
                  src={settings?.theme?.logoUrl || "/logo.png"}
                  alt="Alt Logo"
                  width={150}
                  height={50}
                  className="h-10 w-auto object-contain brightness-200"
                  unoptimized
                />
              </div>
            </div>
          </div>

        </div>

        {/* ══ Layer 4: Global Footer Bottom ══ */}
        <div className="py-8 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-6 text-[11px] uppercase tracking-[0.1em] opacity-40">
          <p>{settings?.site?.copyrightText || `© ${new Date().getFullYear()} ${settings?.company?.name || 'ALSAAB JEWELRY'}. ALL RIGHTS RESERVED.`}</p>
          <div className="flex gap-8">
            <Link href="/privacy" className="hover:text-white transition-colors">{t('footer.privacy') || 'Privacy Policy'}</Link>
            <Link href="/terms" className="hover:text-white transition-colors">{t('footer.terms') || 'Terms of Service'}</Link>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
