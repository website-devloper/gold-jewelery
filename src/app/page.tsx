'use client';

import React, { useEffect, useState, useRef } from 'react';
import Image from "next/image";
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { Timestamp } from 'firebase/firestore';
import { getAllBanners } from '@/lib/firestore/banners_db';
import { Banner } from '@/lib/firestore/banners';
import { getAllProducts } from '@/lib/firestore/products_db';
import { getAllCategories } from '@/lib/firestore/categories_db';
import { getAllCollections } from '@/lib/firestore/collections_db';
import { Product } from '@/lib/firestore/products';
import { Category } from '@/lib/firestore/categories';
import { Collection } from '@/lib/firestore/collections';
import { generateSlug } from '@/lib/utils/slug';
import { useLanguage } from '../context/LanguageContext';
import { getProductName, getCategoryName, getCollectionName } from '@/lib/utils/translations';
import { useCurrency } from '../context/CurrencyContext';
import { useSettings } from '../context/SettingsContext';
import { getAllFlashSales } from '@/lib/firestore/campaigns_db';
import { FlashSale } from '@/lib/firestore/campaigns';
import { getAllProductBundles } from '@/lib/firestore/product_bundles_db';
import { ProductBundle } from '@/lib/firestore/product_bundles';
import { getReviewsByProductId, getAllReviews } from '@/lib/firestore/reviews_enhanced_db';
import type { Review } from '@/lib/firestore/reviews_enhanced';
import { useCart } from '../context/CartContext';
import QuickViewModal from '../components/QuickViewModal';
import { getColors } from '@/lib/firestore/attributes_db';
import { Color } from '@/lib/firestore/attributes';
import { getColorName } from '@/lib/utils/translations';
import CountdownTimer from '../components/CountdownTimer';
import { getAllPosts } from '@/lib/firestore/blog_db';
import { BlogPost } from '@/lib/firestore/blog';
import { addNewsletterSubscription } from '@/lib/firestore/newsletter_db';
import SkeletonLoader from '../components/SkeletonLoader';
import MobileStickyCart from '../components/MobileStickyCart';
import BackToTop from '../components/BackToTop';
import ProductComparison from '../components/ProductComparison';
import { getRecentlyViewed } from '@/lib/firestore/product_features_db';
import { useAuth } from '../context/AuthContext';
import { getPageBySlug } from '@/lib/firestore/pages_db';

