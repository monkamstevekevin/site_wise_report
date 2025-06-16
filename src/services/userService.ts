
'use server';

import { auth, db } from '@/lib/firebase';
import type { User, UserRole, Project, UserAssignment } from '@/lib/types'; // Added Project type
import { collection, getDocs, doc, getDoc, Timestamp, query, setDoc, serverTimestamp, updateDoc, deleteDoc } from 'firebase/firestore';
import { createUserWithEmailAndPassword, updateProfile as updateAuthProfile } from 'firebase/auth';
import { addNotification } from './notificationService'; 
import { getProjectById } from './projectService'; // For fetching project details

/**
 * @fileOverview User service for interacting with Firestore 'users' collection and Firebase Auth.
 *
 * - getUsers - Fetches all users from Firestore.
 * - getUserById - Fetches a single user by their ID from Firestore.
 * - addUser - Creates a new user in Firebase Auth and Firestore.
 * - updateUser - Updates a user's information (name, role, avatarUrl) in Firestore.
 * - updateUserAssignments - Updates the assigned projects for a user in Firestore and sends notifications.
 * - deleteUserFirestoreRecord - Deletes a user's document from Firestore.
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
        assignments: Array.isArray(data.assignments) ? data.assignments : [], 
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
        assignments: Array.isArray(data.assignments) ? data.assignments : [], 
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
    const userCredential = await createUserWithEmailAndPassword(auth, userData.email, password);
    const firebaseUser = userCredential.user;

    await updateAuthProfile(firebaseUser, {
      displayName: userData.displayName,
      // photoURL can be set here if available/desired at creation
    });

    const userDocRef = doc(db, 'users', firebaseUser.uid);
    await setDoc(userDocRef, {
      name: userData.displayName, 
      email: firebaseUser.email,
      role: userData.role,
      avatarUrl: firebaseUser.photoURL || '', // Save initial photoURL if available
      assignments: [], 
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    return firebaseUser.uid;
  } catch (error: any) {
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

/**
 * Updates a user's information (name, role, avatarUrl) in Firestore.
 * @param {string} userId The ID of the user to update.
 * @param {object} data The data to update, can include `name` (from `displayName`), `role`, and/or `avatarUrl`.
 * @returns {Promise<void>} A promise that resolves when the user is successfully updated.
 * @throws Will throw an error if updating the user fails.
 */
export async function updateUser(userId: string, data: { name?: string; role?: UserRole; avatarUrl?: string | null }): Promise<void> {
  try {
    const userDocRef = doc(db, 'users', userId);
    const updateData: any = {};

    if (data.name !== undefined) {
      updateData.name = data.name;
    }
    if (data.role !== undefined) {
      updateData.role = data.role;
    }
    if (data.avatarUrl !== undefined) { // Check if avatarUrl is explicitly passed
      updateData.avatarUrl = data.avatarUrl; // This can be a string (URL or data URI) or null
    }

    if (Object.keys(updateData).length === 0) {
      console.log("No data provided to update user in Firestore.");
      return;
    }

    updateData.updatedAt = serverTimestamp();
    await updateDoc(userDocRef, updateData);

  } catch (error) {
    console.error(`Error updating user ${userId} in Firestore: `, error);
    throw new Error(`Failed to update user ${userId} in database.`);
  }
}

function isProjectActive(project: Project): boolean {
  if (project.status !== 'ACTIVE') return false;
  if (!project.endDate) return true; // No end date means it's ongoing
  return new Date(project.endDate) >= new Date(); // Active if end date is today or in the future
}

/**
 * Updates the assigned projects for a user in Firestore and sends notifications.
 * Includes logic to prevent over-assignment for FULL_TIME technicians.
 * @param {string} userId The ID of the user to update.
 * @param {UserAssignment[]} newAssignments An array of project assignments.
 * @returns {Promise<void>} A promise that resolves when the user's projects are successfully updated.
 * @throws Will throw an error if updating fails or if there's an assignment conflict.
 */
