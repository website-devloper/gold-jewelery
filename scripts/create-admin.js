/**
 * Create Admin Account Script
 * 
 * This script creates an admin account in Firebase Authentication
 * and stores user data in Firestore.
 * 
 * Prerequisites:
 * 1. Install dependencies: npm install firebase-admin readline-sync
 * 2. Get service account key from Firebase Console
 * 3. Save as 'service-account-key.json' in project root
 * 
 * Usage:
 * node scripts/create-admin.js
 */

const admin = require('firebase-admin');
const readline = require('readline-sync');
const fs = require('fs');
const path = require('path');

// Initialize Firebase Admin
let serviceAccount;

// Try to load service account key
try {
  serviceAccount = require('../service-account-key.json');
  console.log('✅ Found service-account-key.json\n');
} catch (error) {
  // Try environment variable
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    try {
      serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
      console.log('✅ Using service account from environment variable\n');
    } catch (parseError) {
      console.error('❌ Error: Invalid FIREBASE_SERVICE_ACCOUNT JSON');
      process.exit(1);
    }
  } else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    try {
      serviceAccount = require(process.env.GOOGLE_APPLICATION_CREDENTIALS);
      console.log('✅ Using service account from GOOGLE_APPLICATION_CREDENTIALS\n');
    } catch (fileError) {
      console.error('❌ Error: Cannot read service account file');
      process.exit(1);
    }
  } else {
    console.error('❌ Error: Service account key not found!');
    console.log('\n📝 Please use one of these methods:');
    console.log('\n   Method 1: Download service account key');
    console.log('   1. Go to Firebase Console > Project Settings > Service Accounts');
    console.log('   2. Click "Generate New Private Key"');
    console.log('   3. Save as "service-account-key.json" in project root');
    console.log('\n   Method 2: Use environment variable');
    console.log('   Set FIREBASE_SERVICE_ACCOUNT="{\\"type\\":\\"service_account\\",...}"');
    console.log('\n   Method 3: Use file path');
    console.log('   Set GOOGLE_APPLICATION_CREDENTIALS="/path/to/key.json"');
    process.exit(1);
  }
}

// Initialize Firebase Admin
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const auth = admin.auth();
const db = admin.firestore();

/**
 * Validate email format
 */
function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate phone number (basic validation)
 */
function isValidPhone(phone) {
  // Remove spaces, dashes, and plus signs for validation
  const cleaned = phone.replace(/[\s\-+]/g, '');
  return cleaned.length >= 10 && /^\d+$/.test(cleaned);
}

/**
 * Create admin account
 */
async function createAdminAccount() {
  console.log('='.repeat(60));
  console.log('🔐 Create Admin Account');
  console.log('='.repeat(60));
  console.log('\nPlease provide the following information:\n');

  // Get user input
  const name = readline.question('Full Name: ').trim();
  if (!name) {
    console.error('❌ Name is required!');
    process.exit(1);
  }

  const email = readline.questionEMail('Email Address: ').trim();
  if (!email || !isValidEmail(email)) {
    console.error('❌ Valid email address is required!');
    process.exit(1);
  }

  const phone = readline.question('Phone Number (with country code): ').trim();
  if (!phone || !isValidPhone(phone)) {
    console.error('❌ Valid phone number is required!');
    process.exit(1);
  }

  // Check if password should be auto-generated or user-provided
  const useAutoPassword = readline.keyInYNStrict('\nGenerate random password? (Y/N): ');
  
  let password;
  if (useAutoPassword) {
    // Generate random password
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    password = '';
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    console.log(`\n✅ Generated password: ${password}`);
    console.log('⚠️  Please save this password securely!');
  } else {
    password = readline.question('Password (min 6 characters): ', {
      hideEchoBack: true
    });
    if (!password || password.length < 6) {
      console.error('❌ Password must be at least 6 characters!');
      process.exit(1);
    }
    
    const confirmPassword = readline.question('Confirm Password: ', {
      hideEchoBack: true
    });
    if (password !== confirmPassword) {
      console.error('❌ Passwords do not match!');
      process.exit(1);
    }
  }

  console.log('\n⏳ Creating admin account...\n');

  try {
    // Check if user already exists
    let userRecord;
    try {
      userRecord = await auth.getUserByEmail(email);
      console.log('⚠️  User with this email already exists in Firebase Auth.');
      const useExisting = readline.keyInYNStrict('Do you want to make this user an admin? (Y/N): ');
      if (!useExisting) {
        console.log('❌ Operation cancelled.');
        process.exit(0);
      }
    } catch (error) {
      if (error.code === 'auth/user-not-found') {
        // User doesn't exist, create new user
        userRecord = await auth.createUser({
          email: email,
          password: password,
          phoneNumber: phone.startsWith('+') ? phone : `+${phone}`,
          displayName: name,
          emailVerified: true, // Auto-verify email for admin
        });
        console.log('✅ User created in Firebase Authentication');
      } else {
        throw error;
      }
    }

    // Check if user document exists in Firestore
    const userDocRef = db.collection('users').doc(userRecord.uid);
    const userDoc = await userDocRef.get();

    if (userDoc.exists) {
      // Update existing user document
      await userDocRef.update({
        role: 'admin',
        isAdmin: true,
        name: name,
        email: email,
        phone: phone,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      console.log('✅ Updated existing user document with admin role');
    } else {
      // Create new user document
      await userDocRef.set({
        id: userRecord.uid,
        name: name,
        email: email,
        phone: phone,
        role: 'admin',
        isAdmin: true,
        emailVerified: true,
        phoneVerified: false,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      console.log('✅ Created user document in Firestore');
    }

    console.log('\n' + '='.repeat(60));
    console.log('✅ Admin Account Created Successfully!');
    console.log('='.repeat(60));
    console.log('\n📋 Account Details:');
    console.log(`   Name: ${name}`);
    console.log(`   Email: ${email}`);
    console.log(`   Phone: ${phone}`);
    console.log(`   User ID: ${userRecord.uid}`);
    console.log(`   Role: Admin`);
    
    if (useAutoPassword) {
      console.log(`\n🔑 Password: ${password}`);
      console.log('⚠️  IMPORTANT: Save this password securely!');
    }
    
    console.log('\n📝 Next Steps:');
    console.log('   1. Start your dev server: npm run dev');
    console.log('   2. Go to http://localhost:3000/login');
    console.log('   3. Login with the email and password above');
    console.log('   4. You should see "Admin" link in navigation');
    console.log('   5. Access admin panel at http://localhost:3000/admin');
    console.log('\n');

  } catch (error) {
    console.error('\n❌ Error creating admin account:');
    
    if (error.code === 'auth/email-already-exists') {
      console.error('   Email is already registered. Please use a different email.');
    } else if (error.code === 'auth/invalid-email') {
      console.error('   Invalid email address format.');
    } else if (error.code === 'auth/weak-password') {
      console.error('   Password is too weak. Please use a stronger password.');
    } else if (error.code === 'auth/invalid-phone-number') {
      console.error('   Invalid phone number format. Use format: +1234567890');
    } else {
      console.error(`   ${error.message}`);
    }
    
    console.log('\n💡 Tip: Check Firebase Console > Authentication to see if user was created.');
    process.exit(1);
  }
}

// Run the script
createAdminAccount()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('Unexpected error:', error);
    process.exit(1);
  });

