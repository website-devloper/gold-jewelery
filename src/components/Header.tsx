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
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const router = useRouter();
  const auth = getAuth(app);

  const cartItemCount = mounted ? cart.reduce((total, item) => total + item.quantity, 0) : 0;
  const cartTotal = mounted ? cart.reduce((total, item) => total + item.price * item.quantity, 0) : 0;

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/shop?search=${encodeURIComponent(searchQuery)}`);
      setIsSearchOpen(false);
      setSearchQuery('');
    }
  };

  const handleLogout = async () => {
    try {
      if (user) {
        await signOut(auth);
      }
      if (settings?.demoMode && demoUser) {
        localStorage.removeItem('pardah_demo_user');
      }
      router.push('/');
    } catch {
      // Failed to logout
    }
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

  const navLinks = [
    { name: t('nav.home'), key: 'home', path: '/', show: true },
    { name: t('nav.shop'), key: 'shop', path: '/shop', show: true },
    { name: t('nav.categories'), key: 'categories', path: '/categories', show: true },
    { name: t('common.brands'), key: 'brands', path: '/brands', show: true },
    { name: t('nav.about'), key: 'about', path: '/about', show: settings?.pages?.aboutUs },
    { name: t('nav.contact'), key: 'contact', path: '/contact', show: settings?.pages?.contactUs },
  ].filter(link => link.show !== false);

  return (
    <>
      <TopBar />

      <header
        className={`sticky top-0 z-50 transition-all duration-300 font-heading ${isScrolled ? 'shadow-md' : ''}`}
        style={{
          backgroundColor: isScrolled ? 'rgba(255, 255, 255, 0.97)' : '#FFFFFF',
          borderBottom: '1px solid #EEEEEE',
          backdropFilter: isScrolled ? 'blur(12px)' : 'none',
        }}
      >
        <div className="page-container">
          <div
            className="flex items-center justify-between"
            style={{ height: isScrolled ? '60px' : '72px', transition: 'height 0.3s ease' }}
          >

            {/* Right Side — Hamburger (mobile only) + Desktop Nav + Search */}
            <div className="flex items-center gap-1 md:gap-3">
              {/* Mobile Hamburger Menu */}
              <button
                className="md:hidden flex items-center gap-1.5 px-2 py-1.5 rounded-lg transition-colors hover:bg-gray-50"
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                aria-label={isMenuOpen ? 'Close menu' : 'Open menu'}
                style={{ color: '#333333' }}
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
                </svg>
              </button>

              {/* Desktop Navigation Links */}
              <nav className={`hidden md:flex items-center ${isRTL ? 'space-x-reverse' : ''} gap-0.5`}>
                {navLinks.map((link) => (
                  <Link
                    key={link.key}
                    href={link.path}
                    className="relative px-3 lg:px-4 py-2 text-[22px] lg:text-[26px] font-bold transition-colors duration-200 rounded-md group"
                    style={{ color: '#111111' }}
                  >
                    <span className="group-hover:text-[#CFB257] transition-colors duration-200">
                      {link.name}
                    </span>
                    {/* Subtle underline on hover */}
                    <span
                      className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-0 h-[1.5px] rounded-full transition-all duration-300 group-hover:w-3/4"
                      style={{ backgroundColor: '#CFB257' }}
                    />
                  </Link>
                ))}
              </nav>

              {/* Search Icon */}
              <button
                onClick={() => setIsSearchOpen(!isSearchOpen)}
                className="flex items-center justify-center w-9 h-9 rounded-full transition-colors hover:bg-gray-50"
                style={{ color: '#333333' }}
                aria-label="Search"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
                </svg>
              </button>
            </div>

            {/* Center — Logo */}
            <div className="absolute left-1/2 -translate-x-1/2">
              <Link href="/" className="flex items-center gap-2 group">
                {mounted && (settings.theme.logoUrl || '/logo.png') ? (
                  <Image
                    src={settings.theme.logoUrl || '/logo.png'}
                    alt={settings.company.name || "ALSAAB JEWELRY"}
                    width={200}
                    height={70}
                    className="h-12 md:h-14 w-auto object-contain transition-transform duration-300 group-hover:scale-105"
                    priority
                    unoptimized
                  />
                ) : (
                  <div className="flex items-center gap-2">
                    <span
                      className="font-heading font-bold tracking-wider transition-all duration-300"
                      style={{
                        color: '#333333',
                        fontSize: isScrolled ? '1.4rem' : '1.75rem',
                        lineHeight: 1.1,
                        letterSpacing: '0.12em',
                      }}
                    >
                      {settings.company.name || "PARDAH"}
                    </span>
                  </div>
                )}
              </Link>
            </div>

            {/* Left Side — Language + User + Cart */}
            <div className="flex items-center gap-1 md:gap-2">
              {/* Language */}
              <div className="hidden md:block">
                <LanguageSwitcher />
              </div>

              {/* User Account */}
              {settings?.site?.enableUserAccountCreation !== false && (
                <div className="relative hidden md:block">
                  <button
                    id="user-menu-button"
                    onClick={() => {
                      const isLoggedIn = user || (settings?.demoMode && demoUser);
                      if (isLoggedIn) {
                        setIsUserMenuOpen(!isUserMenuOpen);
                      } else {
                        router.push('/login');
                      }
                    }}
                    className="flex items-center justify-center w-9 h-9 rounded-full transition-colors hover:bg-gray-50"
                    style={{ color: '#333333' }}
                    aria-label="Account"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
                    </svg>
                  </button>

                  {/* User Dropdown */}
                  {isUserMenuOpen && (user || (settings?.demoMode && demoUser)) && (
                    <div
                      id="user-menu-dropdown"
                      className="absolute right-0 mt-2 w-56 rounded-xl overflow-hidden shadow-xl z-50 animate-fadeIn"
                      style={{ backgroundColor: '#FFFFFF', border: '1px solid #EEEEEE' }}
                    >
                      {/* User Info Header */}
                      <div className="px-5 py-3" style={{ background: 'linear-gradient(135deg, #F9F6EF, #F3EDE0)' }}>
                        <p className="text-sm font-heading font-semibold" style={{ color: '#333' }}>
                          {user?.displayName || demoUser?.displayName || 'User'}
                        </p>
                        <p className="text-xs mt-0.5" style={{ color: '#8B7355' }}>
                          {user?.email || demoUser?.phoneNumber || ''}
                        </p>
                      </div>
                      <div className="py-1">
                        <Link
                          href="/account/profile"
                          className="flex items-center gap-3 px-5 py-2.5 text-sm transition-colors hover:bg-gray-50"
                          style={{ color: '#333' }}
                          onClick={() => setIsUserMenuOpen(false)}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 opacity-50">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
                          </svg>
                          {t('common.profile')}
                        </Link>
                        <Link
                          href="/account/orders"
                          className="flex items-center gap-3 px-5 py-2.5 text-sm transition-colors hover:bg-gray-50"
                          style={{ color: '#333' }}
                          onClick={() => setIsUserMenuOpen(false)}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 opacity-50">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 1 0-7.5 0v4.5m11.356-1.993 1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 0 1-1.12-1.243l1.264-12A1.125 1.125 0 0 1 5.513 7.5h12.974c.576 0 1.059.435 1.119 1.007ZM8.625 10.5a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm7.5 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
                          </svg>
                          {t('common.orders')}
                        </Link>
                        {settings?.features?.wishlist && (
                          <Link
                            href="/wishlist"
                            className="flex items-center gap-3 px-5 py-2.5 text-sm transition-colors hover:bg-gray-50"
                            style={{ color: '#333' }}
                            onClick={() => setIsUserMenuOpen(false)}
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 opacity-50">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12Z" />
                            </svg>
                            {t('common.wishlist')}
                          </Link>
                        )}
                      </div>
                      <div style={{ borderTop: '1px solid #eee' }}>
                        <button
                          onClick={() => { handleLogout(); setIsUserMenuOpen(false); }}
                          className="flex items-center gap-3 w-full px-5 py-2.5 text-sm text-red-600 transition-colors hover:bg-red-50"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 opacity-50">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15m3 0 3-3m0 0-3-3m3 3H9" />
                          </svg>
                          {t('common.logout')}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Cart */}
              <Link
                href="/cart"
                className="relative flex items-center gap-1.5 px-2 py-1.5 rounded-lg transition-colors hover:bg-gray-50 group"
                style={{ color: '#333333' }}
                aria-label="Cart"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 0 0-3 3h15.75m-12.75-3h11.218c1.121 0 2.09-.773 2.34-1.87l1.81-7.964H6.106M7.5 14.25 5.106 5.272M6 20.25a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Zm12.75 0a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Z" />
                </svg>
                {cartItemCount > 0 && (
                  <span
                    className="absolute -top-0.5 -right-0.5 text-white text-[9px] font-bold rounded-full h-[16px] w-[16px] flex items-center justify-center"
                    style={{ backgroundColor: '#B69349' }}
                  >
                    {cartItemCount}
                  </span>
                )}
                <span className="hidden md:inline text-xs font-medium" style={{ color: '#333' }}>
                  {cartTotal > 0 ? `${cartTotal.toFixed(0)} ${t('common.sar') || 'ر.س'}` : `0 ${t('common.sar') || 'ر.س'}`}
                </span>
              </Link>
            </div>
          </div>
        </div>

        {/* Search Overlay */}
        {isSearchOpen && (
          <div
            className="absolute top-full left-0 right-0 animate-fadeIn z-50 shadow-lg"
            style={{
              backgroundColor: 'rgba(255, 255, 255, 0.98)',
              backdropFilter: 'blur(20px)',
              borderBottom: '1px solid #eee',
            }}
          >
            <div className="page-container py-5">
              <form onSubmit={handleSearch} className="relative max-w-2xl mx-auto">
                <input
                  type="text"
                  placeholder={t('common.search_placeholder') || 'البحث عن الذهب والمجوهرات والخواتم...'}
                  className="w-full px-5 py-3.5 text-base rounded-xl focus:outline-none transition-all duration-300"
                  style={{
                    backgroundColor: '#F9F9F5',
                    border: '1px solid #E5E5E0',
                    color: '#333',
                  }}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  autoFocus
                />
                <button
                  type="submit"
                  className="absolute right-2 top-1/2 -translate-y-1/2 px-5 py-2 rounded-lg text-sm font-semibold text-white transition-all duration-300 hover:shadow-md"
                  style={{ backgroundColor: '#B69349' }}
                >
                  {t('common.search') || 'بحث'}
                </button>
              </form>
              <button
                onClick={() => setIsSearchOpen(false)}
                className="absolute top-3 right-6 w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors"
                style={{ color: '#666' }}
              >
                ✕
              </button>
            </div>
          </div>
        )}

        {/* Mobile Menu — Slide-in Drawer */}
        {isMenuOpen && (
          <>
            {/* Backdrop */}
            <div
              className="fixed inset-0 bg-black/25 z-40 md:hidden animate-fadeIn"
              onClick={() => setIsMenuOpen(false)}
            />
            {/* Drawer */}
            <div
              className="fixed top-0 right-0 h-full w-80 z-50 md:hidden overflow-y-auto shadow-2xl"
              style={{
                backgroundColor: '#FFFFFF',
                animation: 'slideInRight 0.3s ease-out',
              }}
            >
              <style>{`@keyframes slideInRight { from { transform: translateX(100%); } to { transform: translateX(0); } }`}</style>

              {/* Drawer Header */}
              <div className="flex items-center justify-between px-6 py-5" style={{ borderBottom: '1px solid #eee' }}>
                <span className="font-heading text-lg font-bold tracking-wider" style={{ color: '#333' }}>
                  {settings.company.name || "PARDAH"}
                </span>
                <button
                  onClick={() => setIsMenuOpen(false)}
                  className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors"
                  style={{ color: '#666' }}
                >
                  ✕
                </button>
              </div>

              {/* Search */}
              <div className="px-6 py-4">
                <form onSubmit={handleSearch}>
                  <input
                    type="text"
                    placeholder={t('common.search_placeholder') || 'البحث عن الذهب والمجوهرات...'}
                    className="w-full px-4 py-2.5 rounded-lg text-sm focus:outline-none"
                    style={{
                      backgroundColor: '#F9F9F5',
                      border: '1px solid #E5E5E0',
                      color: '#333',
                    }}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </form>
              </div>

              {/* Nav Links */}
              <nav className="px-6 py-2">
                {navLinks.map((link) => (
                  <Link
                    key={link.key}
                    href={link.path}
                    className="flex items-center py-3 text-[14px] font-medium transition-colors hover:text-[#B69349]"
                    style={{ color: '#333', borderBottom: '1px solid #f0f0f0' }}
                    onClick={() => setIsMenuOpen(false)}
                  >
                    {link.name}
                  </Link>
                ))}
              </nav>

              {/* Language */}
              <div className="px-6 py-4" style={{ borderTop: '1px solid #f0f0f0' }}>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium" style={{ color: '#666' }}>{t('common.language') || 'اللغة'}</span>
                  <LanguageSwitcher />
                </div>
              </div>

              {/* Live Chat */}
              {settings?.features?.liveChat !== false && (
                <div className="px-6 py-4">
                  <button
                    type="button"
                    className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold text-white transition-all duration-300 hover:shadow-md"
                    style={{ backgroundColor: '#B69349' }}
                    onClick={() => {
                      if (typeof window !== 'undefined') {
                        window.dispatchEvent(new CustomEvent('open-live-chat'));
                      }
                      setIsMenuOpen(false);
                    }}
                  >
                    💬 {t('common.live_chat') || 'المحادثة المباشرة'}
                  </button>
                </div>
              )}
            </div>
          </>
        )}
      </header>
    </>
  );
};

export default Header;
