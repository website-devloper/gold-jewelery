'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { db } from '@/lib/firebase';
import { collection, doc, getDocs, setDoc, Timestamp } from 'firebase/firestore';
import { useLanguage } from '@/context/LanguageContext';
import { getSettings } from '@/lib/firestore/settings_db';
import { Settings, defaultSettings } from '@/lib/firestore/settings';
import Dialog from '@/components/ui/Dialog';

type BackupDoc = Record<string, unknown>;

type BackupFile = {
  schemaVersion: 1;
  createdAt: string; // ISO
  collections: Record<string, Record<string, BackupDoc>>; // collection -> docId -> data
};

const getCollections = (t: (key: string) => string): Array<{ key: string; label: string }> => [
  { key: 'settings', label: t('admin.backup_collection_settings') || 'الإعدادات' },
  { key: 'languages', label: t('admin.backup_collection_languages') || 'اللغات' },
  { key: 'currencies', label: t('admin.backup_collection_currencies') || 'العملات' },
  { key: 'currency_conversions', label: 'Currency Conversions' },
  { key: 'tax_rates', label: 'Tax Rates' },
  { key: 'local_payment_methods', label: 'Local Payment Methods' },
  { key: 'payment_gateways', label: 'Payment Gateways' },

  { key: 'products', label: 'Products' },
  { key: 'categories', label: 'Categories' },
  { key: 'brands', label: 'Brands' },
  { key: 'collections', label: 'Collections' },
  { key: 'product_templates', label: 'Product Templates' },
  { key: 'product_bundles', label: 'Product Bundles' },
  { key: 'banners', label: 'Banners' },
  { key: 'coupons', label: 'Coupons' },

  { key: 'orders', label: 'Orders' },
  { key: 'users', label: 'Users' },
  { key: 'staff', label: 'Staff' },
  { key: 'role_permissions', label: 'Role Permissions' },
  { key: 'two_factor_auth', label: '2FA' },
  { key: 'activity_logs', label: 'Activity Logs' },

  { key: 'shipping_zones', label: 'Shipping Zones' },
  { key: 'shipping_rates', label: 'Shipping Rates' },
  { key: 'shipping_carriers', label: 'Shipping Carriers' },
  { key: 'order_tracking', label: 'Order Tracking' },

  { key: 'warehouses', label: 'Warehouses' },
  { key: 'stock_transfers', label: 'Stock Transfers' },
  { key: 'stock_adjustments', label: 'Stock Adjustments' },
  { key: 'stock_history', label: 'Stock History' },
  { key: 'inventory_alerts', label: 'Inventory Alerts' },
  { key: 'suppliers', label: 'Suppliers' },
  { key: 'purchase_orders', label: 'Purchase Orders' },

  { key: 'store_locations', label: 'Store Locations' },
  { key: 'contact_submissions', label: 'Contact Submissions' },
  { key: 'newsletter_subscriptions', label: 'Newsletter Subscriptions' },
  { key: 'job_applications', label: 'Job Applications' },

  { key: 'translations', label: 'Translations' },

  { key: 'reviews', label: 'Reviews' },
  { key: 'product_qa', label: 'Product Q&A' },
  { key: 'user_generated_content', label: 'UGC' },

  { key: 'user_addresses', label: 'User Addresses' },
  { key: 'user_preferences', label: 'User Preferences' },
  { key: 'refunds', label: 'Refunds' },
  { key: 'return_exchange_requests', label: 'Return/Exchange Requests' },

  { key: 'email_campaigns', label: 'Email Campaigns' },
  { key: 'push_notification_campaigns', label: 'Push Campaigns' },
  { key: 'abandoned_carts', label: 'Abandoned Carts' },
  { key: 'flash_sales', label: 'Flash Sales' },
  { key: 'free_shipping_rules', label: 'Free Shipping Rules' },

  { key: 'email_notifications', label: 'Email Notifications' },
  { key: 'push_notifications', label: 'Push Notifications' },
  { key: 'chat_sessions', label: 'Chat Sessions' },

  { key: 'seo_settings', label: 'SEO Settings' },
  { key: 'page_seo', label: 'Page SEO' },
  { key: 'product_seo', label: 'Product SEO' },
  { key: 'category_seo', label: 'Category SEO' },
  { key: 'brand_seo', label: 'Brand SEO' },
  { key: 'collection_seo', label: 'Collection SEO' },
  { key: 'blog_seo', label: 'Blog SEO' },

  { key: 'marketing_campaigns', label: 'Marketing Campaigns' },
  { key: 'custom_report_templates', label: 'Custom Report Templates' },
  { key: 'scheduled_reports', label: 'Scheduled Reports' },
];

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function serializeFirestoreValue(value: unknown): unknown {
  if (value instanceof Timestamp) {
    return { __type: 'timestamp', seconds: value.seconds, nanoseconds: value.nanoseconds };
  }
  if (value instanceof Date) {
    return { __type: 'date', iso: value.toISOString() };
  }
  if (Array.isArray(value)) return value.map(serializeFirestoreValue);
  if (isPlainObject(value)) {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) out[k] = serializeFirestoreValue(v);
    return out;
  }
  return value;
}

function deserializeFirestoreValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(deserializeFirestoreValue);
  if (isPlainObject(value)) {
    if (value.__type === 'timestamp' && typeof value.seconds === 'number' && typeof value.nanoseconds === 'number') {
      return new Timestamp(value.seconds, value.nanoseconds);
    }
    if (value.__type === 'date' && typeof value.iso === 'string') {
      const d = new Date(value.iso);
      return Number.isNaN(d.getTime()) ? value : d;
    }
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) out[k] = deserializeFirestoreValue(v);
    return out;
  }
  return value;
}

async function downloadTextFile(filename: string, text: string) {
  const blob = new Blob([text], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function parseHashParams(hash: string): Record<string, string> {
  const h = hash.startsWith('#') ? hash.slice(1) : hash;
  const params = new URLSearchParams(h);
  const out: Record<string, string> = {};
  params.forEach((v, k) => {
    out[k] = v;
  });
  return out;
}

const BackupRestorePage = () => {
  const { t } = useLanguage();
  const COLLECTIONS = getCollections(t);
  const [selectedCollections, setSelectedCollections] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    for (const c of COLLECTIONS) initial[c.key] = true;
    return initial;
  });

  const [isBackingUp, setIsBackingUp] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [backupJson, setBackupJson] = useState<string>('');
  const [status, setStatus] = useState<string | null>(null);
  const [settings, setSettings] = useState<Settings>(defaultSettings);
  const [showInfoDialog, setShowInfoDialog] = useState(false);
  const [infoDialogMessage, setInfoDialogMessage] = useState('');
  const [infoDialogType, setInfoDialogType] = useState<'success' | 'error'>('error');

  // Google Drive
  const [googleToken, setGoogleToken] = useState<string | null>(null);
  const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '';

  // Dropbox
  const [dropboxToken, setDropboxToken] = useState<string | null>(null);
  const dropboxAppKey = process.env.NEXT_PUBLIC_DROPBOX_APP_KEY || '';

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const selectedKeys = useMemo(
    () => COLLECTIONS.filter(c => selectedCollections[c.key]).map(c => c.key),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [selectedCollections]
  );

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const data = await getSettings();
      if (data) {
        setSettings({ ...defaultSettings, ...data });
      }
    } catch {
      // Failed to fetch settings
    }
  };

  // Handle OAuth redirect fragments
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const hash = window.location.hash;
    if (!hash) return;
    const params = parseHashParams(hash);
    if (params.access_token && params.token_type?.toLowerCase() === 'bearer') {
      // Heuristic: Dropbox returns account_id, uid, etc. Google (implicit) returns none, but we don't use implicit for Google.
      if (params.account_id || params.uid) {
        sessionStorage.setItem('dropbox_access_token', params.access_token);
        setDropboxToken(params.access_token);
        setStatus('Dropbox connected.');
      }
      // clear hash
      window.history.replaceState({}, document.title, window.location.pathname + window.location.search);
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const dt = sessionStorage.getItem('dropbox_access_token');
    if (dt) setDropboxToken(dt);
  }, []);

  const exportBackup = useCallback(async (): Promise<BackupFile> => {
    const backup: BackupFile = {
      schemaVersion: 1,
      createdAt: new Date().toISOString(),
      collections: {},
    };

    for (const colName of selectedKeys) {
      const snap = await getDocs(collection(db, colName));
      const docs: Record<string, BackupDoc> = {};
      snap.forEach(d => {
        const raw = d.data();
        docs[d.id] = serializeFirestoreValue(raw) as BackupDoc;
      });
      backup.collections[colName] = docs;
    }

    return backup;
  }, [selectedKeys]);

  const handleCreateBackup = useCallback(async () => {
    // Check if demo mode is enabled
    if (settings.demoMode) {
      setInfoDialogMessage(t('admin.settings.save_disabled_demo') || 'حفظ الإعدادات معطّل في الوضع التجريبي.');
      setInfoDialogType('error');
      setShowInfoDialog(true);
      return;
    }
    setIsBackingUp(true);
    setStatus(null);
    try {
      const data = await exportBackup();
      const json = JSON.stringify(data, null, 2);
      setBackupJson(json);
      setStatus(`Backup ready. Collections: ${Object.keys(data.collections).length}`);
    } catch {
      // Failed to create backup
      setStatus('Backup failed. Check console.');
    } finally {
      setIsBackingUp(false);
    }
  }, [exportBackup, settings.demoMode, t]);

  const handleDownloadBackup = useCallback(async () => {
    if (!backupJson) {
      setStatus('Create a backup first.');
      return;
    }
    const filename = `pardah-backup-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
    await downloadTextFile(filename, backupJson);
  }, [backupJson]);

  const restoreFromBackupObject = useCallback(async (backup: BackupFile) => {
    if (!backup?.collections || typeof backup.schemaVersion !== 'number') {
      throw new Error('Invalid backup format');
    }

    for (const [collectionName, docsMap] of Object.entries(backup.collections)) {
      if (!selectedCollections[collectionName]) continue;
      for (const [docId, docData] of Object.entries(docsMap || {})) {
        const restored = deserializeFirestoreValue(docData) as Record<string, unknown>;
        await setDoc(doc(db, collectionName, docId), restored, { merge: false });
      }
    }
  }, [selectedCollections]);

  const handleRestore = useCallback(async (file?: File) => {
    // Check if demo mode is enabled
    if (settings.demoMode) {
      setInfoDialogMessage(t('admin.settings.save_disabled_demo') || 'حفظ الإعدادات معطّل في الوضع التجريبي.');
      setInfoDialogType('error');
      setShowInfoDialog(true);
      return;
    }
    setIsRestoring(true);
    setStatus(null);
    try {
      const f = file || fileInputRef.current?.files?.[0];
      if (!f) {
        setInfoDialogMessage(t('admin.backup_select_file_error') || 'يرجى اختيار ملف نسخ احتياطي.');
        setInfoDialogType('error');
        setShowInfoDialog(true);
        return;
      }

      const text = await f.text();
      const parsed = JSON.parse(text) as BackupFile;

      const ok = window.confirm(
        t('admin.backup_restore_confirm') || 'ستؤدي الاستعادة إلى استبدال المستندات الموجودة (نفس المعرفات) في المجموعات المحددة. يكمل؟'
      );
      if (!ok) {
        setIsRestoring(false);
        return;
      }

      await restoreFromBackupObject(parsed);
      setStatus('Restore completed.');
      setInfoDialogMessage('Restore completed successfully.');
      setInfoDialogType('success');
      setShowInfoDialog(true);
    } catch {
      // Failed to restore
      setStatus('Restore failed. Check console.');
      setInfoDialogMessage('Restore failed. Check console.');
      setInfoDialogType('error');
      setShowInfoDialog(true);
    } finally {
      setIsRestoring(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }, [restoreFromBackupObject, settings.demoMode, t]);

  // Google Drive upload via GIS token client
  const ensureGoogleScript = useCallback(async () => {
    if ((window as unknown as { google?: unknown }).google) return;
    await new Promise<void>((resolve, reject) => {
      const s = document.createElement('script');
      s.src = 'https://accounts.google.com/gsi/client';
      s.async = true;
      s.onload = () => resolve();
      s.onerror = () => reject(new Error('Failed to load Google Identity script'));
      document.head.appendChild(s);
    });
  }, []);

  const connectGoogle = useCallback(async () => {
    if (!googleClientId) {
      setStatus('Missing NEXT_PUBLIC_GOOGLE_CLIENT_ID');
      return;
    }
    setStatus(null);
    try {
      await ensureGoogleScript();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const googleAny = (window as any).google;
      const tokenClient = googleAny.accounts.oauth2.initTokenClient({
        client_id: googleClientId,
        scope: 'https://www.googleapis.com/auth/drive.file',
        callback: (resp: { access_token?: string; error?: string }) => {
          if (resp?.access_token) {
            setGoogleToken(resp.access_token);
            setStatus('Google Drive connected.');
          } else {
            setStatus(resp?.error || 'Google auth failed.');
          }
        },
      });
      tokenClient.requestAccessToken();
    } catch {
      // Failed to connect Google
      setStatus('Google connect failed. Check console.');
    }
  }, [ensureGoogleScript, googleClientId]);

  const uploadToGoogleDrive = useCallback(async () => {
    // Check if demo mode is enabled
    if (settings.demoMode) {
      setInfoDialogMessage(t('admin.settings.save_disabled_demo') || 'حفظ الإعدادات معطّل في الوضع التجريبي.');
      setInfoDialogType('error');
      setShowInfoDialog(true);
      return;
    }
    if (!backupJson) {
      setStatus('Create a backup first.');
      return;
    }
    if (!googleToken) {
      setStatus('Connect Google Drive first.');
      return;
    }

    setStatus('Uploading to Google Drive...');
    try {
      const boundary = '-------pardahBoundary' + Math.random().toString(16).slice(2);
      const metadata = {
        name: `pardah-backup-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}.json`,
        mimeType: 'application/json',
      };
      const multipartBody =
        `--${boundary}\r\n` +
        `Content-Type: application/json; charset=UTF-8\r\n\r\n` +
        `${JSON.stringify(metadata)}\r\n` +
        `--${boundary}\r\n` +
        `Content-Type: application/json\r\n\r\n` +
        `${backupJson}\r\n` +
        `--${boundary}--`;

      const res = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${googleToken}`,
          'Content-Type': `multipart/related; boundary=${boundary}`,
        },
        body: multipartBody,
      });
      if (!res.ok) {
        const t = await res.text();
        throw new Error(t || 'Google Drive upload failed');
      }
      setStatus('Uploaded to Google Drive (drive.file).');
    } catch {
      // Failed to upload to Google Drive
      setStatus('Google Drive upload failed. Check console.');
    }
  }, [backupJson, googleToken, settings.demoMode, t]);

  const connectDropbox = useCallback(() => {
    if (!dropboxAppKey) {
      setStatus('Missing NEXT_PUBLIC_DROPBOX_APP_KEY');
      return;
    }
    const redirectUri = window.location.origin + '/admin/settings/backup-restore';
    const authUrl =
      `https://www.dropbox.com/oauth2/authorize` +
      `?client_id=${encodeURIComponent(dropboxAppKey)}` +
      `&response_type=token` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}`;
    window.location.href = authUrl;
  }, [dropboxAppKey]);

  const uploadToDropbox = useCallback(async () => {
    // Check if demo mode is enabled
    if (settings.demoMode) {
      setInfoDialogMessage(t('admin.settings.save_disabled_demo') || 'حفظ الإعدادات معطّل في الوضع التجريبي.');
      setInfoDialogType('error');
      setShowInfoDialog(true);
      return;
    }
    if (!backupJson) {
      setStatus('Create a backup first.');
      return;
    }
    if (!dropboxToken) {
      setStatus('Connect Dropbox first.');
      return;
    }

    setStatus('Uploading to Dropbox...');
    try {
      const filename = `/pardah-backup-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}.json`;
      const res = await fetch('https://content.dropboxapi.com/2/files/upload', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${dropboxToken}`,
          'Content-Type': 'application/octet-stream',
          'Dropbox-API-Arg': JSON.stringify({
            path: filename,
            mode: 'add',
            autorename: true,
            mute: false,
          }),
        },
        body: backupJson,
      });
      if (!res.ok) {
        const t = await res.text();
        throw new Error(t || 'Dropbox upload failed');
      }
      setStatus('Uploaded to Dropbox.');
    } catch {
      // Failed to upload to Dropbox
      setStatus('Dropbox upload failed. Check console.');
    }
  }, [backupJson, dropboxToken, settings.demoMode, t]);

  const toggleAll = (value: boolean) => {
    const next: Record<string, boolean> = {};
    for (const c of COLLECTIONS) next[c.key] = value;
    setSelectedCollections(next);
  };

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-semibold text-gray-900">
          {t('admin.backup_restore') || 'النسخ الاحتياطي والاستعادة'}
        </h1>
        <p className="text-gray-600 text-sm mt-1">
          {t('admin.backup_restore_subtitle') || 'النسخ الاحتياطي لـ Firestore كـ JSON (مجموعات محددة). ستؤدي الاستعادة إلى استبدال المستندات التي لها نفس المعرفات.'}
        </p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
          <h2 className="text-base sm:text-lg font-semibold text-gray-900">{t('admin.backup_collections_title') || 'المجموعات'}</h2>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => toggleAll(true)}
              className="px-3 py-2 text-sm font-medium border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              {t('admin.backup_select_all') || 'تحديد الكل'}
            </button>
            <button
              type="button"
              onClick={() => toggleAll(false)}
              className="px-3 py-2 text-sm font-medium border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              {t('admin.backup_clear') || 'مسح'}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 max-h-[320px] overflow-auto pr-2">
          {COLLECTIONS.map(c => (
            <label key={c.key} className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-50">
              <input
                type="checkbox"
                checked={!!selectedCollections[c.key]}
                onChange={(e) => setSelectedCollections(prev => ({ ...prev, [c.key]: e.target.checked }))}
              />
              <span className="text-sm text-gray-800">{c.label}</span>
              <span className="text-xs text-gray-400 ml-auto">{c.key}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6 mb-6 space-y-4">
        <h2 className="text-base sm:text-lg font-semibold text-gray-900">{t('admin.backup_title') || 'نسخ احتياطي'}</h2>

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={handleCreateBackup}
            disabled={isBackingUp || selectedKeys.length === 0 || settings.demoMode}
            className="px-4 sm:px-5 py-2.5 bg-gray-900 text-white rounded-lg text-sm font-semibold disabled:opacity-60 hover:bg-gray-800 transition-colors"
          >
            {isBackingUp ? (t('admin.backup_creating') || 'جاري الإنشاء...') : (t('admin.backup_create_button') || 'إنشاء نسخة احتياطية')}
          </button>
          <button
            type="button"
            onClick={handleDownloadBackup}
            disabled={!backupJson || settings.demoMode}
            className="px-4 sm:px-5 py-2.5 border border-gray-300 rounded-lg text-sm font-semibold disabled:opacity-60 hover:bg-gray-50 transition-colors"
          >
            {t('admin.backup_download_json') || 'تحميل جيسون'}
          </button>
        </div>

        <div className="border-t pt-4">
          <h3 className="text-xs sm:text-sm font-semibold text-gray-700 mb-2 uppercase tracking-wider">{t('admin.backup_cloud') || 'سحاب'}</h3>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={connectGoogle}
              className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
            >
              {googleToken ? (t('admin.backup_google_connected') || 'جوجل متصل') : (t('admin.backup_connect_google') || 'قم بتوصيل جوجل درايف')}
            </button>
            <button
              type="button"
              onClick={uploadToGoogleDrive}
              disabled={!backupJson || !googleToken || settings.demoMode}
              className="px-4 py-2 bg-gray-900 text-white rounded-lg text-sm font-semibold disabled:opacity-60 hover:bg-gray-800 transition-colors"
            >
              {t('admin.backup_upload_google') || 'ارفع إلى جوجل درايف'}
            </button>

            <button
              type="button"
              onClick={connectDropbox}
              className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
            >
              {dropboxToken ? (t('admin.backup_dropbox_connected') || 'دروببوإكس متصل') : (t('admin.backup_connect_dropbox') || 'ربط دروببوإكس')}
            </button>
            <button
              type="button"
              onClick={uploadToDropbox}
              disabled={!backupJson || !dropboxToken || settings.demoMode}
              className="px-4 py-2 bg-gray-900 text-white rounded-lg text-sm font-semibold disabled:opacity-60 hover:bg-gray-800 transition-colors"
            >
              {t('admin.backup_upload_dropbox') || 'رفع إلى Dropbox'}
            </button>
          </div>

          <p className="text-xs text-gray-500 mt-3">
            Env vars needed: <code className="px-1 py-0.5 bg-gray-100 rounded">NEXT_PUBLIC_GOOGLE_CLIENT_ID</code> and{' '}
            <code className="px-1 py-0.5 bg-gray-100 rounded">NEXT_PUBLIC_DROPBOX_APP_KEY</code>
          </p>
        </div>

        {backupJson && (
          <details className="mt-2">
            <summary className="cursor-pointer text-sm text-blue-600 hover:text-blue-800">
              {t('admin.backup_preview_json') || 'معاينة النسخة الاحتياطية JSON'}
            </summary>
            <pre className="mt-2 text-xs bg-gray-50 border border-gray-200 rounded-lg p-3 overflow-auto max-h-[260px]">
              {backupJson}
            </pre>
          </details>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6 mb-6 space-y-4">
        <h2 className="text-base sm:text-lg font-semibold text-gray-900">{t('admin.backup_restore_title') || 'استعادة'}</h2>
        <p className="text-sm text-gray-600">
          {t('admin.backup_restore_description') || 'حدد ملف نسخة احتياطية JSON واستعادته إلى المجموعات المحددة.'}
        </p>

        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <input ref={fileInputRef} type="file" accept="application/json" className="text-sm w-full sm:w-auto" />
          <button
            type="button"
            onClick={() => handleRestore()}
            disabled={isRestoring || settings.demoMode}
            className="px-4 sm:px-5 py-2.5 bg-red-600 text-white rounded-lg text-sm font-semibold disabled:opacity-60 hover:bg-red-700 transition-colors"
          >
            {isRestoring ? (t('admin.backup_restoring') || 'جارٍ الاستعادة...') : (t('admin.backup_restore_button') || 'استعادة النسخة الاحتياطية')}
          </button>
        </div>
      </div>

      {status && (
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 text-sm text-gray-800">
          {status}
        </div>
      )}

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

export default BackupRestorePage;


