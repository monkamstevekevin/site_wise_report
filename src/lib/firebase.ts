
import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
// import { getFirestore, type Firestore } from 'firebase/firestore'; // Example for Firestore

// Configuration updated with provided project details from Firebase console.
const firebaseConfig = {
  apiKey: "AIzaSyCYLK-Ytm5GVCzYGSA3K9oTbr39A5mf8QE",
  authDomain: "sitewise-reports.firebaseapp.com",
  projectId: "sitewise-reports",
  storageBucket: "sitewise-reports.firebasestorage.app",
  messagingSenderId: "792660061825",
  appId: "1:792660061825:web:3781eb2c1a672030cfe780"
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
