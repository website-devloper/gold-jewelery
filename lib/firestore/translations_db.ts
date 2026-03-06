import { db } from '../firebase';
import { collection, addDoc, getDocs, updateDoc, deleteDoc, doc, query, where, Timestamp } from 'firebase/firestore';
import { Translation } from './translations';

const translationsCollection = collection(db, 'translations');

// Create a translation
export const createTranslation = async (translation: Omit<Translation, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> => {
  const newTranslation: Omit<Translation, 'id'> = {
    ...translation,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  };
  const docRef = await addDoc(translationsCollection, newTranslation);
  return docRef.id;
};

// Get all translations for a language
export const getTranslationsByLanguage = async (languageCode: string, namespace?: string): Promise<Record<string, string>> => {
  let q;
  if (namespace) {
    q = query(
      translationsCollection,
      where('languageCode', '==', languageCode),
      where('namespace', '==', namespace)
    );
  } else {
    q = query(translationsCollection, where('languageCode', '==', languageCode));
  }
  
  const querySnapshot = await getDocs(q);
  const translations: Record<string, string> = {};
  
  querySnapshot.forEach((doc) => {
    const data = doc.data() as Translation;
    translations[data.key] = data.value;
  });
  
  return translations;
};

// Get translation by key and language
export const getTranslation = async (key: string, languageCode: string): Promise<string | null> => {
  const q = query(
    translationsCollection,
    where('key', '==', key),
    where('languageCode', '==', languageCode)
  );
  const querySnapshot = await getDocs(q);
  
  if (!querySnapshot.empty) {
    return querySnapshot.docs[0].data().value as string;
  }
  return null;
};

// Update translation
export const updateTranslation = async (id: string, updates: Partial<Omit<Translation, 'id' | 'createdAt'>>): Promise<void> => {
  const translationRef = doc(translationsCollection, id);
  await updateDoc(translationRef, {
    ...updates,
    updatedAt: Timestamp.now(),
  });
};

// Delete translation
export const deleteTranslation = async (id: string): Promise<void> => {
  const translationRef = doc(translationsCollection, id);
  await deleteDoc(translationRef);
};

// Get all translations (for admin)
export const getAllTranslations = async (languageCode?: string): Promise<Translation[]> => {
  let q;
  if (languageCode) {
    q = query(translationsCollection, where('languageCode', '==', languageCode));
  } else {
    q = query(translationsCollection);
  }
  
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  } as Translation));
};

// Bulk create translations
export const bulkCreateTranslations = async (translations: Omit<Translation, 'id' | 'createdAt' | 'updatedAt'>[]): Promise<string[]> => {
  const now = Timestamp.now();
  const ids: string[] = [];
  
  for (const translation of translations) {
    const newTranslation: Omit<Translation, 'id'> = {
      ...translation,
      createdAt: now,
      updatedAt: now,
    };
    const docRef = await addDoc(translationsCollection, newTranslation);
    ids.push(docRef.id);
  }
  
  return ids;
};