export default function Home() {
  const { t, currentLanguage } = useLanguage();
  const { formatPrice } = useCurrency();
  const { settings } = useSettings();
  const languageCode = currentLanguage?.code || 'en';
  const [banners, setBanners] = useState<Banner[]>([]);
  const [isMobile, setIsMobile] = useState(false);
  const [currentBannerIndex, setCurrentBannerIndex] = useState(0);
  const [featuredProducts, setFeaturedProducts] = useState<Product[]>([]);
  const [popularProducts, setPopularProducts] = useState<Product[]>([]);
  const [latestProducts, setLatestProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFlashSales, setActiveFlashSales] = useState<FlashSale[]>([]);
  const [flashSaleProducts, setFlashSaleProducts] = useState<Product[]>([]);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [activeBundles, setActiveBundles] = useState<ProductBundle[]>([]);
  const [reviewStats, setReviewStats] = useState<Record<string, { averageRating: number; reviewCount: number }>>({});
  const [quickViewProduct, setQuickViewProduct] = useState<Product | null>(null);
  const [colors, setColors] = useState<Color[]>([]);
  const [testimonials, setTestimonials] = useState<Review[]>([]);
  const [featuredBlogPosts, setFeaturedBlogPosts] = useState<BlogPost[]>([]);
  const [newsletterEmail, setNewsletterEmail] = useState('');
  const [newsletterLoading, setNewsletterLoading] = useState(false);
  const [newsletterSuccess, setNewsletterSuccess] = useState(false);
  const [currentTestimonialIndex, setCurrentTestimonialIndex] = useState(0);
  const [, setVisibleSections] = useState<Set<string>>(new Set(['hero'])); // Hero is visible by default
  const [recentlyViewedProducts, setRecentlyViewedProducts] = useState<Product[]>([]);
  const [comparisonProducts, setComparisonProducts] = useState<Product[]>([]);
  const { user, demoUser } = useAuth();
  const { addToCart, setShowCartDialog, setCartDialogMessage } = useCart();

  useEffect(() => {
    // Detect mobile device
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Intersection Observer for scroll animations
  useEffect(() => {
    // Make all sections visible initially, then add animations
    const allSections = document.querySelectorAll('[data-section-id]');
    const allSectionIds = Array.from(allSections).map(section => section.getAttribute('data-section-id')).filter(Boolean) as string[];
    setVisibleSections(new Set(allSectionIds));

    const observerOptions = {
      root: null,
      rootMargin: '-50px 0px',
      threshold: 0.01,
    };

    const observerCallback = (entries: IntersectionObserverEntry[]) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const sectionId = entry.target.getAttribute('data-section-id');
          if (sectionId) {
            setVisibleSections((prev) => new Set(prev).add(sectionId));
          }
        }
      });
    };

    const observer = new IntersectionObserver(observerCallback, observerOptions);

    // Use setTimeout to ensure DOM is ready
    setTimeout(() => {
      const sections = document.querySelectorAll('[data-section-id]');
      sections.forEach((section) => observer.observe(section));
    }, 100);

    return () => {
      const sections = document.querySelectorAll('[data-section-id]');
      sections.forEach((section) => observer.unobserve(section));
    };
  }, [loading]); // Re-run when loading completes

  // Auto-rotate banners
  useEffect(() => {
    if (banners.length <= 1) return;

    const interval = setInterval(() => {
      setCurrentBannerIndex((prev) => (prev === banners.length - 1 ? 0 : prev + 1));
    }, 5000); // Change banner every 5 seconds

    return () => clearInterval(interval);
  }, [banners.length]);

  useEffect(() => {
    getColors().then(setColors).catch(() => {
      // Failed to fetch colors
    });
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [fetchedBanners, fetchedProducts, fetchedCategories, flashSales, fetchedCollections, fetchedBundles] = await Promise.all([
          getAllBanners(),
          getAllProducts(),
          getAllCategories(),
          getAllFlashSales(true),
          getAllCollections(),
          settings?.features?.productBundles ? getAllProductBundles(true) : Promise.resolve([])
        ]);

        // Banners - Hardcoded with provided luxury images
        const nowTimestamp = Timestamp.now();
        const customBanners: Banner[] = [
          {
            id: 'custom-banner-1',
            imageUrl: '/images/hero/3.jpg',
            deviceType: 'both',
            isActive: true,
            order: 1,
            title: ' ', // Suppress fallback text as image has its own text
            subtitle: ' ',
            titleColor: '#ECDC94',
            subtitleColor: '#FFF8EE',
            linkTo: '/shop',
            createdAt: nowTimestamp,
            updatedAt: nowTimestamp
          },
          {
            id: 'custom-banner-2',
            imageUrl: '/images/hero/1.jpg',
            deviceType: 'both',
            isActive: true,
            order: 2,
            title: ' ',
            subtitle: ' ',
            titleColor: '#ECDC94',
            subtitleColor: '#FFF8EE',
            linkTo: '/shop',
            createdAt: nowTimestamp,
            updatedAt: nowTimestamp
          },
          {
            id: 'custom-banner-3',
            imageUrl: '/images/hero/2.jpg',
            deviceType: 'both',
            isActive: true,
            order: 3,
            title: ' ',
            subtitle: ' ',
            titleColor: '#ECDC94',
            subtitleColor: '#FFF8EE',
            linkTo: '/shop',
            createdAt: nowTimestamp,
            updatedAt: nowTimestamp
          }
        ];

        setBanners(customBanners);

        // Products - ensure all have slugs
        const activeProducts = fetchedProducts
          .filter(p => p.isActive)
          .map(p => ({
            ...p,
            slug: p.slug || generateSlug(p.name || `product-${p.id}`)
          }));

        setAllProducts(activeProducts);

        // Featured Products
        setFeaturedProducts(activeProducts.filter(p => p.isFeatured).slice(0, 8));

        // Popular Products - Sort by views (analytics.views) or purchases, fallback to featured
        const popular = [...activeProducts].sort((a, b) => {
          const aViews = a.analytics?.views || 0;
          const bViews = b.analytics?.views || 0;
          const aPurchases = a.analytics?.purchases || 0;
          const bPurchases = b.analytics?.purchases || 0;
          // Sort by views first, then by purchases
          if (bViews !== aViews) return bViews - aViews;
          return bPurchases - aPurchases;
        }).slice(0, 8);
        setPopularProducts(popular);

        // Latest Products - Sort by createdAt (newest first)
        const latest = [...activeProducts].sort((a, b) => {
          const aDate = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : 0;
          const bDate = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : 0;
          return bDate - aDate;
        }).slice(0, 8);
        setLatestProducts(latest);

        // Categories - get only top-level categories for homepage
        const topLevelCategories = fetchedCategories.filter(c => !c.parentCategory);
        setCategories(topLevelCategories);

        // Collections - get only top-level collections (no parent)
        const topLevelCollections = fetchedCollections.filter(c => !c.parentCollection);
        setCollections(topLevelCollections);

        // Flash Sales - filter by current time
        const now = new Date();
        const validFlashSales = flashSales.filter(sale => {
          if (!sale.isActive) return false;
          const startTime = sale.startTime?.toDate ? sale.startTime.toDate() : new Date(0);
          const endTime = sale.endTime?.toDate ? sale.endTime.toDate() : new Date(0);
          return now >= startTime && now <= endTime;
        });
        setActiveFlashSales(validFlashSales);

        // Get Flash Sale products
        if (validFlashSales.length > 0) {
          const flashSaleProductIds = new Set<string>();
          validFlashSales.forEach(sale => {
            sale.productIds.forEach(id => flashSaleProductIds.add(id));
          });
          const flashProducts = activeProducts.filter(p => flashSaleProductIds.has(p.id)).slice(0, 8);
          setFlashSaleProducts(flashProducts);
        }


        // Filter active bundles by validity dates
        if (settings?.features?.productBundles && fetchedBundles && fetchedBundles.length > 0) {
          const now = new Date();
          const validBundles = fetchedBundles.filter((bundle: ProductBundle) => {
            if (!bundle.isActive) return false;
            if (bundle.validFrom && bundle.validFrom.toDate && bundle.validFrom.toDate() > now) return false;
            if (bundle.validUntil && bundle.validUntil.toDate && bundle.validUntil.toDate() < now) return false;
            return true;
          });
          setActiveBundles(validBundles.slice(0, 6)); // Show max 6 bundles
        }
      } catch {
        // Failed to fetch data
      } finally {
        setLoading(false);
      }
    };
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMobile]);

  // Load review statistics (average rating + review count) for products used on the homepage
  useEffect(() => {
    if (!settings?.features?.productReviews) return;

    const allProducts: Product[] = [
      ...featuredProducts,
      ...popularProducts,
      ...latestProducts,
      ...flashSaleProducts,
    ];
    const uniqueProducts = Array.from(new Map(allProducts.map((p) => [p.id, p])).values());

    if (uniqueProducts.length === 0) return;

    const loadReviewStats = async () => {
      try {
        const entries = await Promise.all(
          uniqueProducts.map(async (product) => {
            try {
              const reviews: Review[] = await getReviewsByProductId(product.id);
              if (!reviews || reviews.length === 0) {
                return [product.id, { averageRating: 0, reviewCount: 0 }] as const;
              }

              const totalRating = reviews.reduce((sum, r) => sum + (r.rating || 0), 0);
              const averageRating = totalRating / reviews.length;

              return [product.id, { averageRating, reviewCount: reviews.length }] as const;
            } catch {
              // Failed to fetch reviews for this product
              return [product.id, { averageRating: 0, reviewCount: 0 }] as const;
            }
          })
        );

        const statsMap: Record<string, { averageRating: number; reviewCount: number }> = {};
        for (const [productId, stats] of entries) {
          statsMap[productId] = stats;
        }
        setReviewStats(statsMap);
      } catch {
        // Ignore review stats errors; homepage should still render
      }
    };

    loadReviewStats();
  }, [featuredProducts, popularProducts, latestProducts, flashSaleProducts, settings?.features?.productReviews]);

  // Load testimonials (reviews with rating >= 4)
  useEffect(() => {
    if (!settings?.features?.productReviews) return;

    const loadTestimonials = async () => {
      try {
        const allReviews = await getAllReviews(10, 4); // Get top 10 reviews with rating >= 4
        setTestimonials(allReviews);
      } catch {
        // Failed to load testimonials
      }
    };

    loadTestimonials();
  }, [settings?.features?.productReviews]);

  // Auto-rotate testimonials
  useEffect(() => {
    if (testimonials.length <= 1) return;

    const interval = setInterval(() => {
      setCurrentTestimonialIndex((prev) => (prev === testimonials.length - 1 ? 0 : prev + 1));
    }, 5000); // Change testimonial every 5 seconds

    return () => clearInterval(interval);
  }, [testimonials.length]);

  // Load featured blog posts
  useEffect(() => {
    if (!settings?.features?.blog) return;

    const loadBlogPosts = async () => {
      try {
        const posts = await getAllPosts(true); // Only published posts
        setFeaturedBlogPosts(posts.slice(0, 3)); // Show top 3
      } catch {
        // Failed to load blog posts
      }
    };

    loadBlogPosts();
  }, [settings?.features?.blog]);

  // Load recently viewed products
  useEffect(() => {
    const userId = user?.uid || (settings?.demoMode && demoUser ? 'demo-user' : null);
    if (!userId) return;

    const loadRecentlyViewed = async () => {
      try {
        const products = await getRecentlyViewed(userId, 8);
        setRecentlyViewedProducts(products);
      } catch {
        // Failed to load recently viewed
      }
    };

    loadRecentlyViewed();
  }, [user, demoUser, settings?.demoMode]);

  // Load comparison products from localStorage
  useEffect(() => {
    const loadComparison = () => {
      try {
        const stored = localStorage.getItem('productComparison');
        if (stored) {
          const productIds: string[] = JSON.parse(stored);
          // Load products by IDs
          const loadProducts = async () => {
            const allProducts = await getAllProducts();
            const comparison = allProducts.filter(p => productIds.includes(p.id));
            setComparisonProducts(comparison);
          };
          loadProducts();
        }
      } catch {
        // Failed to load comparison
      }
    };

    loadComparison();
  }, []);

  // Load info pages (About, Shipping, FAQ)
  useEffect(() => {
    const loadInfoPages = async () => {
      try {
        await Promise.all([
          settings?.pages?.aboutUs ? getPageBySlug('about').catch(() => null) : Promise.resolve(null),
          settings?.pages?.shippingReturns ? getPageBySlug('shipping').catch(() => null) : Promise.resolve(null),
          settings?.pages?.faqs ? getPageBySlug('faq').catch(() => null) : Promise.resolve(null),
        ]);
      } catch {
        // Failed to load pages
      }
    };

    loadInfoPages();
  }, [settings?.pages]);

  const handleAddToComparison = (product: Product) => {
    const maxComparison = 4;
    if (comparisonProducts.length >= maxComparison) {
      setCartDialogMessage(t('product.comparison_limit') || `Maximum ${maxComparison} products can be compared`);
      setShowCartDialog(true);
      return;
    }

    if (comparisonProducts.some(p => p.id === product.id)) {
      setCartDialogMessage(t('product.already_in_comparison') || 'المنتج موجود بالفعل في المقارنة');
      setShowCartDialog(true);
      return;
    }

    const updated = [...comparisonProducts, product];
    setComparisonProducts(updated);
    localStorage.setItem('productComparison', JSON.stringify(updated.map(p => p.id)));
    setCartDialogMessage(t('product.added_to_comparison') || 'تمت الإضافة للمقارنة');
    setShowCartDialog(true);
  };

  const handleRemoveFromComparison = (productId: string) => {
    const updated = comparisonProducts.filter(p => p.id !== productId);
    setComparisonProducts(updated);
    localStorage.setItem('productComparison', JSON.stringify(updated.map(p => p.id)));
  };

  const handleClearComparison = () => {
    setComparisonProducts([]);
    localStorage.removeItem('productComparison');
  };

  const handleNewsletterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newsletterEmail || newsletterLoading) return;

    setNewsletterLoading(true);
    try {
      await addNewsletterSubscription({
        email: newsletterEmail,
        source: 'homepage',
      });
      setNewsletterSuccess(true);
      setNewsletterEmail('');
      setTimeout(() => setNewsletterSuccess(false), 3000);
    } catch {
      // Failed to subscribe
    } finally {
      setNewsletterLoading(false);
    }
  };


  if (loading) {
    return (
      <div className="min-h-screen pb-20" style={{ backgroundColor: '#FFF8EE' }}>
        {/* Hero Skeleton */}
        <div className="relative w-full h-[85vh] min-h-[600px] animate-pulse" style={{ backgroundColor: '#F5E6C8' }} />

        {/* Trust Badges Skeleton */}
        <section className="py-6 md:py-8" style={{ backgroundColor: '#FFFDF9', borderBottom: '1px solid rgba(207,178,87,0.1)' }}>
          <div className="page-container">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-8">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex flex-col md:flex-row items-center gap-3">
                  <div className="w-12 h-12 md:w-14 md:h-14 rounded-full" style={{ backgroundColor: '#F5E6C8' }} />
                  <div className="space-y-2 flex-1">
                    <div className="h-4 rounded w-24" style={{ backgroundColor: '#F5E6C8' }} />
                    <div className="h-3 rounded w-32" style={{ backgroundColor: '#F5E6C8' }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Products Skeleton */}
        <section className="page-container py-20">
          <div className="mb-10 md:mb-12">
            <div className="h-8 rounded w-64 mb-3" style={{ backgroundColor: '#F5E6C8' }} />
            <div className="h-5 rounded w-48" style={{ backgroundColor: '#F5E6C8' }} />
          </div>
          <div className="hidden md:grid md:grid-cols-4 gap-6 md:gap-8">
            <SkeletonLoader type="product" count={4} />
          </div>
          <div className="md:hidden overflow-x-auto pb-4 -mx-4 px-4">
            <div className="flex gap-4" style={{ width: 'max-content' }}>
              <SkeletonLoader type="product" count={4} />
            </div>
          </div>
        </section>
      </div>
    );
  }

  const ProductCard = ({ product }: { product: Product }) => {
    const categoryName = categories.find(c => c.id === product.category)?.name;
    const [isInWishlist, setIsInWishlist] = useState(false);
    const [hoveredColor, setHoveredColor] = useState<string | null>(null);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
      setMounted(true);
      const stored = localStorage.getItem('wishlist');
      if (stored) {
        const wishlistItems = JSON.parse(stored);
        setIsInWishlist(wishlistItems.some((item: { id: string }) => item.id === product.id));
      }
    }, [product.id]);

    const getStockStatus = () => {
      if (product.variants && product.variants.length > 0) {
        const totalStock = product.variants.reduce((sum, v) => sum + v.stock, 0);
        if (totalStock > 10) return { status: 'in_stock', text: t('product.in_stock') || 'متوفر', color: 'bg-green-500' };
        if (totalStock > 0) return { status: 'low_stock', text: t('product.low_stock') || 'كمية محدودة', color: 'bg-yellow-500' };
        return { status: 'out_of_stock', text: t('product.out_of_stock') || 'نفذت الكمية', color: 'bg-red-500' };
      }
      return { status: 'in_stock', text: t('product.in_stock') || 'متوفر', color: 'bg-green-500' };
    };

    const stockInfo = getStockStatus();
    const isNew = product.createdAt && product.createdAt.toDate && (Date.now() - product.createdAt.toDate().getTime()) < 30 * 24 * 60 * 60 * 1000;
    const isOnSale = !!product.salePrice;
    const isBestSeller = (product.analytics?.purchases || 0) > 50;

    const colorVariants = product.variants?.filter(v => v.name.toLowerCase() === 'color') || [];
    const displayImage = hoveredColor && colorVariants.length > 0
      ? colorVariants.find(v => v.value.toLowerCase() === hoveredColor.toLowerCase())?.imageUrl || product.images?.[0]
      : product.images?.[0];

    const handleToggleWishlist = (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (!mounted) return;

      const stored = localStorage.getItem('wishlist');
      let wishlistItems: Array<{ id: string; name: string; price: number; image?: string; inStock: boolean; slug?: string }> = stored ? JSON.parse(stored) : [];

      const productItem = {
        id: product.id,
        name: getProductName(product, languageCode),
        price: product.salePrice || product.price,
        image: product.images?.[0],
        inStock: stockInfo.status !== 'out_of_stock',
        slug: product.slug,
      };

      if (isInWishlist) {
        wishlistItems = wishlistItems.filter(item => item.id !== product.id);
        setIsInWishlist(false);
      } else {
        wishlistItems.push(productItem);
        setIsInWishlist(true);
      }

      localStorage.setItem('wishlist', JSON.stringify(wishlistItems));
    };

    const handleQuickView = (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setQuickViewProduct(product);
    };

    const handleQuickAdd = (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (stockInfo.status === 'out_of_stock') return;
      addToCart(product, 1);
      setCartDialogMessage(t('cart.added_to_cart') || 'تمت الإضافة للسلة');
      setShowCartDialog(true);
    };

    return (
      <>
        <div className="lux-card group relative flex flex-col h-full">
          {/* Main Product Link */}
          <Link
            href={`/products/${product.slug}`}
            className="absolute inset-0 z-10"
            aria-label={t('home.view_product', { name: getProductName(product, languageCode) }) || `View product: ${getProductName(product, languageCode)}`}
            onClick={async () => {
              try {
                const { incrementProductClick } = await import('@/lib/firestore/products_db');
                await incrementProductClick(product.id);
              } catch {
                // Failed to track click
              }
            }}
          />

          {/* Badges — top */}
          <div className="absolute top-0 right-0 z-20 flex flex-col">
            {isNew && (
              <span className="text-[12px] font-black px-4 py-3 uppercase tracking-widest bg-white text-[color:var(--brown-deep)] shadow-sm">
                {t('product.badge_new') || 'جديد'}
              </span>
            )}
            {isOnSale && (
              <span className="text-[12px] font-black px-4 py-3 uppercase tracking-widest text-white shadow-sm" style={{ backgroundColor: '#CFB257' }}>
                {t('product.badge_sale') || 'تخفيض'}
              </span>
            )}
            {isBestSeller && (
              <span className="text-[12px] font-black px-4 py-3 uppercase tracking-widest text-[color:var(--gold-primary)] shadow-sm" style={{ backgroundColor: '#2A241F' }}>
                {t('product.badge_best_seller') || 'الأكثر مبيعاً'}
              </span>
            )}
          </div>

          {/* Stock badge — top-right */}
          {stockInfo.status !== 'in_stock' && (
            <div className="absolute top-4 right-4 z-20">
              <span className={`${stockInfo.color} text-white text-[10px] font-bold px-3 py-1.5 uppercase tracking-widest shadow-sm`}>
                {stockInfo.text}
              </span>
            </div>
          )}

          {/* ── Image Area ── */}
          <div className="relative aspect-square w-full overflow-hidden bg-[#FDFBF7]">
            {displayImage ? (
              <Image
                src={displayImage}
                alt={getProductName(product, languageCode) || 'المنتج'}
                fill
                className="lux-img-primary object-cover object-center"
                sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
                unoptimized
                quality={90}
                loading="lazy"
              />
            ) : (
              <div className="flex h-full items-center justify-center text-gray-200">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={0.5} stroke="currentColor" className="w-16 h-16">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                </svg>
              </div>
            )}

            {/* Dark overlay on hover */}
            <div className="absolute inset-0 bg-black/10 transition-opacity duration-300 opacity-0 group-hover:opacity-100 pointer-events-none" />

            {/* ★ Right-side square action buttons */}
            <div className="absolute top-0 left-0 z-30 flex flex-col transition-all duration-500 opacity-0 translate-x-4 group-hover:translate-x-0 group-hover:opacity-100">
              {/* Add to Cart */}
              <button
                onClick={handleQuickAdd}
                disabled={stockInfo.status === 'out_of_stock'}
                className="w-14 h-14 flex items-center justify-center transition-colors disabled:opacity-40 disabled:cursor-not-allowed hover:brightness-90"
                style={{ backgroundColor: '#CFB257', color: '#2A241F' }}
                title={t('product.quick_add') || 'إضافة للحقيبة'}
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 1 0-7.5 0v4.5m11.356-1.993 1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 0 1-1.12-1.243l1.264-12A1.125 1.125 0 0 1 5.513 7.5h12.974c.576 0 1.059.435 1.119 1.007ZM8.625 10.5a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm7.5 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
                </svg>
              </button>
              {/* Quick View */}
              <button
                onClick={handleQuickView}
                className="w-14 h-14 flex items-center justify-center transition-colors hover:brightness-90"
                style={{ backgroundColor: '#D4B962', color: '#2A241F' }}
                title={t('product.quick_view') || 'نظرة سريعة'}
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                </svg>
              </button>
              {/* Wishlist */}
              {settings?.features?.wishlist && (
                <button
                  onClick={handleToggleWishlist}
                  className="w-14 h-14 flex items-center justify-center transition-colors hover:brightness-90"
                  style={{ backgroundColor: '#DECA7A', color: '#2A241F' }}
                  title={isInWishlist ? (t('product.remove_from_wishlist') || 'إزالة من المفضلة') : (t('product.add_to_wishlist') || 'إضافة للمفضلة')}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill={isInWishlist ? 'currentColor' : 'none'} viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12Z" />
                  </svg>
                </button>
              )}
            </div>
          </div>

          {/* ★ Solid Gold "Add to Bag" bar beneath image */}
          <button
            onClick={handleQuickAdd}
            disabled={stockInfo.status === 'out_of_stock'}
            className="w-full py-4 px-4 text-center font-bold text-sm md:text-base tracking-wide transition-colors disabled:opacity-40 disabled:cursor-not-allowed hover:brightness-95"
            style={{ backgroundColor: '#CFB257', color: '#2A241F' }}
          >
            {t('products.add_to_cart') || 'أضف إلى السلة'}
          </button>

          {/* ── Card Info ── */}
          <div className="px-5 py-6 md:px-6 md:py-8 flex flex-col flex-1 bg-white items-center text-center relative z-20" style={{ border: '1px solid #CFB257', borderTop: 'none' }}>
            <span className="text-base md:text-lg font-black font-heading mb-3" style={{ color: '#4A3D30' }}>
              {categoryName || t('shop.collection_fallback') || 'مجموعة'}
            </span>

            <h3 className="text-2xl md:text-3xl font-heading font-black mb-4 line-clamp-2 transition-colors duration-300 group-hover:text-[color:var(--gold-primary)]" style={{ color: 'var(--brown-deep)', lineHeight: '1.4' }}>
              {getProductName(product, languageCode)}
            </h3>

            {/* Solid gold divider */}
            <div className="w-16 h-[2px] mb-5 mx-auto" style={{ backgroundColor: '#CFB257' }} />

            <div className="mt-auto flex flex-col items-center gap-2 w-full">
              <div className="flex items-center gap-3 justify-center" dir="ltr">
                <span className="text-2xl md:text-3xl font-black tracking-wide font-heading" style={{ color: 'var(--brown-deep)' }}>
                  {formatPrice(product.salePrice || product.price)}
                </span>
                {product.salePrice && (
                  <span className="text-sm md:text-base text-gray-500 line-through tracking-wider font-heading mt-1">
                    {formatPrice(product.price)}
                  </span>
                )}
              </div>

              {colorVariants.length > 0 && (
                <div className="flex -space-x-1 overflow-hidden mt-1">
                  {colorVariants.slice(0, 4).map((variant) => {
                    const color = colors.find(c => c.name.toLowerCase() === variant.value.toLowerCase());
                    return (
                      <div
                        key={variant.id}
                        className="w-4 h-4 rounded-full shadow-sm ring-2 ring-white transition-transform hover:scale-125"
                        style={{ backgroundColor: color?.hexCode || '#ccc' }}
                        onMouseEnter={() => setHoveredColor(variant.value)}
                        onMouseLeave={() => setHoveredColor(null)}
                      />
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </>
    );
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const getSectionClasses = (_sectionId?: string) => {
    // Always visible, animation is optional enhancement
    return 'transition-all duration-1000 ease-out opacity-100 translate-y-0';
  };

  return (
    <div className="min-h-screen pb-20" style={{ backgroundColor: '#FFF8EE' }}>

      {/* 1. Static Hero Section */}
      <section
        data-section-id="hero"
        className={`w-full bg-[#FCF8EE] ${getSectionClasses('hero')} mb-2`}
      >
        <div className="w-full max-w-[1920px] mx-auto">
          <Image
            src="/images/hero/4.png"
            alt="أناقة ذهبية خالدة"
            width={1920}
            height={800}
            className="w-full h-auto object-cover object-center"
            priority
            unoptimized
          />
        </div>
      </section>

      {/* Trust Badges Section - Full Width
      <section
        data-section-id="trust-badges"
        className={`w-full py-16 md:py-20 luxury-bg-dark ${getSectionClasses('trust-badges')}`}
      >
        <div className="page-container">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-8">
            {[
              { icon: '🚚', title: t('home.trust_free_shipping') || 'شحن مجاني', desc: t('home.trust_free_shipping_desc') || 'للطلبات فوق 100$' },
              { icon: '🛡️', title: t('home.trust_secure_payment') || 'دفع آمن', desc: t('home.trust_secure_payment_desc') || 'إتمام شراء آمن 100%' },
              { icon: '✨', title: t('home.trust_authentic') || 'منتجات أصلية', desc: t('home.trust_authentic_desc') || 'منتجات أصلية 100%' },
              { icon: '↩️', title: t('home.trust_easy_returns') || 'إرجاع سهل', desc: t('home.trust_easy_returns_desc') || 'سياسة إرجاع خلال 30 يوماً' },
            ].map((badge, i) => (
              <div key={i} className="flex flex-col md:flex-row items-center gap-3 text-center md:text-left p-5 rounded-2xl transition-all duration-300 hover:scale-105" style={{ backgroundColor: 'rgba(207,178,87,0.08)', border: '1px solid rgba(207,178,87,0.12)' }}>
                <div className="w-12 h-12 md:w-14 md:h-14 rounded-full flex items-center justify-center flex-shrink-0 text-2xl" style={{ backgroundColor: 'rgba(207,178,87,0.12)' }}>
                  {badge.icon}
                </div>
                <div>
                  <p className="text-sm md:text-base font-semibold mb-1" style={{ color: '#ECDC94' }}>
                    {badge.title}
                  </p>
                  <p className="text-xs md:text-sm" style={{ color: 'rgba(245,230,200,0.5)' }}>
                    {badge.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section> */}

      {/* 5. Shop by Category — Enhanced Carousel with Luxury Cards */}
      {categories.length > 0 && (
        <section
          data-section-id="categories"
          className={`w-full py-16 md:py-24 luxury-bg-offwhite ${getSectionClasses('categories')}`}
        >
          <div className="page-container px-4">
            {/* Header for categories */}
            <div className="flex flex-col md:flex-row justify-between items-center md:items-end mb-12 md:mb-16 gap-6 md:gap-0">
              <div className="text-center md:text-right w-full md:w-auto">
                <div className="mb-4 hidden md:block" style={{ width: '40px', height: '1.5px', backgroundColor: 'var(--gold-primary)' }}></div>
                <h2 className="text-4xl md:text-5xl lg:text-6xl font-heading font-bold" style={{ color: 'var(--brown-deep)' }}>
                  {t('nav.categories') || 'الفئات'}
                </h2>
                <div className="mt-2 text-sm uppercase tracking-[0.2em] font-medium" style={{ color: 'var(--gold-primary)' }}>
                  {t('home.explore_collections') || 'استكشف عوالمنا'}
                </div>
              </div>

              <div className="flex items-center gap-6">
                <Link
                  href="/categories"
                  className="text-xs font-bold uppercase tracking-[0.15em] pb-1.5 transition-all duration-300 hover:text-[color:var(--gold-primary)]"
                  style={{ color: 'var(--brown-medium)', borderBottom: '1.5px solid rgba(207, 178, 87, 0.3)' }}
                >
                  {t('common.view_all') || 'عرض الكل'}
                </Link>

                {/* Navigation Controls */}
                <div className="hidden md:flex items-center gap-3">
                  <button
                    onClick={() => {
                      const container = document.getElementById('category-carousel');
                      if (container) container.scrollBy({ left: languageCode === 'ar' ? 340 : -340, behavior: 'smooth' });
                    }}
                    className="w-12 h-12 rounded-full border border-[color:var(--gold-muted)] flex items-center justify-center text-[color:var(--brown-deep)] hover:bg-[color:var(--gold-primary)] hover:border-[color:var(--gold-primary)] hover:text-white transition-all duration-300"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={`w-5 h-5 ${languageCode === 'ar' ? 'rotate-180' : ''}`}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
                    </svg>
                  </button>
                  <button
                    onClick={() => {
                      const container = document.getElementById('category-carousel');
                      if (container) container.scrollBy({ left: languageCode === 'ar' ? -340 : 340, behavior: 'smooth' });
                    }}
                    className="w-12 h-12 rounded-full border border-[color:var(--gold-muted)] flex items-center justify-center text-[color:var(--brown-deep)] hover:bg-[color:var(--gold-primary)] hover:border-[color:var(--gold-primary)] hover:text-white transition-all duration-300"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={`w-5 h-5 ${languageCode === 'ar' ? 'rotate-180' : ''}`}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>

            {/* Draggable Carousel */}
            <div
              id="category-carousel"
              className="overflow-x-auto pb-8 -mx-4 px-4 scrollbar-hide select-none"
              style={{ scrollSnapType: 'x mandatory', WebkitOverflowScrolling: 'touch' }}
            >
              <motion.div
                className="flex gap-5 md:gap-8"
                style={{ width: 'max-content' }}
                initial={false}
              >
                {categories.slice(0, 10).map((category, index) => (
                  <motion.div
                    key={category.id}
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: index * 0.08, duration: 0.7, ease: [0.25, 0.46, 0.45, 0.94] }}
                  >
                    <Link
                      href={`/shop?category=${category.slug}`}
                      className="cat-card group block flex-shrink-0 w-[260px] md:w-[300px] lg:w-[340px] relative pb-12"
                      style={{ scrollSnapAlign: 'start' }}
                    >
                      {/* Decorative corners */}
                      <div className="cat-corner-tl" />
                      <div className="cat-corner-br" />

                      {/* Tall Image Card */}
                      <div className="relative aspect-[4/5] w-full overflow-hidden" style={{ boxShadow: '0 8px 30px -10px rgba(42, 36, 31, 0.15)' }}>
                        {category.imageUrl ? (
                          <Image
                            src={category.imageUrl}
                            alt={getCategoryName(category, languageCode)}
                            fill
                            className="object-cover transition-transform duration-[2s] ease-out group-hover:scale-110"
                            sizes="(max-width: 768px) 260px, (max-width: 1024px) 300px, 340px"
                            unoptimized
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center" style={{ backgroundColor: '#F3EDE0' }}>
                            <span className="text-xs uppercase tracking-widest" style={{ color: '#A88F44' }}>—</span>
                          </div>
                        )}

                        {/* Subtle hover gradient */}
                        <div
                          className="absolute inset-0 z-10 transition-opacity duration-700 opacity-0 group-hover:opacity-100 pointer-events-none"
                          style={{ background: 'linear-gradient(to top, rgba(42, 36, 31, 0.35) 0%, transparent 50%)' }}
                        />
                      </div>

                      {/* AlSaab Gold Block Label Overlay */}
                      <div
                        className="absolute bottom-5 left-5 right-5 z-20 transition-all duration-500 group-hover:-translate-y-2"
                        style={{
                          backgroundColor: '#E7D08A',
                          boxShadow: '0 6px 25px rgba(0,0,0,0.08)',
                        }}
                      >
                        <div className="px-5 py-4 md:px-6 md:py-5">
                          {/* Category name with decorative dots */}
                          <h3 className="text-center font-heading font-bold text-xl md:text-2xl leading-tight" style={{ color: '#2A241F' }}>
                            <span className="opacity-50 text-base mx-1.5" style={{ color: '#A88F44' }}>✦</span>
                            {getCategoryName(category, languageCode)}
                            <span className="opacity-50 text-base mx-1.5" style={{ color: '#A88F44' }}>✦</span>
                          </h3>

                          {/* Explore CTA — reveals on hover */}
                          <div className="overflow-hidden transition-all duration-500 max-h-0 group-hover:max-h-10 opacity-0 group-hover:opacity-100">
                            <div className="flex items-center justify-center gap-2 mt-2.5 pt-2.5" style={{ borderTop: '1px solid rgba(42, 36, 31, 0.12)' }}>
                              <span className="text-[10px] font-bold uppercase tracking-[0.2em]" style={{ color: '#2A241F' }}>
                                {t('home.explore_category') || 'استكشف الآن'}
                              </span>
                              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-3 h-3 cat-arrow-icon" style={{ color: '#2A241F' }}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                              </svg>
                            </div>
                          </div>
                        </div>
                      </div>
                    </Link>
                  </motion.div>
                ))}
              </motion.div>
            </div>
          </div>
        </section>
      )}

      {/* 2. Featured Products - Container with Asymmetric Grid */}
      {featuredProducts.length > 0 && (
        <section
          data-section-id="featured"
          className={`py-14 md:py-20 bg-[#FFFFFF] ${getSectionClasses('featured')}`}
        >
          <div className="page-container">
            <div className="flex justify-between items-end mb-12 md:mb-16">
              <div>
                <div className="mb-6" style={{ width: '60px', height: '2px', backgroundColor: '#CFB257' }}></div>
                <h2 className="text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-heading font-bold mb-4 md:mb-5 leading-tight" style={{ color: '#1A1A1A' }}>{t('home.featured') || 'منتجات مميزة'}</h2>
                <p className="text-base md:text-lg lg:text-xl font-medium" style={{ color: '#8A8A8A' }}>{t('home.featured_desc') || 'اختيارات منتقاة خصيصاً لك'}</p>
              </div>
              <Link href="/shop" className="text-sm font-medium pb-1 hidden md:block transition-all duration-300 hover:opacity-70" style={{ color: '#CFB257', borderBottom: '2px solid #CFB257' }}>
                {t('home.view_all') || 'عرض الكل'} ←
              </Link>
            </div>
            {/* Desktop Grid */}
            <div className="hidden md:grid md:grid-cols-4 gap-6 md:gap-8">
              {featuredProducts.map(product => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
            {/* Mobile Horizontal Scroll - Swipeable */}
            <div className="md:hidden overflow-x-auto pb-4 -mx-4 px-4 scrollbar-hide" style={{ scrollSnapType: 'x mandatory', WebkitOverflowScrolling: 'touch' }}>
              <div className="flex gap-4" style={{ width: 'max-content' }}>
                {featuredProducts.map((product, index) => (
                  <div key={product.id} className={`flex-shrink-0 w-[45vw] ${index === 0 ? 'pl-4' : ''}`} style={{ scrollSnapAlign: 'start' }}>
                    <ProductCard product={product} />
                  </div>
                ))}
              </div>
            </div>
            <div className="text-center mt-10 md:hidden">
              <Link href="/shop" className="text-sm font-medium text-gray-900 border-b-2 border-gray-900 pb-1 hover:opacity-70 transition-opacity">
                {t('home.view_all') || 'عرض الكل'} ←
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* 3. Flash Sales - Full Width */}
      {activeFlashSales.length > 0 && flashSaleProducts.length > 0 && (
        <section
          data-section-id="flash-sales"
          className={`w-full py-16 md:py-24 bg-[#FFFFFF] ${getSectionClasses('flash-sales')}`}
        >
          <div className="page-container">
            <div className="flex flex-col md:flex-row justify-between items-center mb-10 md:mb-14">
              <div>
                <div className="inline-block px-5 py-2 rounded-full text-[10px] font-bold uppercase tracking-[0.2em] mb-5" style={{ background: 'linear-gradient(135deg, #CFB257, #B69349)', color: '#4F1200' }}>
                  ⚡ Flash Sale
                </div>
                <h2 className="text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-heading font-bold mb-3 leading-tight" style={{ color: '#1A1A1A' }}>
                  {activeFlashSales[0].name || (t('home.flash_sale') || 'تخفيضات سريعة')}
                </h2>
                <p className="text-base md:text-lg lg:text-xl font-medium" style={{ color: '#8A8A8A' }}>
                  {activeFlashSales[0].description || (t('home.flash_sale_desc') || 'عروض لفترة محدودة - اغتنمها قبل نفادها')}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
              {flashSaleProducts.map((product) => {
                const categoryName = categories.find((c) => c.id === product.category)?.name;

                const productSale = activeFlashSales.find((sale) =>
                  sale.productIds.includes(product.id)
                );

                let finalPrice = product.price;
                let originalPrice: number | null = null;

                if (productSale) {
                  if (productSale.discountType === 'percentage') {
                    originalPrice = product.price;
                    finalPrice = Math.max(product.price * (1 - productSale.discountValue / 100), 0);
                  } else if (productSale.discountType === 'fixed') {
                    originalPrice = product.price;
                    finalPrice = Math.max(product.price - productSale.discountValue, 0);
                  }
                }

                return (
                  <Link key={product.id} href={`/flash/products/${product.slug || product.id}`} className="group block">
                    <div className="relative aspect-[3/4] w-full overflow-hidden bg-[#FDFBF7] mb-4 border border-transparent group-hover:border-[color:var(--gold-primary)] transition-all duration-500 group-hover:shadow-[0_15px_30px_-10px_rgba(207,178,87,0.3)]">
                      {product.images && product.images.length > 0 ? (
                        <Image
                          src={product.images[0]}
                          alt={getProductName(product, languageCode)}
                          fill
                          className="object-cover object-center group-hover:scale-105 transition-transform duration-700"
                          sizes="(max-width: 768px) 50vw, 25vw"
                          quality={85}
                          loading="lazy"
                          unoptimized
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center text-gray-300">
                          <span className="text-xs uppercase tracking-widest">No Image</span>
                        </div>
                      )}
                      <div className="absolute top-3 left-3 text-[9px] font-bold px-3 py-1.5 uppercase tracking-widest z-10 shadow-sm" style={{ background: 'linear-gradient(135deg, #CFB257, #B69349)', color: '#4F1200' }}>
                        ⚡ Flash Sale
                      </div>
                      {productSale?.discountType === 'percentage' && (
                        <div className="absolute top-3 right-3 text-[9px] font-bold px-3 py-1.5 uppercase tracking-widest z-10 shadow-sm bg-[color:var(--brown-deep)] text-[color:var(--gold-primary)]">
                          -{productSale.discountValue}%
                        </div>
                      )}
                    </div>
                    <div className="text-center">
                      <h3 className="text-xs md:text-sm font-heading font-semibold truncate group-hover:text-[color:var(--gold-primary)] transition-colors" style={{ color: '#F5E6C8' }}>
                        {getProductName(product, languageCode)}
                      </h3>
                      <p className="text-[10px] uppercase tracking-[0.15em] mt-1" style={{ color: 'rgba(207,178,87,0.5)' }}>{categoryName || 'Collection'}</p>
                      <div className="mt-2 flex items-center justify-center gap-3">
                        {originalPrice !== null && originalPrice > finalPrice && (
                          <span className="text-xs line-through" style={{ color: 'rgba(245,230,200,0.4)' }}>
                            {formatPrice(originalPrice)}
                          </span>
                        )}
                        <span className="text-sm md:text-base font-semibold" style={{ color: '#CFB257' }}>
                          {formatPrice(finalPrice)}
                        </span>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* 4. Popular Products - Container */}
      {popularProducts.length > 0 && (
        <section
          data-section-id="popular"
          className={`py-14 md:py-20 luxury-bg-offwhite ${getSectionClasses('popular')}`}
        >
          <div className="page-container">
            <div className="text-center mb-12 md:mb-16">
              <div className="section-divider mb-6 mx-auto"><span className="section-divider-icon">✦</span></div>
              <h2 className="text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-heading font-bold mb-4 md:mb-5 leading-tight" style={{ color: '#4F1200' }}>{t('home.popular') || 'الأكثر رواجاً هذا الأسبوع'}</h2>
              <p className="text-base md:text-lg lg:text-xl font-medium" style={{ color: '#6B4226' }}>{t('home.popular_desc') || 'أكثر الأساليب رواجاً لدى عملائنا'}</p>
            </div>
            {/* Desktop Grid */}
            <div className="hidden md:grid md:grid-cols-4 gap-6 md:gap-8">
              {popularProducts.map(product => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
            {/* Mobile Horizontal Scroll - Swipeable */}
            <div className="md:hidden overflow-x-auto pb-4 -mx-4 px-4 scrollbar-hide" style={{ scrollSnapType: 'x mandatory', WebkitOverflowScrolling: 'touch' }}>
              <div className="flex gap-4" style={{ width: 'max-content' }}>
                {popularProducts.map((product, index) => (
                  <div key={product.id} className={`flex-shrink-0 w-[45vw] ${index === 0 ? 'pl-4' : ''}`} style={{ scrollSnapAlign: 'start' }}>
                    <ProductCard product={product} />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}



      {/* 6. Latest Products - Container */}
      {latestProducts.length > 0 && (
        <section
          data-section-id="latest"
          className={`py-14 md:py-20 luxury-bg-cream ${getSectionClasses('latest')}`}
        >
          <div className="page-container">
            <div className="flex flex-col md:flex-row justify-between items-center mb-10 md:mb-12">
              <div>
                <div className="section-divider mb-6" style={{ maxWidth: '200px' }}><span className="section-divider-icon">✦</span></div>
                <h2 className="text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-heading font-bold mb-4 md:mb-5 leading-tight" style={{ color: '#4F1200' }}>{t('home.new_arrivals') || 'وصل حديثاً'}</h2>
                <p className="text-base md:text-lg lg:text-xl font-medium" style={{ color: '#6B4226' }}>{t('home.new_arrivals_desc') || 'اكتشف أحدث إضافاتنا'}</p>
              </div>
              <Link href="/shop?sort=newest" className="btn-outline-gold mt-4 md:mt-0 px-6 py-2.5 rounded-full text-sm font-medium">
                {t('home.browse_all_new') || 'تصفح كل الجديد'}
              </Link>
            </div>
            {/* Desktop Grid */}
            <div className="hidden md:grid md:grid-cols-4 gap-6 md:gap-8">
              {latestProducts.map(product => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
            {/* Mobile Horizontal Scroll - Swipeable */}
            <div className="md:hidden overflow-x-auto pb-4 -mx-4 px-4 scrollbar-hide" style={{ scrollSnapType: 'x mandatory', WebkitOverflowScrolling: 'touch' }}>
              <div className="flex gap-4" style={{ width: 'max-content' }}>
                {latestProducts.map((product, index) => (
                  <div key={product.id} className={`flex-shrink-0 w-[45vw] ${index === 0 ? 'pl-4' : ''}`} style={{ scrollSnapAlign: 'start' }}>
                    <ProductCard product={product} />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Category Specific Sections */}
      {categories.slice(0, 6).map((category) => {
        const categoryProducts = allProducts.filter(p => p.category === category.id).slice(0, 4);
        if (categoryProducts.length === 0) return null;

        return (
          <section
            key={category.id}
            data-section-id={`category-section-${category.id}`}
            className={`py-14 md:py-20 bg-[#FFFFFF] ${getSectionClasses(`category-section-${category.id}`)}`}
          >
            <div className="page-container">
              <div className="flex justify-between items-end mb-12 md:mb-16">
                <div>
                  <div className="mb-6" style={{ width: '60px', height: '2px', backgroundColor: '#CFB257' }}></div>
                  <h2 className="text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-heading font-bold mb-4 md:mb-5 leading-tight" style={{ color: '#1A1A1A' }}>
                    {getCategoryName(category, languageCode)}
                  </h2>
                  <p className="text-base md:text-lg lg:text-xl font-medium" style={{ color: '#8A8A8A' }}>
                    {t('home.explore_category_products', { category: getCategoryName(category, languageCode) }) || `${getCategoryName(category, languageCode)}`}
                  </p>
                </div>
                <Link href={`/shop?category=${category.slug}`} className="text-sm font-medium pb-1 hidden md:block transition-all duration-300 hover:opacity-70" style={{ color: '#CFB257', borderBottom: '2px solid #CFB257' }}>
                  {t('home.view_all') || 'عرض الكل'} ←
                </Link>
              </div>
              {/* Desktop Grid */}
              <div className="hidden md:grid md:grid-cols-4 gap-6 md:gap-8">
                {categoryProducts.map(product => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
              {/* Mobile Horizontal Scroll */}
              <div className="md:hidden overflow-x-auto pb-4 -mx-4 px-4 scrollbar-hide" style={{ scrollSnapType: 'x mandatory', WebkitOverflowScrolling: 'touch' }}>
                <div className="flex gap-4" style={{ width: 'max-content' }}>
                  {categoryProducts.map((product, index) => (
                    <div key={product.id} className={`flex-shrink-0 w-[45vw] ${index === 0 ? 'pl-4' : ''}`} style={{ scrollSnapAlign: 'start' }}>
                      <ProductCard product={product} />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>
        );
      })}

      {/* 7. Collections - Full Width */}
      {collections.length > 0 && (
        <section
          data-section-id="collections"
          className={`w-full py-16 md:py-24 luxury-bg-tan ${getSectionClasses('collections')}`}
        >
          <div className="page-container">
            <div className="text-center mb-12 md:mb-16">
              <div className="section-divider mb-6 mx-auto"><span className="section-divider-icon">✦</span></div>
              <h2 className="text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-heading font-bold mb-4 md:mb-5 leading-tight" style={{ color: '#4F1200' }}>{t('home.collections') || 'مجموعاتنا'}</h2>
              <p className="text-base md:text-lg lg:text-xl font-medium" style={{ color: '#6B4226' }}>{t('home.collections_desc') || 'استكشفي مجموعات منتقاة مصممة لك'}</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
              {collections.slice(0, 6).map((collection) => (
                <Link
                  key={collection.id}
                  href={`/shop?collection=${collection.slug}`}
                  className="cat-card group relative h-64 md:h-80 overflow-hidden"
                >
                  <div className="cat-corner-tl" />
                  <div className="cat-corner-br" />
                  {collection.imageUrl ? (
                    <Image
                      src={collection.imageUrl}
                      alt={collection.name}
                      fill
                      className="object-cover transition-transform duration-[1.2s] ease-out group-hover:scale-110"
                      unoptimized
                    />
                  ) : (
                    <div className="absolute inset-0" style={{ background: 'linear-gradient(135deg, #6B4226, #4F1200)' }} />
                  )}
                  <div className="absolute inset-0 z-10 transition-opacity duration-500 group-hover:opacity-0" style={{ background: 'linear-gradient(to top, rgba(79,18,0,0.85) 0%, rgba(79,18,0,0.2) 60%, transparent 100%)' }} />
                  <div className="absolute inset-0 z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-500" style={{ background: 'linear-gradient(to top, rgba(255,248,238,0.92) 0%, rgba(255,248,238,0.3) 50%, transparent 100%)' }} />
                  <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-[color:var(--gold-primary)] scale-x-0 group-hover:scale-x-100 transition-transform duration-700 origin-left z-20" />
                  <div className="absolute bottom-0 left-0 right-0 p-6 md:p-8 z-20">
                    <h3 className="text-xl md:text-2xl font-heading font-bold text-white mb-1 group-hover:text-[color:var(--brown-deep)] transition-colors duration-500">{getCollectionName(collection, languageCode)}</h3>
                    {collection.description && (
                      <p className="text-white/70 text-sm line-clamp-2 group-hover:text-[color:var(--brown-medium)] transition-colors duration-500">{collection.description}</p>
                    )}
                    <div className="h-px w-0 group-hover:w-12 bg-[color:var(--gold-primary)] transition-all duration-500 mt-3 mb-2 group-hover:bg-[color:var(--brown-deep)]" />
                    <span className="cat-text-reveal delay-1 block text-[10px] uppercase tracking-[0.2em] text-[color:var(--brown-deep)] font-semibold">
                      {t('home.explore_collection') || 'استكشفي المجموعة'} ←
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* 8. Product Bundles / Special Offers - Container */}
      {settings?.features?.productBundles && activeBundles.length > 0 && (
        <section
          data-section-id="bundles"
          className={`py-16 md:py-24 luxury-bg-cream ${getSectionClasses('bundles')}`}
        >
          <div className="page-container">
            <div className="text-center mb-12 md:mb-16">
              <div className="section-divider mb-6 mx-auto"><span className="section-divider-icon">✦</span></div>
              <h2 className="text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-heading font-bold mb-4 md:mb-5 leading-tight" style={{ color: '#4F1200' }}>{t('home.special_offers') || 'عروض خاصة'}</h2>
              <p className="text-base md:text-lg lg:text-xl font-medium" style={{ color: '#6B4226' }}>{t('home.bundle_deals') || 'صفقات الحزم الحصرية'}</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
              {activeBundles.map((bundle) => {
                let bundlePrice = 0;
                let originalPrice = 0;

                const allProducts = [...featuredProducts, ...popularProducts, ...latestProducts];
                const uniqueProducts = Array.from(new Map(allProducts.map(p => [p.id, p])).values());

                if (bundle.bundlePrice) {
                  bundlePrice = bundle.bundlePrice;
                  bundle.products.forEach(p => {
                    const product = uniqueProducts.find(pr => pr.id === p.productId);
                    if (product) {
                      const itemPrice = product.salePrice || product.price;
                      originalPrice += itemPrice * (p.quantity || 1);
                    }
                  });
                } else {
                  bundle.products.forEach(p => {
                    const product = uniqueProducts.find(pr => pr.id === p.productId);
                    if (product) {
                      const itemPrice = product.salePrice || product.price;
                      const quantity = p.quantity || 1;
                      originalPrice += itemPrice * quantity;

                      if (p.discount) {
                        bundlePrice += itemPrice * quantity * (1 - p.discount / 100);
                      } else {
                        bundlePrice += itemPrice * quantity;
                      }
                    }
                  });

                  if (bundle.discountType === 'percentage' && bundle.discountValue) {
                    bundlePrice = bundlePrice * (1 - bundle.discountValue / 100);
                  } else if (bundle.discountType === 'fixed' && bundle.discountValue) {
                    bundlePrice = bundlePrice - bundle.discountValue;
                  }
                }

                return (
                  <Link
                    key={bundle.id}
                    href={`/product-bundles/${bundle.id}`}
                    className="group relative bg-white overflow-hidden border border-transparent hover:border-[color:var(--gold-light)] transition-all duration-500 hover:shadow-[0_15px_30px_-10px_rgba(207,178,87,0.2)] hover:-translate-y-1"
                  >
                    {bundle.image ? (
                      <div className="relative h-52 w-full overflow-hidden">
                        <Image
                          src={bundle.image}
                          alt={bundle.name}
                          fill
                          className="object-cover group-hover:scale-105 transition-transform duration-700"
                          unoptimized
                        />
                        <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(79,18,0,0.6) 0%, transparent 50%)' }} />
                      </div>
                    ) : (
                      <div className="relative h-52 w-full flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #F5E6C8, #EDD5A3)' }}>
                        <span className="text-[color:var(--brown-medium)] text-sm font-heading">No Image</span>
                      </div>
                    )}
                    <div className="p-6">
                      <div className="flex items-start justify-between mb-3">
                        <h3 className="text-lg md:text-xl font-heading font-bold flex-1 group-hover:text-[color:var(--gold-dark)] transition-colors" style={{ color: '#4F1200' }}>
                          {bundle.name}
                        </h3>
                        <span className="ml-2 text-[9px] font-bold px-3 py-1.5 uppercase tracking-widest flex-shrink-0" style={{ background: 'linear-gradient(135deg, #CFB257, #B69349)', color: '#4F1200' }}>
                          Bundle
                        </span>
                      </div>
                      {bundle.description && (
                        <p className="text-sm mb-4 line-clamp-2" style={{ color: '#6B4226' }}>{bundle.description}</p>
                      )}
                      <div className="mb-4 pt-3 border-t" style={{ borderColor: 'rgba(207,178,87,0.2)' }}>
                        <p className="text-[10px] uppercase tracking-[0.15em] mb-2" style={{ color: '#9B7B4E' }}>Includes {bundle.products.length} {bundle.products.length === 1 ? 'item' : 'items'}</p>
                        <div className="flex items-center gap-3">
                          {originalPrice > bundlePrice && (
                            <span className="text-sm line-through" style={{ color: '#9B7B4E' }}>{formatPrice(originalPrice)}</span>
                          )}
                          <span className="text-xl font-heading font-bold" style={{ color: '#4F1200' }}>{formatPrice(bundlePrice)}</span>
                          {bundle.discountType === 'percentage' && bundle.discountValue && (
                            <span className="text-xs font-bold px-2 py-0.5" style={{ backgroundColor: 'rgba(207,178,87,0.15)', color: '#B69349' }}>-{bundle.discountValue}%</span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center text-sm font-medium group-hover:text-[color:var(--gold-dark)] transition-colors" style={{ color: '#CFB257' }}>
                        {t('home.view_bundle') || 'عرض الحزمة'} →
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* 9. Customer Testimonials/Reviews Carousel - Full Width */}
      {testimonials.length > 0 && (
        <section
          data-section-id="testimonials"
          className={`w-full py-16 md:py-24 luxury-bg-offwhite ${getSectionClasses('testimonials')}`}
        >
          <div className="page-container">
            <div className="text-center mb-12 md:mb-16">
              <div className="section-divider mb-6 mx-auto"><span className="section-divider-icon">✦</span></div>
              <h2 className="text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-heading font-bold mb-4 md:mb-5 leading-tight" style={{ color: '#4F1200' }}>
                {t('home.testimonials_title') || 'ماذا يقول عملاؤنا'}
              </h2>
              <p className="text-base md:text-lg lg:text-xl font-medium" style={{ color: '#6B4226' }}>
                {t('home.testimonials_subtitle') || 'مراجعات حقيقية من عملاء حقيقيين'}
              </p>
            </div>
            <div className="max-w-4xl mx-auto relative">
              <div className="bg-white p-8 md:p-12 border border-transparent" style={{ borderLeft: '3px solid #CFB257' }}>
                {testimonials.length > 0 && (
                  <>
                    {/* Gold stars */}
                    <div className="flex items-center gap-1 mb-5">
                      {Array.from({ length: 5 }).map((_, index) => {
                        const rating = testimonials[currentTestimonialIndex]?.rating || 0;
                        const isFilled = index < rating;
                        return (
                          <svg
                            key={index}
                            className="w-5 h-5 md:w-6 md:h-6"
                            style={{ color: isFilled ? '#CFB257' : '#E5D5B0' }}
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.538 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.783.57-1.838-.197-1.538-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.381-1.81.588-1.81h3.462a1 1 0 00.95-.69l1.07-3.292z" />
                          </svg>
                        );
                      })}
                    </div>
                    <p className="text-lg md:text-xl mb-6 italic font-heading leading-relaxed" style={{ color: '#4F1200' }}>
                      &quot;{testimonials[currentTestimonialIndex]?.comment}&quot;
                    </p>
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pt-5" style={{ borderTop: '1px solid rgba(207,178,87,0.2)' }}>
                      <div>
                        <p className="font-heading font-semibold text-base" style={{ color: '#4F1200' }}>
                          {testimonials[currentTestimonialIndex]?.userName}
                        </p>
                        {testimonials[currentTestimonialIndex]?.verifiedPurchase && (
                          <p className="text-sm flex items-center gap-1.5 mt-1" style={{ color: '#B69349' }}>
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                            </svg>
                            {t('home.verified_purchase') || 'مشتريات مؤكدة'}
                          </p>
                        )}
                      </div>
                      {testimonials.length > 1 && (
                        <div className="flex gap-2 justify-center md:justify-end">
                          {testimonials.map((_, index) => (
                            <button
                              key={index}
                              onClick={() => setCurrentTestimonialIndex(index)}
                              className="h-2.5 rounded-full transition-all duration-300"
                              style={{
                                width: index === currentTestimonialIndex ? '32px' : '10px',
                                backgroundColor: index === currentTestimonialIndex ? '#CFB257' : '#E5D5B0',
                              }}
                              aria-label={`Go to testimonial ${index + 1}`}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </section>
      )}


      {/* 11. Featured Blog Posts Section - Container */}
      {featuredBlogPosts.length > 0 && (
        <section
          data-section-id="blog"
          className={`py-16 md:py-24 luxury-bg-tan ${getSectionClasses('blog')}`}
        >
          <div className="page-container">
            <div className="flex justify-between items-end mb-12 md:mb-16">
              <div>
                <div className="section-divider mb-6" style={{ maxWidth: '200px' }}><span className="section-divider-icon">✦</span></div>
                <h2 className="text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-heading font-bold mb-4 md:mb-5 leading-tight" style={{ color: '#4F1200' }}>
                  {t('home.blog_title') || 'أحدث مقالات المدونة'}
                </h2>
                <p className="text-base md:text-lg lg:text-xl font-medium" style={{ color: '#6B4226' }}>
                  {t('home.blog_subtitle') || 'نصائح الموضة، أدلة الأناقة، والمزيد'}
                </p>
              </div>
              <Link href="/blog" className="text-sm font-medium pb-1 hidden md:block transition-all duration-300 hover:opacity-70" style={{ color: '#CFB257', borderBottom: '2px solid #CFB257' }}>
                {t('home.view_all_blog') || 'عرض الكل'} ←
              </Link>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
              {featuredBlogPosts.map((post) => (
                <Link
                  key={post.id}
                  href={`/blog/${post.slug}`}
                  className="group bg-white overflow-hidden border border-transparent hover:border-[color:var(--gold-light)] transition-all duration-500 hover:shadow-[0_15px_30px_-10px_rgba(207,178,87,0.2)] hover:-translate-y-1"
                >
                  {post.coverImage && (
                    <div className="relative h-52 w-full overflow-hidden">
                      <Image
                        src={post.coverImage}
                        alt={post.title}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-700"
                        unoptimized
                      />
                      <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(79,18,0,0.4) 0%, transparent 40%)' }} />
                    </div>
                  )}
                  <div className="p-6">
                    <h3 className="text-lg md:text-xl font-heading font-bold mb-2 group-hover:text-[color:var(--gold-dark)] transition-colors line-clamp-2" style={{ color: '#4F1200' }}>
                      {post.title}
                    </h3>
                    <p className="text-sm mb-4 line-clamp-3" style={{ color: '#6B4226' }}>
                      {post.excerpt}
                    </p>
                    <div className="flex items-center text-sm font-medium group-hover:text-[color:var(--gold-dark)] transition-colors" style={{ color: '#CFB257' }}>
                      {t('home.read_more') || 'اقرأ المزيد'} ←
                    </div>
                  </div>
                </Link>
              ))}
            </div>
            <div className="text-center mt-10 md:hidden">
              <Link href="/blog" className="text-sm font-medium pb-1 transition-all hover:opacity-70" style={{ color: '#CFB257', borderBottom: '2px solid #CFB257' }}>
                {t('home.view_all_blog') || 'عرض الكل'} ←
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* Quick View Modal */}
      <QuickViewModal
        product={quickViewProduct}
        isOpen={!!quickViewProduct}
        onClose={() => setQuickViewProduct(null)}
      />

      {/* Mobile Sticky Cart */}
      <MobileStickyCart />

      {/* Back to Top Button */}
      <BackToTop />

      {/* Product Comparison Bar */}
      <ProductComparison
        products={comparisonProducts}
        onRemove={handleRemoveFromComparison}
        onClear={handleClearComparison}
      />

      {/* 13. Recently Viewed Products Section - Container */}
      {recentlyViewedProducts.length > 0 && (
        <section
          data-section-id="recently-viewed"
          className={`py-16 md:py-24 luxury-bg-cream ${getSectionClasses('recently-viewed')}`}
        >
          <div className="page-container">
            <div className="flex justify-between items-end mb-12 md:mb-16">
              <div>
                <div className="section-divider mb-6" style={{ maxWidth: '200px' }}><span className="section-divider-icon">✦</span></div>
                <h2 className="text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-heading font-bold mb-4 md:mb-5 leading-tight" style={{ color: '#4F1200' }}>
                  {t('home.recently_viewed') || 'شوهدت مؤخراً'}
                </h2>
                <p className="text-base md:text-lg lg:text-xl font-medium" style={{ color: '#6B4226' }}>
                  {t('home.recently_viewed_desc') || 'أكمل التصفح من حيث توقفت'}
                </p>
              </div>
            </div>
            {/* Desktop Grid */}
            <div className="hidden md:grid md:grid-cols-4 gap-6 md:gap-8">
              {recentlyViewedProducts.map(product => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
            {/* Mobile Horizontal Scroll - Swipeable */}
            <div className="md:hidden overflow-x-auto pb-4 -mx-4 px-4 scrollbar-hide" style={{ scrollSnapType: 'x mandatory', WebkitOverflowScrolling: 'touch' }}>
              <div className="flex gap-4" style={{ width: 'max-content' }}>
                {recentlyViewedProducts.map(product => (
                  <div key={product.id} className="flex-shrink-0 w-[45vw]" style={{ scrollSnapAlign: 'start' }}>
                    <ProductCard product={product} />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
