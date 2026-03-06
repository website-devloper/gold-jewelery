# Scripts Directory

This directory contains utility scripts for the Pardah E-commerce Platform.

## 📜 Available Scripts

### 1. create-admin.js

Creates an admin account in Firebase Authentication and Firestore.

**Usage:**
```bash
npm run create-admin
# or
node scripts/create-admin.js
```

**What it does:**
- Prompts for admin details (name, email, phone, password)
- Creates user in Firebase Authentication
- Creates/updates user document in Firestore with `role: 'admin'` and `isAdmin: true`
- Auto-verifies email for admin accounts

**Prerequisites:**
- Service account key (`service-account-key.json` in project root)
- Or set `FIREBASE_SERVICE_ACCOUNT` environment variable
- Or set `GOOGLE_APPLICATION_CREDENTIALS` environment variable

**Install dependencies:**
```bash
npm install readline-sync
```

**Example:**
```bash
$ npm run create-admin

============================================================
🔐 Create Admin Account
============================================================

Please provide the following information:

Full Name: John Doe
Email Address: admin@example.com
Phone Number (with country code): +1234567890

Generate random password? (Y/N): Y

✅ Generated password: Abc123!@#xyz
⚠️  Please save this password securely!

⏳ Creating admin account...

✅ User created in Firebase Authentication
✅ Created user document in Firestore

============================================================
✅ Admin Account Created Successfully!
============================================================

📋 Account Details:
   Name: John Doe
   Email: admin@example.com
   Phone: +1234567890
   User ID: abc123xyz...
   Role: Admin

🔑 Password: Abc123!@#xyz
⚠️  IMPORTANT: Save this password securely!

📝 Next Steps:
   1. Start your dev server: npm run dev
   2. Go to http://localhost:3000/login
   3. Login with the email and password above
   4. You should see "Admin" link in navigation
   5. Access admin panel at http://localhost:3000/admin
```

---

### 2. copy-next-build.js

Copies Next.js build output to Firebase Functions directory for deployment.

**Usage:**
```bash
npm run build:firebase
```

---

### 3. backup-firestore.js

Backs up Firestore database.

**Usage:**
```bash
node scripts/backup-firestore.js
```

---

## 🔧 Setup

### Install Script Dependencies

```bash
npm install readline-sync
```

### Get Service Account Key

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Go to **Project Settings** > **Service Accounts**
4. Click **"Generate New Private Key"**
5. Save as `service-account-key.json` in project root

**⚠️ Important:** Never commit `service-account-key.json` to version control!

---

## 📝 Notes

- All scripts use Firebase Admin SDK
- Scripts require service account key for authentication
- Scripts are designed for one-time setup or maintenance tasks
- Always test scripts in development environment first

---

## 🆘 Troubleshooting

**Error: "Cannot find module 'readline-sync'"**
```bash
npm install readline-sync
```

**Error: "Service account key not found"**
- Ensure `service-account-key.json` is in project root
- Or set environment variable `FIREBASE_SERVICE_ACCOUNT`
- Or set `GOOGLE_APPLICATION_CREDENTIALS` to key file path

**Error: "User already exists"**
- Script will ask if you want to make existing user admin
- Or use different email address

---

For more information, see [INSTALLATION.html](../INSTALLATION.html)

