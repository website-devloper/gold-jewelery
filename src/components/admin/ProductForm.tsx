'use client';

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { Product, ProductTranslation, ProductVariant } from '@/lib/firestore/products';
import { addProduct, updateProduct, getProduct } from '@/lib/firestore/products_db';
import { getAllCategories } from '@/lib/firestore/categories_db';
import { getAllBrands } from '@/lib/firestore/brands_db';
import { getAllCollections } from '@/lib/firestore/collections_db';
import { getSizes, getColors } from '@/lib/firestore/attributes_db';
import { Category } from '@/lib/firestore/categories';
import { Brand } from '@/lib/firestore/brands';
import { Collection } from '@/lib/firestore/collections';
import { Size, Color } from '@/lib/firestore/attributes';
import { storage } from '@/lib/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { generateSlug } from '@/lib/utils/slug';
import { getProductSEO, createOrUpdateProductSEO } from '@/lib/firestore/seo_db';
import { getSettings } from '@/lib/firestore/settings_db';
import { Settings, defaultSettings } from '@/lib/firestore/settings';
import { getAllLanguages } from '@/lib/firestore/internationalization_db';
import { Language } from '@/lib/firestore/internationalization';
import { Timestamp } from 'firebase/firestore';
import { useLanguage } from '@/context/LanguageContext';
import Dialog from '../ui/Dialog';
import 'react-quill/dist/quill.snow.css';

// Polyfill for findDOMNode in React 19 (React Quill compatibility)
if (typeof window !== 'undefined') {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const ReactDOM = require('react-dom');
  if (!ReactDOM.findDOMNode) {
    ReactDOM.findDOMNode = (node: unknown): Node | null => {
      if (!node) return null;
      if (node && typeof node === 'object' && 'nodeType' in node && (node as { nodeType: number }).nodeType === 1) {
        return node as Node;
      }
      if (node && typeof node === 'object' && 'current' in node) {
        return (node as { current: Node | null }).current;
      }
      if (node && typeof node === 'object' && 'getDOMNode' in node) {
        const getDOMNode = (node as { getDOMNode: () => Node | null }).getDOMNode;
        return getDOMNode();
      }
      return null;
    };
  }
}

// Dynamically import ReactQuill to avoid SSR issues
const ReactQuill = dynamic(
  async () => {
    if (typeof window === 'undefined') {
      return () => null;
    }
    const ReactQuillModule = await import('react-quill');
    return ReactQuillModule.default || ReactQuillModule;
  },
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-[400px] border border-gray-300 rounded-lg flex items-center justify-center bg-gray-50">
        <div className="text-gray-500">Loading editor component...</div>
      </div>
    )
  }
);

interface ProductFormProps {
  productId?: string;
  onSuccess: () => void;
  onCancel: () => void;
}

