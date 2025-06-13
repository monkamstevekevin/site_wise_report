
import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
// import { getFirestore, type Firestore } from 'firebase/firestore'; // Example for Firestore

// Configuration updated with provided project details.
// IMPORTANT: Please verify your `appId` from your Firebase project settings
// (Project settings -> General -> Your apps -> Web app config).
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyCYLK-Ytm5GVCzYGSA3K9oTbr39A5mf8QE",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "sitewise-reports.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "sitewise-reports",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "sitewise-reports.appspot.com",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "792660061825",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "YOUR_APP_ID_FROM_FIREBASE_CONSOLE", // <-- IMPORTANT: Replace this!
};

let app: FirebaseApp;
let auth: Auth;
// let db: Firestore; // Example for Firestore

if (!getApps().length) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApp();
}

auth = getAuth(app);
// db = getFirestore(app); // Example for Firestore

export { app, auth /*, db */ };

