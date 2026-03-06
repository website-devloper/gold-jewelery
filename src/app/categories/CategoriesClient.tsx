'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useLanguage } from '@/context/LanguageContext';
import { getCategoryName, getCategoryDescription } from '@/lib/utils/translations';
import SkeletonLoader from '@/components/SkeletonLoader';

interface SerializedCategory {
  id: string;
  name: string;
  slug: string;
  description?: string;
  imageUrl?: string;
  parentCategory?: string;
  createdAt: { seconds: number; nanoseconds: number } | null;
  updatedAt: { seconds: number; nanoseconds: number } | null;
}

interface CategoriesClientProps {
  categories: SerializedCategory[];
}

const CategoriesClient: React.FC<CategoriesClientProps> = ({ categories }) => {
  const { currentLanguage, t } = useLanguage();
  const languageCode = currentLanguage?.code || 'en';
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [visibleSections, setVisibleSections] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Filter categories based on search
  const filteredCategories = useMemo(() => {
    if (!searchQuery.trim()) return categories;

    const query = searchQuery.toLowerCase();
    return categories.filter(category => {
      const name = getCategoryName(category as unknown as import('@/lib/firestore/categories').Category, languageCode).toLowerCase();
      const description = getCategoryDescription(category as unknown as import('@/lib/firestore/categories').Category, languageCode)?.toLowerCase() || '';
      return name.includes(query) || description.includes(query);
    });
  }, [categories, searchQuery, languageCode]);

  // Loading state
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 300);
    setTimeout(() => {
      setIsLoading(true);
    }, 0);
    return () => clearTimeout(timer);
  }, [filteredCategories]);

  // Intersection Observer for animations
  useEffect(() => {
    const allSections = document.querySelectorAll('[data-section-id]');
    const allSectionIds = Array.from(allSections).map(section => section.getAttribute('data-section-id')).filter(Boolean) as string[];
    if (allSectionIds.length > 0) {
      setTimeout(() => {
        setVisibleSections(new Set(allSectionIds));
      }, 0);
    }

    const observerOptions = {
      root: null,
      rootMargin: '-50px 0px',
      threshold: 0.1,
    };

    const observerCallback = (entries: IntersectionObserverEntry[]) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const sectionId = entry.target.getAttribute('data-section-id');
          if (sectionId) {
            setVisibleSections((prev) => {
              if (prev.has(sectionId)) return prev;
              return new Set(prev).add(sectionId);
            });
          }
        }
      });
    };

    const observer = new IntersectionObserver(observerCallback, observerOptions);

    const timeoutId = setTimeout(() => {
      const sections = document.querySelectorAll('[data-section-id]');
      sections.forEach((section) => observer.observe(section));
    }, 100);

    return () => {
      clearTimeout(timeoutId);
      const sections = document.querySelectorAll('[data-section-id]');
      sections.forEach((section) => observer.unobserve(section));
    };
  }, [filteredCategories.length]);

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#FAFAF5' }}>
      {/* Hero Section */}
      <section
        data-section-id="hero"
        className={`w-full py-12 md:py-16 transition-all duration-700 ${visibleSections.has('hero') ? 'opacity-100 translate-y-0' : 'opacity-100 translate-y-0'
          }`}
        style={{ backgroundColor: '#F5F0E1', borderBottom: '1px solid rgba(207, 178, 87, 0.12)' }}
      >
        <div className="page-container text-center">
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-heading font-bold mb-3 leading-tight" style={{ color: '#333' }}>
            {t('categories.title')}
          </h1>
          <p className="text-sm md:text-base max-w-2xl mx-auto leading-relaxed" style={{ color: '#8B7355' }}>
            {t('categories.subtitle')}
          </p>
        </div>
      </section>

      {/* Main Content */}
      <div className="page-container pt-4 md:pt-6 pb-8 md:pb-12">
        {/* Section Divider */}
        <div className="h-px mb-6 md:mb-8" style={{ background: 'linear-gradient(to right, transparent, rgba(207, 178, 87, 0.2), transparent)' }} />

        {/* Search & View Toggle */}
        <div
          data-section-id="controls"
          className={`flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 md:mb-8 pb-4 transition-all duration-700 ${visibleSections.has('controls') ? 'opacity-100 translate-y-0' : 'opacity-100 translate-y-0'
            }`}
          style={{ borderBottom: '1px solid rgba(207, 178, 87, 0.1)' }}
        >
          <div className="flex-1 w-full md:max-w-md">
            <div className="relative">
              <input
                type="text"
                placeholder={t('categories.search_placeholder')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-lg text-sm transition-colors focus:outline-none"
                style={{
                  border: '1px solid rgba(207, 178, 87, 0.2)',
                  backgroundColor: '#FFFFFF',
                  color: '#333',
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = '#B69349';
                  e.currentTarget.style.boxShadow = '0 0 0 3px rgba(182, 147, 73, 0.1)';
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(207, 178, 87, 0.2)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              />
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2" style={{ color: '#B69349' }}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
              </svg>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium" style={{ color: '#8B7355' }}>
              {filteredCategories.length} {filteredCategories.length === 1 ? t('categories.category') : t('categories.categories')}
            </span>
            {/* View Mode Toggle */}
            <div className="flex items-center gap-1 rounded-md p-1" style={{ border: '1px solid rgba(207, 178, 87, 0.2)' }}>
              <button
                onClick={() => setViewMode('grid')}
                className="p-2 rounded transition-colors"
                style={{
                  backgroundColor: viewMode === 'grid' ? '#B69349' : 'transparent',
                  color: viewMode === 'grid' ? '#fff' : '#8B7355',
                }}
                title="Grid View"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0112.75 6v2.25A2.25 2.25 0 0110.5 10.5H8.25a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
                </svg>
              </button>
              <button
                onClick={() => setViewMode('list')}
                className="p-2 rounded transition-colors"
                style={{
                  backgroundColor: viewMode === 'list' ? '#B69349' : 'transparent',
                  color: viewMode === 'list' ? '#fff' : '#8B7355',
                }}
                title="List View"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 6.75h12M8.25 12h12m-12 5.25h12M3.75 6.75h.007v.008H3.75V6.75zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zM3.75 12h.007v.008H3.75V12zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zM3.75 17.25h.007v.008H3.75v-.008zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Categories Grid/List */}
        {isLoading ? (
          <div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6' : 'space-y-4'}>
            <SkeletonLoader type="category" count={6} />
          </div>
        ) : filteredCategories.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-32 rounded-2xl" style={{ backgroundColor: '#F5F0E1', border: '1px solid rgba(207, 178, 87, 0.15)' }}>
            <div className="w-24 h-24 rounded-full flex items-center justify-center mb-6" style={{ backgroundColor: 'rgba(182, 147, 73, 0.1)' }}>
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-12 h-12" style={{ color: '#B69349' }}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
              </svg>
            </div>
            <h3 className="text-2xl font-heading font-bold mb-3" style={{ color: '#333' }}>{t('categories.no_categories_found')}</h3>
            <p className="mb-2 text-center max-w-md" style={{ color: '#8B7355' }}>
              {searchQuery ? t('categories.try_adjusting_search') : t('categories.no_categories_available')}
            </p>
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="px-6 py-2.5 text-white rounded-full text-sm font-medium transition-colors mt-4 hover:shadow-md"
                style={{ backgroundColor: '#B69349' }}
              >
                {t('categories.clear_search')}
              </button>
            )}
          </div>
        ) : viewMode === 'grid' ? (
          <div
            data-section-id="categories-grid"
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5"
          >
            {filteredCategories.map((category, index) => (
              <Link
                key={category.id}
                href={`/shop?category=${category.slug}`}
                className="group block"
                style={{ transitionDelay: `${index * 50}ms` }}
              >
                <div
                  className="overflow-hidden rounded-xl transition-all duration-300 hover:-translate-y-1 hover:shadow-lg"
                  style={{
                    backgroundColor: '#FFFFFF',
                    border: '1px solid rgba(207, 178, 87, 0.12)',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = 'rgba(182, 147, 73, 0.35)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = 'rgba(207, 178, 87, 0.12)';
                  }}
                >
                  <div className="relative aspect-[4/5] w-full overflow-hidden" style={{ backgroundColor: '#F5F0E1' }}>
                    {category.imageUrl ? (
                      <Image
                        src={category.imageUrl}
                        alt={getCategoryName(category as unknown as import('@/lib/firestore/categories').Category, languageCode)}
                        fill
                        className="object-cover group-hover:scale-110 transition-transform duration-700"
                        sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                        quality={85}
                        loading="lazy"
                        unoptimized
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center" style={{ color: '#B69349' }}>
                        <span className="text-sm uppercase tracking-widest">No Image</span>
                      </div>
                    )}
                  </div>
                  <div className="p-5">
                    <h2 className="text-lg md:text-xl font-heading font-bold mb-2 transition-colors leading-tight" style={{ color: '#333' }}>
                      {getCategoryName(category as unknown as import('@/lib/firestore/categories').Category, languageCode)}
                    </h2>
                    {getCategoryDescription(category as unknown as import('@/lib/firestore/categories').Category, languageCode) && (
                      <p className="text-sm line-clamp-2 leading-relaxed" style={{ color: '#8B7355' }}>
                        {getCategoryDescription(category as unknown as import('@/lib/firestore/categories').Category, languageCode)}
                      </p>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div
            data-section-id="categories-list"
            className="space-y-3"
          >
            {filteredCategories.map((category) => (
              <Link
                key={category.id}
                href={`/shop?category=${category.slug}`}
                className="group block"
              >
                <div
                  className="flex gap-5 rounded-xl p-5 transition-all duration-300 hover:shadow-md"
                  style={{
                    backgroundColor: '#FFFFFF',
                    border: '1px solid rgba(207, 178, 87, 0.12)',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = 'rgba(182, 147, 73, 0.35)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = 'rgba(207, 178, 87, 0.12)';
                  }}
                >
                  <div className="relative w-28 h-28 md:w-36 md:h-36 flex-shrink-0 rounded-lg overflow-hidden" style={{ backgroundColor: '#F5F0E1' }}>
                    {category.imageUrl ? (
                      <Image
                        src={category.imageUrl}
                        alt={getCategoryName(category as unknown as import('@/lib/firestore/categories').Category, languageCode)}
                        fill
                        className="object-cover group-hover:scale-110 transition-transform duration-700"
                        sizes="(max-width: 768px) 112px, 144px"
                        quality={85}
                        loading="lazy"
                        unoptimized
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center" style={{ color: '#B69349' }}>
                        <span className="text-xs uppercase">No Image</span>
                      </div>
                    )}
                  </div>
                  <div className="flex-1 flex flex-col justify-center">
                    <h2 className="text-lg md:text-xl font-heading font-bold mb-2 transition-colors leading-tight" style={{ color: '#333' }}>
                      {getCategoryName(category as unknown as import('@/lib/firestore/categories').Category, languageCode)}
                    </h2>
                    {getCategoryDescription(category as unknown as import('@/lib/firestore/categories').Category, languageCode) && (
                      <p className="text-sm line-clamp-2 leading-relaxed" style={{ color: '#8B7355' }}>
                        {getCategoryDescription(category as unknown as import('@/lib/firestore/categories').Category, languageCode)}
                      </p>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}

        {/* Section Divider */}
        <div className="h-px mt-12 mb-8" style={{ background: 'linear-gradient(to right, transparent, rgba(207, 178, 87, 0.2), transparent)' }} />
      </div>
    </div>
  );
};

export default CategoriesClient;