const ProductForm: React.FC<ProductFormProps> = ({ productId, onSuccess, onCancel }) => {
  const initialProductState: Omit<Product, 'id' | 'createdAt' | 'updatedAt'> = {
    name: '',
    slug: '', // Slug is now part of Product interface
    description: '',
    images: [],
    price: 0,
    salePrice: undefined,
    discountType: undefined,
    discountValue: undefined,
    category: '',
    collectionId: undefined,
    brandId: '',
    variants: [],
    isFeatured: false,
    isActive: true,
    allowPreOrder: false,
    isBundle: false,
    loyaltyPoints: undefined,
  } as Omit<Product, 'id' | 'createdAt' | 'updatedAt'>;

  const [product, setProduct] = useState<Omit<Product, 'id' | 'createdAt' | 'updatedAt'>>(initialProductState);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isClient, setIsClient] = useState(false);
  const productIdRef = useRef(productId);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [sizes, setSizes] = useState<Size[]>([]);
  const [colors, setColors] = useState<Color[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [showInfoDialog, setShowInfoDialog] = useState(false);
  const [infoDialogMessage, setInfoDialogMessage] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [metaImageFile, setMetaImageFile] = useState<File | null>(null);
  const [metaImagePreview, setMetaImagePreview] = useState<string | null>(null);
  const [seoData, setSeoData] = useState({
    title: '',
    description: '',
    keywords: '',
    metaImage: '',
    canonicalUrl: '',
  });
  const [websiteUrl, setWebsiteUrl] = useState<string>('');
  const [languages, setLanguages] = useState<Language[]>([]);
  const [selectedLanguageCode, setSelectedLanguageCode] = useState<string>('en');
  const [translations, setTranslations] = useState<ProductTranslation[]>([]);
  const [settings, setSettings] = useState<Settings>(defaultSettings);
  const { t, currentLanguage } = useLanguage();

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    productIdRef.current = productId;
  }, [productId]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [fetchedCategories, fetchedCollections, fetchedBrands, fetchedSizes, fetchedColors, settings, allLanguages] = await Promise.all([
          getAllCategories(),
          getAllCollections(),
          getAllBrands(),
          getSizes(),
          getColors(),
          getSettings(),
          getAllLanguages(false)
        ]);
        setCategories(fetchedCategories);
        setCollections(fetchedCollections);
        setBrands(fetchedBrands);
        setSizes(fetchedSizes);
        setColors(fetchedColors);
        setLanguages(allLanguages);
        if (settings) {
          setSettings({ ...defaultSettings, ...settings });
          // Get website URL from settings
          if (settings.company?.website) {
            setWebsiteUrl(settings.company.website);
          }
        }
        // Set default language
        const defaultLang = currentLanguage?.code || 'en';
        setSelectedLanguageCode(defaultLang);
      } catch {
        // Failed to fetch attributes
      }
    };
    fetchData();

    if (productId) {
      setLoading(true);
      Promise.all([
        getProduct(productId),
        getProductSEO(productId)
      ])
        .then(([fetchedProduct, fetchedSEO]) => {
          if (fetchedProduct) {
            // Exclude id, createdAt, updatedAt, translations for form state
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const { id, createdAt, updatedAt, ...rest } = fetchedProduct;
            const productTranslations = (fetchedProduct as Product & { translations?: ProductTranslation[] }).translations;
            setProduct(rest);

            // Set translations
            if (productTranslations && productTranslations.length > 0) {
              setTranslations(productTranslations);
              // Set default language to current language or first available
              const defaultLang = productTranslations.find(t => t.languageCode === currentLanguage?.code)
                || productTranslations.find(t => t.languageCode === 'en')
                || productTranslations[0];
              if (defaultLang) {
                setSelectedLanguageCode(defaultLang.languageCode);
                // Update product name and description from translation
                setProduct(prev => ({
                  ...prev,
                  name: defaultLang.name || prev.name,
                  description: defaultLang.description || prev.description
                }));
              }
            }
          } else {
            setError('Product not found.');
          }
          if (fetchedSEO) {
            setSeoData({
              title: fetchedSEO.title || '',
              description: fetchedSEO.description || '',
              keywords: fetchedSEO.keywords?.join(', ') || '',
              metaImage: fetchedSEO.metaImage || '',
              canonicalUrl: fetchedSEO.canonicalUrl || '',
            });
            if (fetchedSEO.metaImage) {
              setMetaImagePreview(fetchedSEO.metaImage);
            }
          }
        })
        .catch(() => {
          setError('Failed to load product for editing.');
          // Failed to load product
        })
        .finally(() => setLoading(false));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productId]);

  // Get Quill instance helper function
  const getQuillInstance = useCallback(() => {
    const editorContainer = document.querySelector('#product-description-editor-container');
    if (!editorContainer) return null;

    // Try .ql-editor first
    const editor = editorContainer.querySelector('.ql-editor') as HTMLElement & {
      __quill?: {
        getSelection: (focus?: boolean) => { index: number; length: number } | null;
        insertEmbed: (index: number, type: string, value: string) => void;
        setSelection: (index: number, length?: number) => void;
        getLength: () => number;
        deleteText: (index: number, length: number) => void;
      }
    } | null;

    if (editor?.__quill) {
      return editor.__quill;
    }

    // Try .ql-container
    const container = editorContainer.querySelector('.ql-container') as HTMLElement & {
      __quill?: {
        getSelection: (focus?: boolean) => { index: number; length: number } | null;
        insertEmbed: (index: number, type: string, value: string) => void;
        setSelection: (index: number, length?: number) => void;
        getLength: () => number;
        deleteText: (index: number, length: number) => void;
      }
    } | null;

    if (container?.__quill) {
      return container.__quill;
    }

    // Try global .ql-editor
    const globalEditor = document.querySelector('#product-description-editor-container .ql-editor') as HTMLElement & {
      __quill?: {
        getSelection: (focus?: boolean) => { index: number; length: number } | null;
        insertEmbed: (index: number, type: string, value: string) => void;
        setSelection: (index: number, length?: number) => void;
        getLength: () => number;
        deleteText: (index: number, length: number) => void;
      }
    } | null;

    if (globalEditor?.__quill) {
      return globalEditor.__quill;
    }

    return null;
  }, []);

  // Image upload handler for Quill editor
  const imageHandler = useCallback(() => {
    const input = document.createElement('input');
    input.setAttribute('type', 'file');
    input.setAttribute('accept', 'image/*');
    input.click();

    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setInfoDialogMessage(t('common.image_size_error') || 'يجب أن يكون حجم الصورة أقل من 5 ميجابايت. يرجى ضغط الصورة والمحاولة مرة أخرى.');
        setShowInfoDialog(true);
        return;
      }

      // Show loading state
      const loadingMsg = document.createElement('div');
      loadingMsg.id = 'image-upload-loading';
      loadingMsg.textContent = 'Uploading image...';
      loadingMsg.style.cssText = 'position: fixed; top: 20px; right: 20px; background: #000; color: #fff; padding: 12px 20px; border-radius: 4px; z-index: 10000;';
      document.body.appendChild(loadingMsg);

      try {
        // Sanitize filename
        const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
        const productIdOrNew = productIdRef.current || 'new';
        const filePath = `products/${productIdOrNew}/description/${Date.now()}_${sanitizedFileName}`;

        const storageRef = ref(storage, filePath);
        const uploadResult = await uploadBytes(storageRef, file);
        const url = await getDownloadURL(uploadResult.ref);

        // Get Quill instance with multiple retries
        let quillInstance = getQuillInstance();
        let attempts = 0;
        const maxAttempts = 10;

        while (!quillInstance && attempts < maxAttempts) {
          await new Promise(resolve => setTimeout(resolve, 200));
          quillInstance = getQuillInstance();
          attempts++;
        }

        if (!quillInstance) {
          // Last attempt: try to find it by clicking in the editor first
          const editorElement = document.querySelector('#product-description-editor-container .ql-editor') as HTMLElement;
          if (editorElement) {
            editorElement.focus();
            await new Promise(resolve => setTimeout(resolve, 300));
            quillInstance = getQuillInstance();
          }
        }

        if (!quillInstance) {
          throw new Error('Quill editor not found. Please make sure the editor is loaded and try again.');
        }

        // Insert image at cursor position
        const range = quillInstance.getSelection(true);
        if (range && range.index !== null && range.index >= 0) {
          // Delete any selected text first to avoid showing URL
          if (range.length > 0) {
            quillInstance.deleteText(range.index, range.length);
          }
          // Insert image embed (not URL text)
          quillInstance.insertEmbed(range.index, 'image', url);
          // Move cursor after the image
          quillInstance.setSelection(range.index + 1, 0);
        } else {
          // Insert at end if no selection
          const length = quillInstance.getLength();
          quillInstance.insertEmbed(length - 1, 'image', url);
          quillInstance.setSelection(length, 0);
        }

        // Update product description
        const editorElement = document.querySelector('#product-description-editor-container .ql-editor') as HTMLElement;
        if (editorElement) {
          setProduct(prev => ({
            ...prev,
            description: editorElement.innerHTML
          }));
        }

        // Remove loading message
        const loadingElement = document.getElementById('image-upload-loading');
        if (loadingElement) {
          loadingElement.textContent = 'Image uploaded successfully!';
          loadingElement.style.background = '#10b981';
          setTimeout(() => {
            if (loadingElement.parentNode) {
              loadingElement.parentNode.removeChild(loadingElement);
            }
          }, 2000);
        }
      } catch (error: unknown) {
        // Failed to upload image

        const loadingElement = document.getElementById('image-upload-loading');
        if (loadingElement) {
          loadingElement.parentNode?.removeChild(loadingElement);
        }

        let errorMessage = 'Failed to upload image. ';
        const errorObj = error as { code?: string; message?: string };
        if (errorObj.code === 'storage/unauthorized') {
          errorMessage += 'You are not authorized to upload images.';
        } else if (errorObj.code === 'storage/canceled') {
          errorMessage += 'Upload was canceled.';
        } else if (errorObj.code === 'storage/unknown') {
          errorMessage += 'An unknown error occurred.';
        } else if (errorObj.message) {
          errorMessage += errorObj.message;
        } else {
          errorMessage += 'Please try again.';
        }

        setInfoDialogMessage(errorMessage);
        setShowInfoDialog(true);
      }
    };
  }, [getQuillInstance, t]);

  const quillModules = useMemo(() => ({
    toolbar: {
      container: [
        [{ 'header': [1, 2, 3, 4, 5, 6, false] }],
        [{ 'font': [] }],
        [{ 'size': ['small', false, 'large', 'huge'] }],
        ['bold', 'italic', 'underline', 'strike', 'blockquote'],
        [{ 'list': 'ordered' }, { 'list': 'bullet' }, { 'indent': '-1' }, { 'indent': '+1' }],
        [{ 'script': 'sub' }, { 'script': 'super' }],
        [{ 'align': [] }],
        ['link', 'image', 'video'],
        [{ 'color': [] }, { 'background': [] }],
        ['clean']
      ],
      handlers: {
        image: imageHandler
      }
    }
  }), [imageHandler]);

  const quillFormats = useMemo(() => [
    'header', 'font', 'size',
    'bold', 'italic', 'underline', 'strike', 'blockquote',
    'list', 'bullet', 'indent',
    'script',
    'align',
    'link', 'image', 'video',
    'color', 'background',
    'clean'
  ], []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;

    setProduct(prevProduct => {
      const updated = {
        ...prevProduct,
        [name]: type === 'checkbox' ? checked : (type === 'number' ? parseFloat(value) : value),
      };

      // Auto-generate slug when name changes
      if (name === 'name' && value) {
        (updated as any).slug = generateSlug(value);
        // Auto-generate canonical URL when slug changes
        if ((updated as any).slug && websiteUrl) {
          setSeoData(prev => ({
            ...prev,
            canonicalUrl: prev.canonicalUrl || `${websiteUrl}/products/${(updated as any).slug}`
          }));
        }
      }

      return updated;
    });

    // Update translation if editing a specific language
    if (selectedLanguageCode !== 'en' && (name === 'name' || name === 'description')) {
      setTranslations(prev => {
        const existing = prev.find(t => t.languageCode === selectedLanguageCode);
        if (existing) {
          return prev.map(t =>
            t.languageCode === selectedLanguageCode
              ? { ...t, [name]: value, updatedAt: Timestamp.now() }
              : t
          );
        } else {
          return [...prev, {
            languageCode: selectedLanguageCode,
            name: name === 'name' ? value as string : product.name,
            description: name === 'description' ? value as string : product.description,
            updatedAt: Timestamp.now()
          }];
        }
      });
    }
  };

  // Handle language change
  const handleLanguageChange = (languageCode: string) => {
    setSelectedLanguageCode(languageCode);

    // Find translation for selected language
    const translation = translations.find(t => t.languageCode === languageCode);
    if (translation) {
      // Update product name and description from translation
      setProduct(prev => ({
        ...prev,
        name: translation.name || prev.name,
        description: translation.description || prev.description
      }));
    } else {
      // If no translation exists, keep default values
      // (name and description remain as default/fallback)
    }
  };

  const handleManualImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { value } = e.target;
    setProduct(prevProduct => ({
      ...prevProduct,
      images: value.split(',').map(url => url.trim()).filter(url => url !== ''),
    }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      setImageFiles(prev => [...prev, ...files]);

      // Create previews
      files.forEach(file => {
        const reader = new FileReader();
        reader.onloadend = () => {
          setImagePreviews(prev => [...prev, reader.result as string]);
        };
        reader.readAsDataURL(file);
      });
    }
  };

  const handleMetaImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setMetaImageFile(file);

      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setMetaImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeMetaImage = () => {
    setMetaImageFile(null);
    setMetaImagePreview(null);
    setSeoData(prev => ({ ...prev, metaImage: '' }));
  };

  const removeImage = (index: number, isPreview: boolean) => {
    if (isPreview) {
      setImageFiles(prev => prev.filter((_, i) => i !== index));
      setImagePreviews(prev => prev.filter((_, i) => i !== index));
    } else {
      setProduct(prev => ({
        ...prev,
        images: prev.images.filter((_, i) => i !== index)
      }));
    }
  };

  const handleVariantChange = (index: number, field: string, value: string | number | undefined) => {
    const newVariants = [...product.variants];

    // If selecting a size, set both name="Size" and value="Small"
    if (field === 'sizeId') {
      const selectedSize = sizes.find(s => s.id === value);
      if (selectedSize) {
        newVariants[index] = {
          ...newVariants[index],
          name: 'Size',
          value: selectedSize.name,
        };
      }
    } else if (field === 'colorId') {
      const selectedColor = colors.find(c => c.id === value);
      if (selectedColor) {
        newVariants[index] = {
          ...newVariants[index],
          name: 'Color',
          value: selectedColor.name,
        };
      }
    } else {
      // Standard fields like stock, price, salePrice, priceAdjustment
      newVariants[index] = {
        ...newVariants[index],
        [field]: value
      };
    }

    setProduct(prevProduct => ({
      ...prevProduct,
      variants: newVariants,
    }));
  };

  const addVariant = () => {
    setProduct(prevProduct => ({
      ...prevProduct,
      variants: [...prevProduct.variants, {
        id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
        name: 'Size',
        value: '',
        stock: 0,
        extraPrice: 0
      }],
    }));
  };

  const removeVariant = (index: number) => {
    setProduct(prevProduct => ({
      ...prevProduct,
      variants: prevProduct.variants.filter((_, i) => i !== index),
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // Check if demo mode is enabled (only for updates, not for new products)
    if (productId && settings.demoMode) {
      setInfoDialogMessage(t('admin.settings.save_disabled_demo') || 'حفظ الإعدادات معطّل في الوضع التجريبي.');
      setShowInfoDialog(true);
      return;
    }
    setLoading(true);
    setError(null);

    try {
      let finalImages = [...product.images];

      // Upload new images
      if (imageFiles.length > 0) {
        const uploadPromises = imageFiles.map(async (file) => {
          const storageRef = ref(storage, `products/${Date.now()}_${file.name}`);
          const uploadResult = await uploadBytes(storageRef, file);
          return getDownloadURL(uploadResult.ref);
        });
        const uploadedUrls = await Promise.all(uploadPromises);
        finalImages = [...finalImages, ...uploadedUrls];
      }

      // Ensure slug exists before saving
      const finalProductData: Omit<Product, 'id' | 'createdAt' | 'updatedAt' | 'analytics'> & {
        images: string[];
        translations?: ProductTranslation[];
      } = { ...product, images: finalImages };
      if (!finalProductData.slug || finalProductData.slug.trim() === '') {
        // Generate slug from name if missing
        finalProductData.slug = generateSlug(finalProductData.name || `product-${Date.now()}`);
      }

      // Firestore does not allow undefined field values – clean them before save
      const cleanedProductData: Omit<Product, 'id' | 'createdAt' | 'updatedAt' | 'analytics'> & {
        images: string[];
        translations?: ProductTranslation[];
      } = { ...finalProductData };
      if (!finalProductData.discountType) {
        delete (cleanedProductData as Partial<typeof cleanedProductData>).discountType;
        delete (cleanedProductData as Partial<typeof cleanedProductData>).discountValue;
      } else if (finalProductData.discountValue === undefined || Number.isNaN(finalProductData.discountValue as number)) {
        delete (cleanedProductData as Partial<typeof cleanedProductData>).discountValue;
      }
      if (finalProductData.salePrice === undefined || Number.isNaN(finalProductData.salePrice as number)) {
        delete (cleanedProductData as Partial<typeof cleanedProductData>).salePrice;
      }

      // Save current translation if editing a specific language
      const finalTranslations = [...translations];
      if (selectedLanguageCode !== 'en') {
        const existingIndex = finalTranslations.findIndex((t: ProductTranslation) => t.languageCode === selectedLanguageCode);
        const currentTranslation: ProductTranslation = {
          languageCode: selectedLanguageCode,
          name: product.name,
          description: product.description,
          updatedAt: Timestamp.now()
        };
        if (existingIndex >= 0) {
          finalTranslations[existingIndex] = currentTranslation;
        } else {
          finalTranslations.push(currentTranslation);
        }
      }

      // Add translations to product data
      if (finalTranslations.length > 0) {
        finalProductData.translations = finalTranslations;
      }

      let savedProductId = productId;
      if (productId) {
        await updateProduct(productId, cleanedProductData);
      } else {
        savedProductId = await addProduct(cleanedProductData);
      }

      // Upload meta image if file is selected
      let metaImageUrl = seoData.metaImage;
      if (metaImageFile) {
        const storageRef = ref(storage, `products/${savedProductId}/meta-image/${Date.now()}_${metaImageFile.name}`);
        const uploadResult = await uploadBytes(storageRef, metaImageFile);
        metaImageUrl = await getDownloadURL(uploadResult.ref);
      }

      // Auto-generate canonical URL if not set (use website URL from settings)
      const finalCanonicalUrl = seoData.canonicalUrl || (finalProductData.slug && websiteUrl ? `${websiteUrl}/products/${finalProductData.slug}` : undefined);

      // Save SEO data
      if (savedProductId && (seoData.title || seoData.description || seoData.keywords || metaImageUrl || finalCanonicalUrl)) {
        await createOrUpdateProductSEO({
          productId: savedProductId,
          title: seoData.title || undefined,
          description: seoData.description || undefined,
          keywords: seoData.keywords ? seoData.keywords.split(',').map(k => k.trim()).filter(k => k) : undefined,
          metaImage: metaImageUrl || undefined,
          canonicalUrl: finalCanonicalUrl || undefined,
          noIndex: false,
          noFollow: false,
        });
      }

      onSuccess();
    } catch {
      setError('Failed to save product.');
      // Failed to save product
    } finally {
      setLoading(false);
    }
  };

  if (loading && productId && !product.name) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="relative">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-gray-900"></div>
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-xs font-semibold">
            Loading...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6 md:p-8 max-h-[90vh] overflow-y-auto">
      <h2 className="text-xl sm:text-2xl font-semibold mb-6 text-gray-900">{productId ? 'تعديل المنتج' : 'إضافة منتج جديد'}</h2>
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 p-4 rounded-lg mb-6 text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Language Selector */}
        {languages.length > 0 && (
          <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 mb-6">
            <label className="block text-sm font-semibold text-gray-700 mb-2">اختر اللغة</label>
            <div className="flex flex-wrap gap-2">
              {languages.map((lang: Language) => {
                const hasTranslation = translations.some((t: ProductTranslation) => t.languageCode === lang.code);
                const isSelected = selectedLanguageCode === lang.code;
                return (
                  <button
                    key={lang.code}
                    type="button"
                    onClick={() => handleLanguageChange(lang.code)}
                    className={`px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all ${isSelected
                      ? 'bg-gray-900 text-white'
                      : hasTranslation
                        ? 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
                        : 'bg-white text-gray-500 hover:bg-gray-50 border border-gray-200'
                      }`}
                  >
                    {lang.name} {lang.nativeName && `(${lang.nativeName})`}
                    {!hasTranslation && <span className="ml-1 sm:ml-2 text-xs">جديد</span>}
                  </button>
                );
              })}
            </div>
          </div>
        )}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
          <div>
            <label htmlFor="name" className="block text-gray-700 text-sm font-semibold mb-2">اسم المنتج</label>
            <input
              type="text"
              id="name"
              name="name"
              value={product.name}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent outline-none transition-all"
              required
            />
          </div>

          <div>
            <label htmlFor="price" className="block text-gray-700 text-sm font-semibold mb-2">السعر الأساسي</label>
            <input
              type="number"
              id="price"
              name="price"
              value={product.price}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent outline-none transition-all"
              required
              min="0"
              step="0.01"
            />
          </div>
        </div>

        {/* Discount Section */}
        <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">التخفيضات والعروض (اختياري)</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
            <div>
              <label htmlFor="discountType" className="block text-gray-700 text-sm font-semibold mb-2">نوع الخصم</label>
              <select
                id="discountType"
                name="discountType"
                value={product.discountType || ''}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent outline-none transition-all bg-white"
              >
                <option value="">لا يوجد خصم</option>
                <option value="percentage">نسبة مئوية (%)</option>
                <option value="fixed">مبلغ ثابت</option>
              </select>
            </div>

            {product.discountType && (
              <div>
                <label htmlFor="discountValue" className="block text-gray-700 text-sm font-semibold mb-2">قيمة الخصم</label>
                <input
                  type="number"
                  id="discountValue"
                  name="discountValue"
                  value={product.discountValue || ''}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent outline-none transition-all"
                  min="0"
                  step={product.discountType === 'percentage' ? "1" : "0.01"}
                  max={product.discountType === 'percentage' ? "100" : undefined}
                />
              </div>
            )}

            {(product.discountType && product.discountValue) ? (
              <div>
                <label htmlFor="salePrice" className="block text-gray-700 text-sm font-semibold mb-2">السعر بعد الخصم</label>
                <div className="w-full px-4 py-2 bg-gray-100 border border-gray-200 rounded-lg text-gray-700 font-medium">
                  {product.discountType === 'percentage'
                    ? (product.price - (product.price * (product.discountValue / 100))).toFixed(2)
                    : Math.max(0, product.price - product.discountValue).toFixed(2)}
                </div>
              </div>
            ) : (
              <div>
                <label htmlFor="salePrice" className="block text-gray-700 text-sm font-semibold mb-2">أو أدخل سعر البيع مباشرة</label>
                <input
                  type="number"
                  id="salePrice"
                  name="salePrice"
                  value={product.salePrice || ''}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent outline-none transition-all"
                  min="0"
                  step="0.01"
                  placeholder="يترك فارغاً إذا استخدمت الخصم أعلاه"
                />
              </div>
            )}
          </div>
        </div>

        {/* Loyalty Points Section - Only show if loyalty points are enabled in settings */}
        <div className="border-t border-gray-200 pt-6">
          <div>
            <label htmlFor="loyaltyPoints" className="block text-gray-700 text-sm font-semibold mb-2">نقاط الولاء (اختياري)</label>
            <input
              type="number"
              id="loyaltyPoints"
              name="loyaltyPoints"
              value={product.loyaltyPoints || ''}
              onChange={(e) => {
                const value = e.target.value === '' ? undefined : parseInt(e.target.value);
                setProduct(prev => ({ ...prev, loyaltyPoints: value }));
              }}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent outline-none transition-all"
              min="0"
              step="1"
              placeholder="مثال: 100"
            />
            <p className="text-xs text-gray-500 mt-1">النقاط التي سيكسبها العملاء عند شراء هذا المنتج</p>
          </div>
        </div>

        <div>
          <label htmlFor="description" className="block text-gray-700 text-sm font-semibold mb-2">الوصف</label>
          <div className="relative" id="product-description-editor-container">
            {!isClient ? (
              <div className="w-full h-[300px] sm:h-[400px] border border-gray-300 rounded-lg flex items-center justify-center bg-gray-50">
                <div className="text-gray-500 text-sm">جاري تهيئة المحرر...</div>
              </div>
            ) : (
              <div className="bg-white rounded-lg border border-gray-300 overflow-hidden">
                <ReactQuill
                  theme="snow"
                  value={product.description || ''}
                  onChange={(value: string) => {
                    setProduct(prev => ({ ...prev, description: value }));
                    // Update translation if editing a specific language
                    if (selectedLanguageCode !== 'en') {
                      setTranslations(prev => {
                        const existing = prev.find(t => t.languageCode === selectedLanguageCode);
                        if (existing) {
                          return prev.map(t =>
                            t.languageCode === selectedLanguageCode
                              ? { ...t, description: value, updatedAt: Timestamp.now() }
                              : t
                          );
                        } else {
                          return [...prev, {
                            languageCode: selectedLanguageCode,
                            name: product.name,
                            description: value,
                            updatedAt: Timestamp.now()
                          }];
                        }
                      });
                    }
                  }}
                  placeholder="ابدأ بكتابة وصف المنتج هنا..."
                  modules={quillModules}
                  formats={quillFormats}
                  style={{ minHeight: '300px' }}
                  className="bg-white"
                  preserveWhitespace={true}
                />
              </div>
            )}
          </div>
          <p className="text-xs text-gray-500 mt-2">
            استخدم شريط الأدوات أعلاه لتنسيق المحتوى. يمكنك إضافة صور، روابط، فيديوهات، والمزيد.
          </p>
        </div>

        <div>
          <label className="block text-gray-700 text-sm font-bold mb-2">صور المنتج</label>

          <div className="space-y-4">
            {/* Image Previews */}
            <div className="flex flex-wrap gap-4">
              {product.images.map((url, index) => (
                <div key={`existing-${index}`} className="relative w-24 h-24 bg-gray-100 rounded-lg overflow-hidden border border-gray-200 group">
                  <img
                    src={url}
                    alt={`صورة المنتج ${index + 1}`}
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => removeImage(index, false)}
                    className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-3 h-3">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ))}
              {imagePreviews.map((preview, index) => (
                <div key={`new-${index}`} className="relative w-24 h-24 bg-gray-100 rounded-lg overflow-hidden border border-gray-200 group">
                  <img
                    src={preview}
                    alt={`رفع جديد ${index + 1}`}
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <span className="text-white text-xs font-bold">جديد</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeImage(index, true)}
                    className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-3 h-3">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>

            {/* Upload Button */}
            <div className="flex items-center justify-center w-full">
              <label htmlFor="dropzone-file-products" className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100 transition-colors">
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                  <svg className="w-8 h-8 mb-4 text-gray-500" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 20 16">
                    <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 13h3a3 3 0 0 0 0-6h-.025A5.56 5.56 0 0 0 16 6.5 5.5 5.5 0 0 0 5.207 5.021C5.137 5.017 5.071 5 5 5a4 4 0 0 0 0 8h2.167M10 15V6m0 0L8 8m2-2 2 2" />
                  </svg>
                  <p className="mb-2 text-sm text-gray-500"><span className="font-semibold">انقر للرفع</span> أو اسحب وأفلت</p>
                  <p className="text-xs text-gray-500">SVG, PNG, JPG أو GIF (الحد الأقصى 800x400px)</p>
                </div>
                <input id="dropzone-file-products" type="file" className="hidden" accept="image/*" multiple onChange={handleFileChange} />
              </label>
            </div>

            <div className="text-xs text-gray-400">
              أو أدخل الروابط يدوياً (مفصولة بفاصلة):
              <input
                type="text"
                id="images"
                name="images"
                value={product.images.join(', ')}
                onChange={handleManualImageChange}
                placeholder="https://example.com/image1.jpg, https://example.com/image2.jpg"
                className="mt-1 w-full px-3 py-1 border border-gray-200 rounded text-xs focus:ring-1 focus:ring-gray-400 outline-none"
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {settings?.features?.category && (
            <div>
              <label htmlFor="category" className="block text-gray-700 text-sm font-bold mb-2">القسم</label>
              <select
                id="category"
                name="category"
                value={product.category}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent outline-none transition-all"
                required
              >
                <option value="">اختر القسم</option>
                {categories.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
            </div>
          )}

          {settings?.features?.collections && (
            <div>
              <label htmlFor="collectionId" className="block text-gray-700 text-sm font-bold mb-2">المجموعة (اختياري)</label>
              <select
                id="collectionId"
                name="collectionId"
                value={product.collectionId || ''}
                onChange={(e) => {
                  const value = e.target.value === '' ? undefined : e.target.value;
                  setProduct(prev => ({ ...prev, collectionId: value }));
                }}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent outline-none transition-all"
              >
                <option value="">اختر المجموعة</option>
                {collections.map(collection => (
                  <option key={collection.id} value={collection.id}>{collection.name}</option>
                ))}
              </select>
            </div>
          )}
        </div>

        {
          settings?.features?.brands && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="brandId" className="block text-gray-700 text-sm font-bold mb-2">الماركة (Brand)</label>
                <select
                  id="brandId"
                  name="brandId"
                  value={product.brandId || ''}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent outline-none transition-all"
                >
                  <option value="">اختر الماركة</option>
                  {brands.map(brand => (
                    <option key={brand.id} value={brand.id}>{brand.name}</option>
                  ))}
                </select>
              </div>
            </div>
          )
        }

        <div className="border-t border-gray-200 pt-6">
          <label className="block text-gray-700 text-sm font-bold mb-4">الخيارات (السمات والمتغيرات)</label>
          {product.variants.map((variant, index) => (
            <div key={variant.id} className="flex flex-col md:flex-row gap-4 mb-4 items-start md:items-center bg-gray-50 p-4 rounded-lg">
              {/* Variant Type Selector */}
              <div className="w-full md:w-1/4">
                <select
                  value={variant.name}
                  onChange={(e) => {
                    // Reset value when type changes
                    const newVariants = [...product.variants];
                    newVariants[index] = { ...newVariants[index], name: e.target.value, value: '' };
                    setProduct(prev => ({ ...prev, variants: newVariants }));
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded bg-white"
                >
                  <option value="Size">المقاس (Size)</option>
                  <option value="Color">اللون (Color)</option>
                  <option value="Material">الخامة (مخصص)</option>
                </select>
              </div>

              {/* Value Selector (Dynamic based on Type) */}
              <div className="w-full md:w-1/4">
                {variant.name === 'Size' ? (
                  <select
                    value={sizes.find(s => s.name === variant.value)?.id || ''}
                    onChange={(e) => handleVariantChange(index, 'sizeId', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded bg-white"
                  >
                    <option value="">اختر المقاس</option>
                    {sizes.map(size => (
                      <option key={size.id} value={size.id}>{size.name} ({size.code})</option>
                    ))}
                  </select>
                ) : variant.name === 'Color' ? (
                  <select
                    value={colors.find(c => c.name === variant.value)?.id || ''}
                    onChange={(e) => handleVariantChange(index, 'colorId', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded bg-white"
                  >
                    <option value="">اختر اللون</option>
                    {colors.map(color => (
                      <option key={color.id} value={color.id}>{color.name}</option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    placeholder="القيمة (مثال: قطن)"
                    value={variant.value}
                    onChange={(e) => handleVariantChange(index, 'value', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded"
                  />
                )}
              </div>

              <input
                type="number"
                placeholder="المخزون (Stock)"
                value={variant.stock}
                onChange={(e) => handleVariantChange(index, 'stock', parseFloat(e.target.value) || 0)}
                className="w-full md:w-1/4 px-3 py-2 border border-gray-300 rounded"
                min="0"
              />
              <input
                type="number"
                placeholder="السعر الإضافي"
                value={variant.extraPrice ?? ''}
                onChange={(e) => {
                  const val = e.target.value === '' ? undefined : parseFloat(e.target.value);
                  const newVariants = [...product.variants];
                  newVariants[index] = { ...newVariants[index], extraPrice: val } as ProductVariant;
                  setProduct(prev => ({ ...prev, variants: newVariants }));
                }}
                className="w-full md:w-1/4 px-3 py-2 border border-gray-300 rounded"
                min="0"
                step="0.01"
                title="السعر الإضافي يضاف إلى السعر الأساسي للمنتج (مثال: +200 للمقاس الكبير، 0 للمنتجات التي لا تحتوي على رسوم إضافية)"
              />
              <button
                type="button"
                onClick={() => removeVariant(index)}
                className="text-red-600 hover:text-red-800 font-medium px-2"
              >
                إزالة
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={addVariant}
            className="text-blue-600 hover:text-blue-800 font-medium flex items-center gap-2"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            إضافة خيار
          </button>
        </div>

        {/* SEO Configuration */}
        <div className="bg-gray-50 p-6 rounded-xl border border-gray-200">
          <h3 className="text-lg font-bold text-gray-900 mb-4">إعدادات تحسين محركات البحث (SEO)</h3>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">عنوان الميتا (Meta Title)</label>
              <input
                type="text"
                value={seoData.title}
                onChange={(e) => setSeoData(prev => ({ ...prev, title: e.target.value }))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent outline-none"
                placeholder={product.name || 'عنوان الميتا للمنتج'}
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">وصف الميتا (Meta Description)</label>
              <textarea
                value={seoData.description}
                onChange={(e) => setSeoData(prev => ({ ...prev, description: e.target.value }))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent outline-none h-24 resize-none"
                placeholder="وصف موجز لمحركات البحث..."
              ></textarea>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">الكلمات المفتاحية (مفصولة بفاصلة)</label>
              <input
                type="text"
                value={seoData.keywords}
                onChange={(e) => setSeoData(prev => ({ ...prev, keywords: e.target.value }))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent outline-none"
                placeholder="كلمة1, كلمة2, كلمة3"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">صورة الميتا</label>

              {/* Image Preview */}
              {(metaImagePreview || seoData.metaImage) && (
                <div className="relative w-full max-w-xs h-48 bg-gray-100 rounded-lg overflow-hidden border border-gray-200 mb-4 group">
                  <img
                    src={metaImagePreview || seoData.metaImage || '/placeholder.png'}
                    alt="معاينة صورة الميتا"
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={removeMetaImage}
                    className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-2 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              )}

              {/* Upload Button */}
              <div className="flex items-center justify-center w-full">
                <label htmlFor="dropzone-file-meta" className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100 transition-colors">
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    <svg className="w-8 h-8 mb-4 text-gray-500" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 20 16">
                      <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 13h3a3 3 0 0 0 0-6h-.025A5.56 5.56 0 0 0 16 6.5 5.5 5.5 0 0 0 5.207 5.021C5.137 5.017 5.071 5 5 5a4 4 0 0 0 0 8h2.167M10 15V6m0 0L8 8m2-2 2 2" />
                    </svg>
                    <p className="mb-2 text-sm text-gray-500"><span className="font-semibold">انقر للرفع</span> أو اسحب وأفلت</p>
                    <p className="text-xs text-gray-500">SVG, PNG, JPG أو GIF (الحد الأقصى 1200x630px)</p>
                  </div>
                  <input id="dropzone-file-meta" type="file" className="hidden" accept="image/*" onChange={handleMetaImageChange} />
                </label>
              </div>

              {/* Manual URL Input */}
              <div className="mt-2">
                <p className="text-xs text-gray-500 mb-1">أو أدخل الرابط يدوياً:</p>
                <input
                  type="text"
                  value={seoData.metaImage}
                  onChange={(e) => {
                    setSeoData(prev => ({ ...prev, metaImage: e.target.value }));
                    setMetaImageFile(null);
                    setMetaImagePreview(null);
                  }}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent outline-none text-sm"
                  placeholder="https://example.com/image.jpg"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">الرابط الأساسي (Canonical URL)</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={seoData.canonicalUrl || (product.slug && websiteUrl ? `${websiteUrl}/products/${product.slug}` : '')}
                  readOnly
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent outline-none bg-gray-50"
                  placeholder={websiteUrl ? `يتم توليده تلقائياً من رابط المنتج (${websiteUrl}/products/...)` : 'جاري تحميل رابط الموقع...'}
                />
                <button
                  type="button"
                  onClick={() => {
                    if (product.slug && websiteUrl) {
                      const autoUrl = `${websiteUrl}/products/${product.slug}`;
                      setSeoData(prev => ({ ...prev, canonicalUrl: autoUrl }));
                    }
                  }}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  title="إعادة التوليد من رابط المنتج"
                  disabled={!product.slug || !websiteUrl}
                >
                  تلقائي
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                يتم توليده تلقائياً من الرابط الدائم للمنتج. انقر على &quot;تلقائي&quot; لإعادة توليده.
              </p>
            </div>
          </div>
        </div>

        <div className="flex gap-6 border-t border-gray-200 pt-6">
          <label className="inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              name="isFeatured"
              checked={product.isFeatured}
              onChange={handleChange}
              className="form-checkbox h-5 w-5 text-blue-600 rounded focus:ring-blue-500"
            />
            <span className="ml-2 text-gray-700 font-medium">منتج مميز (Featured)</span>
          </label>
          <label className="inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              name="isActive"
              checked={product.isActive}
              onChange={handleChange}
              className="form-checkbox h-5 w-5 text-green-600 rounded focus:ring-green-500"
            />
            <span className="ml-2 text-gray-700 font-medium">منتج نشط</span>
          </label>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center sm:justify-between gap-3 sm:gap-4 pt-6 border-t border-gray-200">
          {productId && (
            <Link
              href={`/admin/products/templates/save?product=${productId}`}
              className="px-4 sm:px-6 py-2 border border-purple-300 text-purple-700 rounded-lg text-sm font-medium hover:bg-purple-50 transition-colors flex items-center justify-center gap-2"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m3.75 9v6m-3-3h6.375M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
              </svg>
              حفظ كقالب
            </Link>
          )}
          <div className="flex items-center gap-3 sm:gap-4 sm:ml-auto">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 sm:px-6 py-2 border border-gray-300 rounded-lg text-gray-700 text-sm font-medium hover:bg-gray-50 transition-colors"
              disabled={loading}
            >
              إلغاء
            </button>
            <button
              type="submit"
              className="px-4 sm:px-6 py-2 bg-gray-900 text-white rounded-lg text-sm font-semibold hover:bg-gray-800 transition-colors disabled:opacity-70 flex items-center justify-center gap-2"
              disabled={loading}
            >
              {loading ? (
                <>
                  <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  جاري الحفظ...
                </>
              ) : (
                productId ? 'تحديث المنتج' : 'إنشاء منتج'
              )}
            </button>
          </div>
        </div>
      </form >

      {/* Info Dialog */}
      < Dialog
        isOpen={showInfoDialog}
        onClose={() => setShowInfoDialog(false)}
        title={t('common.error') || 'خطأ'}
        message={infoDialogMessage}
        type="error"
        showCancel={false}
        confirmText={t('common.close') || 'إغلاق'}
      />
    </div >
  );
};

export default ProductForm;
