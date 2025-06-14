
'use server';

import { auth, db } from '@/lib/firebase';
import type { User, UserRole } from '@/lib/types';
import { collection, getDocs, doc, getDoc, Timestamp, query, setDoc, serverTimestamp } from 'firebase/firestore';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';

/**
 * @fileOverview User service for interacting with Firestore 'users' collection and Firebase Auth.
 *
 * - getUsers - Fetches all users from Firestore.
 * - getUserById - Fetches a single user by their ID from Firestore.
 * - addUser - Creates a new user in Firebase Auth and Firestore.
 */

const formatTimestamp = (timestampField: any): string => {
  if (!timestampField) {
    return new Date().toISOString();
  }
  if (timestampField instanceof Timestamp) {
    return timestampField.toDate().toISOString();
  }
  if (timestampField.seconds !== undefined && typeof timestampField.nanoseconds === 'number') {
    return new Timestamp(timestampField.seconds, timestampField.nanoseconds).toDate().toISOString();
  }
  if (typeof timestampField === 'string' || typeof timestampField === 'number') {
    const date = new Date(timestampField);
    if (!isNaN(date.getTime())) {
      return date.toISOString();
    }
  }
  return new Date().toISOString();
};

/**
 * Fetches all users from the 'users' collection in Firestore.
 * @returns {Promise<User[]>} A promise that resolves to an array of User objects.
 * @throws Will throw an error if fetching users fails.
 */
export async function getUsers(): Promise<User[]> {
  try {
    const usersCollectionRef = collection(db, 'users');
    // const q = query(usersCollectionRef, orderBy('name')); // Ensure index exists if re-enabled
    const q = query(usersCollectionRef);
    const querySnapshot = await getDocs(q);

    const users: User[] = querySnapshot.docs.map(docSnapshot => {
      const data = docSnapshot.data();
      return {
        id: docSnapshot.id,
        name: data.name || 'Unnamed User',
        email: data.email || 'no-email@example.com',
        role: data.role || 'TECHNICIAN',
        avatarUrl: data.avatarUrl || undefined,
        assignedProjectIds: Array.isArray(data.assignedProjectIds) ? data.assignedProjectIds : [],
        createdAt: formatTimestamp(data.createdAt),
        updatedAt: formatTimestamp(data.updatedAt),
      } as User;
    });
    return users;
  } catch (error) {
    console.error("Error fetching users (see details below): ", error);
    throw new Error("Failed to fetch users from database. Check server logs for Firebase error details.");
  }
}

/**
 * Fetches a single user by their ID from Firestore.
 * @param {string} userId The ID of the user to fetch.
 * @returns {Promise<User | null>} A promise that resolves to the User object or null if not found.
 */
export async function getUserById(userId: string): Promise<User | null> {
  try {
    const userDocRef = doc(db, 'users', userId);
    const docSnap = await getDoc(userDocRef);

    if (docSnap.exists()) {
      const data = docSnap.data();
      return {
        id: docSnap.id,
        name: data.name || 'Unnamed User',
        email: data.email || 'no-email@example.com',
        role: data.role || 'TECHNICIAN',
        avatarUrl: data.avatarUrl || undefined,
        assignedProjectIds: Array.isArray(data.assignedProjectIds) ? data.assignedProjectIds : [],
        createdAt: formatTimestamp(data.createdAt),
        updatedAt: formatTimestamp(data.updatedAt),
      } as User;
    } else {
      console.log("No such user document with ID:", userId);
      return null;
    }
  } catch (error) {
    console.error(`Error fetching user by ID ${userId}: `, error);
    throw new Error(`Failed to fetch user ${userId} from database.`);
  }
}

/**
 * Adds a new user to Firebase Authentication and creates a corresponding document in Firestore.
 * @param userData The basic user data (displayName, email, role).
 * @param password The user's password.
 * @returns {Promise<string>} A promise that resolves to the UID of the newly created user.
 * @throws Will throw an error if adding the user fails in Auth or Firestore.
 */
export async function addUser(
  userData: { displayName: string; email: string; role: UserRole },
  password?: string
): Promise<string> {
  if (!password) {
    throw new Error('Password is required for new user creation.');
  }
  try {
    // 1. Create user in Firebase Authentication
    const userCredential = await createUserWithEmailAndPassword(auth, userData.email, password);
    const firebaseUser = userCredential.user;

    // 2. Update Firebase Auth user's profile (displayName)
    await updateProfile(firebaseUser, {
      displayName: userData.displayName,
      // photoURL can be added later if needed
    });

    // 3. Create user document in Firestore 'users' collection
    const userDocRef = doc(db, 'users', firebaseUser.uid);
    await setDoc(userDocRef, {
      name: userData.displayName, // Using displayName as 'name' in Firestore
      email: firebaseUser.email, // Use email from Auth to ensure consistency
      role: userData.role,
      avatarUrl: firebaseUser.photoURL || '', // Or a default placeholder
      assignedProjectIds: [], // New users start with no assigned projects
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    return firebaseUser.uid;
  } catch (error: any) {
    // More specific error handling could be added here (e.g., auth/email-already-in-use)
    console.error("Error adding user: ", error);
    const errorMessage = error.message || "Failed to add user. Ensure email is not already in use and password is valid.";
    if (error.code === 'auth/email-already-in-use') {
      throw new Error('This email address is already in use by another account.');
    }
    if (error.code === 'auth/weak-password') {
      throw new Error('Password should be at least 6 characters.');
    }
    throw new Error(errorMessage);
  }
}

// TODO: Implement updateUser and deleteUser functions
// updateUser would update both Auth (if needed, e.g. email) and Firestore
// deleteUser would delete from Auth and Firestore (requires careful implementation, possibly a Firebase Function for atomicity)