export async function updateUserAssignments(userId: string, newAssignments: UserAssignment[]): Promise<void> {
  const userDocRef = doc(db, 'users', userId);
  const userDocSnap = await getDoc(userDocRef);
  if (!userDocSnap.exists()) {
    throw new Error(`User with ID ${userId} not found.`);
  }
  const currentUserData = userDocSnap.data() as User;
  const oldAssignments = currentUserData.assignments || [];

  // Check for FULL_TIME conflicts
  const fullTimeNewAssignments = newAssignments.filter(a => a.assignmentType === 'FULL_TIME');
  if (fullTimeNewAssignments.length > 0) {
    const existingFullTimeAssignments = oldAssignments.filter(
      a => a.assignmentType === 'FULL_TIME' && !fullTimeNewAssignments.find(na => na.projectId === a.projectId)
    );
    
    let activeFullTimeProjectIds: string[] = [];

    // Check new full-time assignments against each other for active status
    for (const assignment of fullTimeNewAssignments) {
        const project = await getProjectById(assignment.projectId);
        if (project && isProjectActive(project)) {
            activeFullTimeProjectIds.push(project.id);
        }
    }
     if (activeFullTimeProjectIds.length > 1) {
        throw new Error(`Technician cannot be assigned FULL_TIME to multiple active projects simultaneously. Conflict with new assignments for projects: ${activeFullTimeProjectIds.join(', ')}.`);
    }


    // Check new full-time assignments against existing active full-time assignments
    for (const newFtAssignment of fullTimeNewAssignments) {
      const newProject = await getProjectById(newFtAssignment.projectId);
      if (newProject && isProjectActive(newProject)) {
        for (const existingFtAssignment of existingFullTimeAssignments) {
          const existingProject = await getProjectById(existingFtAssignment.projectId);
          if (existingProject && isProjectActive(existingProject)) {
            throw new Error(
              `Technician is already assigned FULL_TIME to active project "${existingProject.name}" (ends ${existingProject.endDate || 'N/A'}). Cannot also assign FULL_TIME to active project "${newProject.name}" (ends ${newProject.endDate || 'N/A'}).`
            );
          }
        }
      }
    }
  }


  try {
    await updateDoc(userDocRef, {
      assignments: newAssignments,
      updatedAt: serverTimestamp(),
    });

    // Determine newly assigned projects (any type) and send notifications
    const oldProjectIdsSet = new Set(oldAssignments.map(a => a.projectId));
    const newlyAssignedProjectDetails: { project: Project; assignmentType: UserAssignment['assignmentType'] }[] = [];

    for (const newAssignment of newAssignments) {
      if (!oldProjectIdsSet.has(newAssignment.projectId)) {
        const project = await getProjectById(newAssignment.projectId);
        if (project) {
          newlyAssignedProjectDetails.push({ project, assignmentType: newAssignment.assignmentType });
        }
      }
    }
    
    for (const { project, assignmentType } of newlyAssignedProjectDetails) {
      try {
        const assignmentTypeDisplay = assignmentType === 'FULL_TIME' ? 'à temps plein' : 'à temps partiel';
        await addNotification(userId, {
          type: 'project_assignment',
          message: `Vous avez été assigné(e) ${assignmentTypeDisplay} au projet : ${project.name} (Lieu: ${project.location}).`,
          targetId: project.id,
          link: `/my-projects`, 
        });
      } catch (projectError) {
        console.error(`Error fetching project ${project.id} or sending notification for user ${userId}:`, projectError);
      }
    }

  } catch (error) {
    console.error(`Error updating assigned projects for user ${userId}: `, error);
    if (error instanceof Error) { // Propagate custom error messages
        throw error;
    }
    throw new Error(`Failed to update assigned projects for user ${userId} in database.`);
  }
}

/**
 * Deletes a user's document from the 'users' collection in Firestore.
 * Note: This does NOT delete the user from Firebase Authentication.
 * @param {string} userId The ID of the user document to delete from Firestore.
 * @returns {Promise<void>} A promise that resolves when the user's Firestore document is successfully deleted.
 * @throws Will throw an error if deleting the Firestore document fails.
 */
export async function deleteUserFirestoreRecord(userId: string): Promise<void> {
  try {
    const userDocRef = doc(db, 'users', userId);
    await deleteDoc(userDocRef);
  } catch (error) {
    console.error(`Error deleting user Firestore record ${userId}: `, error);
    throw new Error(`Failed to delete user record ${userId} from database.`);
  }
}

