
import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { getStorage, type FirebaseStorage } from 'firebase/storage'; // Ensured Storage import

// Configuration updated with provided project details from Firebase console.
const firebaseConfig = {
  apiKey: "AIzaSyCYLK-Ytm5GVCzYGSA3K9oTbr39A5mf8QE",
  authDomain: "sitewise-reports.firebaseapp.com",
  projectId: "sitewise-reports",
  storageBucket: "sitewise-reports.appspot.com", // Standard Firebase Storage bucket naming
  messagingSenderId: "792660061825",
  appId: "1:792660061825:web:3781eb2c1a672030cfe780"
};

let app: FirebaseApp;
let auth: Auth;
let db: Firestore;
let storage: FirebaseStorage; // Declare storage

if (!getApps().length) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApp();
}

auth = getAuth(app);
db = getFirestore(app);
storage = getStorage(app); // Initialize storage

export { app, auth, db, storage }; // Export storage
