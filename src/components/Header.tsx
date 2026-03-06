'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useCart } from '../context/CartContext';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';
import { useLanguage } from '../context/LanguageContext';
import LanguageSwitcher from './LanguageSwitcher';
import TopBar from './TopBar';

import { getAuth, signOut } from 'firebase/auth';
import { app } from '@/lib/firebase';

const Header = () => {
  const { cart } = useCart();
  const { user, demoUser } = useAuth();
  const { settings } = useSettings();
  const { currentLanguage, t } = useLanguage();
  const isRTL = currentLanguage?.isRTL || false;
  const [mounted, setMounted] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const router = useRouter();
  const auth = getAuth(app);

  const cartItemCount = mounted ? cart.reduce((total, item) => total + item.quantity, 0) : 0;

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 0);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/shop?search=${encodeURIComponent(searchQuery)}`);
    }
  };

  const handleLogout = async () => {
    try {
      if (user) await signOut(auth);
      if (settings?.demoMode && demoUser) localStorage.removeItem('pardah_demo_user');
      router.push('/');
    } catch { }
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('#user-menu-button') && !target.closest('#user-menu-dropdown')) {
        setIsUserMenuOpen(false);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  const headerBg = settings?.theme?.colors?.headerBackground || '#ffffff';
  const headerText = settings?.theme?.colors?.headerText || '#000000';

  return (
    <>
      <TopBar />
      <header
        style={{
          backgroundColor: isScrolled ? `${headerBg}CC` : headerBg,
          color: headerText,
        }}
        className={`sticky top-0 z-50 transition-all duration-300 border-b border-transparent ${isScrolled ? 'backdrop-blur-md shadow-sm border-gray-100' : ''
          }`}
      >
        <div className="page-container">
          <div className="flex items-center justify-between h-16 md:h-20">
            <button
              className="md:hidden p-2 text-gray-600 hover:text-black focus:outline-none"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              aria-label={isMenuOpen ? (t('header.close_menu') || 'Close menu') : (t('header.open_menu') || 'Open menu')}
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
              </svg>
            </button>

            <div className="flex-shrink-0">
              <Link href="/" className="flex items-center hover:scale-105 transition-transform duration-300">
                {mounted && settings.theme.logoUrl ? (
                  <Image
                    src={settings.theme.logoUrl}
                    alt={settings.company.name || ""}
                    width={120}
                    height={48}
                    className="h-12 w-auto object-contain"
                    unoptimized
                  />
                ) : (
                  <span style={{ color: headerText }} className="text-4xl font-heading font-bold tracking-tight">
                    {settings.company.name || ""}
                  </span>
                )}
              </Link>
            </div>

            <nav className={`hidden md:flex ${isRTL ? 'space-x-reverse space-x-8' : 'space-x-8'} items-center`}>
              {[
                { name: t('nav.home'), key: 'home', path: '/', show: true },
                { name: t('nav.shop'), key: 'shop', path: '/shop', show: true },
                { name: t('nav.categories'), key: 'categories', path: '/categories', show: true },
                { name: t('common.brands'), key: 'brands', path: '/brands', show: true },
                { name: t('nav.about'), key: 'about', path: '/about', show: settings?.pages?.aboutUs },
                { name: t('nav.contact'), key: 'contact', path: '/contact', show: settings?.pages?.contactUs },
              ].filter(link => link.show !== false).map((link) => (
                <Link key={link.key} href={link.path} style={{ color: headerText }} className="text-sm font-medium hover:opacity-70 transition-colors relative group">
                  {link.name}
                  <span style={{ backgroundColor: headerText }} className={`absolute -bottom-1 ${isRTL ? 'right-0' : 'left-0'} w-0 h-0.5 transition-all group-hover:w-full`}></span>
                </Link>
              ))}
            </nav>

            <div className={`flex items-center ${isRTL ? 'space-x-reverse space-x-6' : 'space-x-6'}`}>
              {settings?.site?.enableLanguageSwitcher && <div className="hidden md:block"><LanguageSwitcher /></div>}
              <div className="hidden md:block relative group">
                <form onSubmit={handleSearch} className="relative">
                  <input
                    type="text"
                    placeholder={t('common.search')}
                    className={`w-16 group-hover:w-48 focus:w-48 transition-all duration-300 border-b border-transparent focus:border-black bg-transparent focus:outline-none text-sm py-1 ${isRTL ? 'pl-8' : 'pr-8'} placeholder-transparent focus:placeholder-gray-400`}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                  <button type="submit" style={{ color: headerText }} className={`absolute ${isRTL ? 'left-0' : 'right-0'} top-1/2 -translate-y-1/2 hover:opacity-70 transition-opacity w-8 h-8 flex items-center justify-center`}>
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
                    </svg>
                  </button>
                </form>
              </div>

              {settings?.site?.enableUserAccountCreation !== false && (
                <div className="relative hidden md:block">
                  <button id="user-menu-button" onClick={() => (user || (settings?.demoMode && demoUser)) ? setIsUserMenuOpen(!isUserMenuOpen) : router.push('/login')} style={{ color: headerText }} className="hover:opacity-70 transition-opacity focus:outline-none">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 hover:scale-110 transition-transform">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
                    </svg>
                  </button>
                  {isUserMenuOpen && (user || (settings?.demoMode && demoUser)) && (
                    <div id="user-menu-dropdown" className={`absolute ${isRTL ? 'left-0 origin-top-left' : 'right-0 origin-top-right'} mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-50 ring-1 ring-black ring-opacity-5 transform transition-all duration-200 ease-out`}>
                      <div className="px-4 py-2 border-b border-gray-100">
                        <p className="text-sm font-medium text-gray-900 truncate">{user?.displayName || demoUser?.displayName || 'User'}</p>
                        <p className="text-xs text-gray-500 truncate">{user?.email || demoUser?.phoneNumber || ''}</p>
                      </div>
                      <Link href="/account/profile" className={`block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 ${isRTL ? 'text-right' : 'text-left'}`} onClick={() => setIsUserMenuOpen(false)}>{t('common.profile')}</Link>
                      <Link href="/account/orders" className={`block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 ${isRTL ? 'text-right' : 'text-left'}`} onClick={() => setIsUserMenuOpen(false)}>{t('common.orders')}</Link>
                      <button onClick={() => { handleLogout(); setIsUserMenuOpen(false); }} className={`block w-full ${isRTL ? 'text-right' : 'text-left'} px-4 py-2 text-sm text-red-600 hover:bg-gray-50`}>{t('common.logout')}</button>
                    </div>
                  )}
                </div>
              )}

              <Link href="/cart" style={{ color: headerText }} className="relative hover:opacity-70 transition-opacity">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 1 0-7.5 0v4.5m11.356-1.993 1.263 5c.07.277-.15.456-.52.456H4.15c-.37 0-.59-.179-.52-.456l1.263-5a.75.75 0 0 1 .726-.569h12.862a.75.75 0 0 1 .726.569Z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14v7a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-7Z" />
                </svg>
                {cartItemCount > 0 && <span className="absolute -top-1.5 -right-1.5 bg-black text-white text-[10px] font-bold rounded-full h-4 w-4 flex items-center justify-center border border-white">{cartItemCount}</span>}
              </Link>
            </div>
          </div>
        </div>

        {isMenuOpen && (
          <div className={`md:hidden bg-white border-t border-gray-100 absolute w-full ${isRTL ? 'right-0' : 'left-0'} top-full shadow-lg`}>
            <div className="p-4 space-y-4">
              <nav className="flex flex-col space-y-3">
                {[
                  { name: t('nav.home'), key: 'home', path: '/', show: true },
                  { name: t('nav.shop'), key: 'shop', path: '/shop', show: true },
                  { name: t('nav.categories'), key: 'categories', path: '/categories', show: true },
                  { name: t('common.brands'), key: 'brands', path: '/brands', show: true },
                  { name: t('nav.about'), key: 'about', path: '/about', show: settings?.pages?.aboutUs },
                  { name: t('nav.contact'), key: 'contact', path: '/contact', show: settings?.pages?.contactUs },
                ].filter(link => link.show !== false).map((link) => (
                  <Link key={link.key} href={link.path} className="text-gray-700 hover:text-black font-medium py-1" onClick={() => setIsMenuOpen(false)}>{link.name}</Link>
                ))}
              </nav>
            </div>
          </div>
        )}
      </header>
    </>
  );
};

export default Header;
