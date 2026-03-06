'use client';

import React, { useState, useEffect } from 'react';
import { getProductQuestions, addProductQuestion } from '@/lib/firestore/reviews_enhanced_db';
import { ProductQA } from '@/lib/firestore/reviews_enhanced';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { useSettings } from '../context/SettingsContext';
import Dialog from './ui/Dialog';

interface ProductQAProps {
  productId: string;
}

const ProductQAComponent: React.FC<ProductQAProps> = ({ productId }) => {
  const { user, demoUser } = useAuth();
  const { settings } = useSettings();
  const { t } = useLanguage();
  const [questions, setQuestions] = useState<ProductQA[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [question, setQuestion] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showInfoDialog, setShowInfoDialog] = useState(false);

  useEffect(() => {
    const fetchQuestions = async () => {
      try {
        const fetchedQuestions = await getProductQuestions(productId, true);
        setQuestions(fetchedQuestions);
      } catch {
        // Failed to fetch questions
      } finally {
        setLoading(false);
      }
    };
    fetchQuestions();
  }, [productId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const userId = user?.uid || (settings?.demoMode && demoUser ? demoUser.uid : null);
    if (!userId || !question.trim()) return;

    setSubmitting(true);
    try {
      await addProductQuestion({
        productId,
        question: question.trim(),
        askedBy: userId,
        askedByName: user?.displayName || demoUser?.displayName || user?.email || demoUser?.phoneNumber || 'Anonymous',
        isPublic: true,
      });
      setQuestion('');
      setShowForm(false);
      const fetchedQuestions = await getProductQuestions(productId, true);
      setQuestions(fetchedQuestions);
    } catch {
      // Failed to submit question
      setShowInfoDialog(true);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="text-center py-4">جاري تحميل الأسئلة والأجوبة...</div>;
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-xl font-semibold">أسئلة وأجوبة</h3>
        {(user || (settings?.demoMode && demoUser)) && (
          <button
            onClick={() => setShowForm(!showForm)}
            className="text-blue-600 hover:text-blue-800 text-sm font-medium"
          >
            {showForm ? 'إلغاء' : 'اطرح سؤالاً'}
          </button>
        )}
      </div>

      {showForm && (user || (settings?.demoMode && demoUser)) && (
        <form onSubmit={handleSubmit} className="mb-6 p-4 bg-gray-50 rounded-lg">
          <textarea
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="اطرح سؤالاً حول هذا المنتج..."
            rows={3}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black outline-none mb-3"
            required
          />
          <button
            type="submit"
            disabled={submitting}
            className="bg-black text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-800 disabled:opacity-70"
          >
            {submitting ? 'جاري الإرسال...' : 'إرسال السؤال'}
          </button>
        </form>
      )}

      {questions.length === 0 ? (
        <p className="text-gray-500 text-center py-4">لا توجد أسئلة بعد. كن أول من يسأل!</p>
      ) : (
        <div className="space-y-4">
          {questions.map((qa) => (
            <div key={qa.id} className="border-b border-gray-200 pb-4 last:border-0">
              <div className="mb-2">
                <p className="font-medium text-gray-900">س: {qa.question}</p>
                <p className="text-xs text-gray-500 mt-1">سأله {qa.askedByName} • {qa.createdAt ? qa.createdAt.toDate().toLocaleDateString() : 'مؤخراً'}</p>
              </div>
              {qa.answer ? (
                <div className="ml-4 mt-2 p-3 bg-blue-50 rounded-lg">
                  <p className="font-medium text-gray-900 mb-1">ج: {qa.answer}</p>
                  <p className="text-xs text-gray-500">أجابه {qa.answeredByName} • {qa.answeredAt ? qa.answeredAt.toDate().toLocaleDateString() : ''}</p>
                </div>
              ) : (
                <p className="text-sm text-gray-500 ml-4 italic">لا توجد إجابة بعد.</p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Info Dialog */}
      <Dialog
        isOpen={showInfoDialog}
        onClose={() => setShowInfoDialog(false)}
        title={t('common.error') || 'خطأ'}
        message={t('products.qa.submit_failed') || 'فشل إرسال السؤال. الرجاء المحاولة مرة أخرى.'}
        type="error"
        showCancel={false}
        confirmText={t('common.close') || 'إغلاق'}
      />
    </div>
  );
};

export default ProductQAComponent;

