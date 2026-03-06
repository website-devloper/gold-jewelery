import { db } from '../firebase';
import { collection, getDocs, Timestamp, doc, setDoc, getDoc, updateDoc, increment, addDoc, deleteDoc } from "firebase/firestore";

export interface User {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  phoneNumber: string | null;
  address?: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
  isAdmin?: boolean;
  role?: 'admin' | 'customer' | string;
  loginType?: 'google' | 'email' | 'phone'; // Track how user created account
  createdAt: Timestamp | { toDate: () => Date } | null;
  updatedAt?: Timestamp;
  walletBalance?: number;
  loyaltyPoints?: number;
  isBlocked?: boolean;
}

export interface UserProfile {
  uid: string;
  displayName: string | null;
  email: string;
  phoneNumber: string | null;
  photoURL?: string | null;
  role: 'admin' | 'customer';
  createdAt: {
    toDate: () => Date;
  } | null;
  isBlocked?: boolean;
  walletBalance?: number;
  loyaltyPoints?: number;
  address?: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
}

export const getAllUsers = async (): Promise<UserProfile[]> => {
  const querySnapshot = await getDocs(collection(db, 'users'));
  return querySnapshot.docs.map(doc => {
      const data = doc.data();
      return {
          uid: doc.id,
          displayName: data.displayName || null,
          email: data.email || '',
          phoneNumber: data.phoneNumber || null,
          role: (data.isAdmin ? 'admin' : 'customer') as 'admin' | 'customer',
          createdAt: data.createdAt ? { toDate: () => data.createdAt.toDate() } : null,
          isBlocked: data.isBlocked || false,
      } as UserProfile;
  });
};

export const createUserProfile = async (user: User, isDemoMode?: boolean) => {
  const userRef = doc(db, 'users', user.uid);
  // Check if user exists first to not overwrite wallet/points
  const userSnap = await getDoc(userRef);
  
  if (userSnap.exists()) {
      // Update only basic info, keep wallet/points
      const existingData = userSnap.data();
      
      // In demo mode, use setDoc with merge instead of updateDoc (no auth required)
      if (isDemoMode) {
        await setDoc(userRef, {
          ...user,
          walletBalance: existingData.walletBalance || 0,
          loyaltyPoints: existingData.loyaltyPoints || 0,
          updatedAt: Timestamp.now()
        }, { merge: true });
      } else {
        await updateDoc(userRef, {
          ...user,
          walletBalance: existingData.walletBalance || 0,
          loyaltyPoints: existingData.loyaltyPoints || 0,
          updatedAt: Timestamp.now()
        });
      }
  } else {
      // New user - setDoc works for both demo and normal mode
      await setDoc(userRef, {
          ...user,
          walletBalance: 0,
          loyaltyPoints: 0
      });
  }
};

// Wallet & Loyalty Functions

export const getUserProfile = async (uid: string): Promise<UserProfile | null> => {
    const userRef = doc(db, 'users', uid);
    const userSnap = await getDoc(userRef);
    if (userSnap.exists()) {
        const data = userSnap.data();
        return {
            uid: data.uid || uid,
            displayName: data.displayName || null,
            email: data.email || '',
            phoneNumber: data.phoneNumber || null,
            photoURL: data.photoURL || null,
            role: (data.isAdmin ? 'admin' : 'customer') as 'admin' | 'customer',
            createdAt: data.createdAt ? { toDate: () => data.createdAt.toDate() } : null,
            isBlocked: data.isBlocked || false,
            walletBalance: data.walletBalance || 0,
            loyaltyPoints: data.loyaltyPoints || 0,
            address: data.address || undefined,
        } as UserProfile;
    }
    return null;
};

export const addFundsToWallet = async (uid: string, amount: number) => {
    const userRef = doc(db, 'users', uid);
    await updateDoc(userRef, {
        walletBalance: increment(amount),
        updatedAt: Timestamp.now()
    });
};

export const deductFundsFromWallet = async (uid: string, amount: number) => {
    const userRef = doc(db, 'users', uid);
    // You might want to check balance first, but for simplicity here:
    await updateDoc(userRef, {
        walletBalance: increment(-amount),
        updatedAt: Timestamp.now()
    });
};

export const addLoyaltyPoints = async (uid: string, points: number) => {
    const userRef = doc(db, 'users', uid);
    await updateDoc(userRef, {
        loyaltyPoints: increment(points),
        updatedAt: Timestamp.now()
    });
};

export const redeemLoyaltyPoints = async (uid: string, points: number, conversionRate: number = 1) => {
    
    const userRef = doc(db, 'users', uid);
    const userSnap = await getDoc(userRef);
    
    if (!userSnap.exists()) throw new Error("User not found");
    
    const data = userSnap.data();
    const currentPoints = data.loyaltyPoints || 0;
    
    if (currentPoints < points) {
        throw new Error("Insufficient loyalty points");
    }
    
    const walletAmount = points * conversionRate;
    
    await updateDoc(userRef, {
        loyaltyPoints: increment(-points),
        walletBalance: increment(walletAmount),
        updatedAt: Timestamp.now()
    });
    
    return walletAmount;
};

// User Management Functions (from users_db.ts)

export const addUser = async (userData: Omit<UserProfile, 'uid' | 'createdAt'>): Promise<UserProfile> => {
  const now = Timestamp.now();
  const newUserData = {
    ...userData,
    role: userData.role || 'customer',
    isBlocked: false,
    createdAt: now,
    updatedAt: now,
  };
  const docRef = await addDoc(collection(db, 'users'), newUserData);
  return { 
    ...userData,
    uid: docRef.id, 
    createdAt: { toDate: () => now.toDate() },
    role: userData.role || 'customer',
    isBlocked: false,
  };
};

export const updateUser = async (uid: string, userData: Partial<UserProfile>): Promise<void> => {
  const userDocRef = doc(db, 'users', uid);
  await updateDoc(userDocRef, {
    ...userData,
    updatedAt: Timestamp.now(),
  });
};

export const blockUser = async (uid: string, isBlocked: boolean): Promise<void> => {
  const userDocRef = doc(db, 'users', uid);
  await updateDoc(userDocRef, { 
    isBlocked,
    updatedAt: Timestamp.now(),
  });
};

export const deleteUser = async (uid: string): Promise<void> => {
  const userDocRef = doc(db, 'users', uid);
  await deleteDoc(userDocRef);
};
