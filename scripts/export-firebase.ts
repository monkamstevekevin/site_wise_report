/**
 * Script d'export Firestore → JSON
 *
 * Usage:
 *   npx tsx scripts/export-firebase.ts
 *
 * Crée un dossier `scripts/firebase-export/` avec un fichier JSON par collection.
 * Ce backup est essentiel avant toute migration vers Supabase.
 */

import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  getDocs,
  doc,
  getDoc,
  Timestamp,
} from 'firebase/firestore';
import * as fs from 'fs';
import * as path from 'path';

// ─── Config Firebase ──────────────────────────────────────────────────────────

const firebaseConfig = {
  apiKey: 'AIzaSyCYLK-Ytm5GVCzYGSA3K9oTbr39A5mf8QE',
  authDomain: 'sitewise-reports.firebaseapp.com',
  projectId: 'sitewise-reports',
  storageBucket: 'sitewise-reports.appspot.com',
  messagingSenderId: '792660061825',
  appId: '1:792660061825:web:3781eb2c1a672030cfe780',
};

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
const db = getFirestore(app);

// ─── Helpers ──────────────────────────────────────────────────────────────────

const OUTPUT_DIR = path.join(__dirname, 'firebase-export');

/** Convertit les Timestamp Firestore en ISO string pour la sérialisation JSON */
function convertFirestoreData(data: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data)) {
    if (value instanceof Timestamp) {
      result[key] = value.toDate().toISOString();
    } else if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      result[key] = convertFirestoreData(value as Record<string, unknown>);
    } else if (Array.isArray(value)) {
      result[key] = value.map((item) =>
        item instanceof Timestamp
          ? item.toDate().toISOString()
          : typeof item === 'object' && item !== null
          ? convertFirestoreData(item as Record<string, unknown>)
          : item
      );
    } else {
      result[key] = value;
    }
  }
  return result;
}

function saveJSON(filename: string, data: unknown) {
  const filePath = path.join(OUTPUT_DIR, filename);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
  console.log(`  ✅ Sauvegardé : ${filename} (${Array.isArray(data) ? (data as unknown[]).length : 1} document(s))`);
}

// ─── Export des collections ───────────────────────────────────────────────────

async function exportCollection(collectionName: string): Promise<Record<string, unknown>[]> {
  console.log(`\n📦 Export de la collection "${collectionName}"...`);
  const snapshot = await getDocs(collection(db, collectionName));
  const docs: Record<string, unknown>[] = [];

  for (const docSnap of snapshot.docs) {
    const data = convertFirestoreData(docSnap.data() as Record<string, unknown>);
    docs.push({ _id: docSnap.id, ...data });
  }

  return docs;
}

async function exportSubcollection(
  parentCollection: string,
  parentId: string,
  subcollectionName: string
): Promise<Record<string, unknown>[]> {
  const snapshot = await getDocs(
    collection(db, parentCollection, parentId, subcollectionName)
  );
  const docs: Record<string, unknown>[] = [];

  for (const docSnap of snapshot.docs) {
    const data = convertFirestoreData(docSnap.data() as Record<string, unknown>);
    docs.push({ _id: docSnap.id, _parentId: parentId, ...data });
  }

  return docs;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('🚀 Début de l\'export Firebase → JSON');
  console.log(`📁 Dossier de sortie : ${OUTPUT_DIR}\n`);

  // Créer le dossier de sortie
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  const exportDate = new Date().toISOString();
  const manifest: Record<string, unknown> = {
    exportedAt: exportDate,
    project: 'sitewise-reports',
    collections: {} as Record<string, number>,
  };

  // ── Collections principales ──────────────────────────────────────────────

  const users = await exportCollection('users');
  saveJSON('users.json', users);
  (manifest.collections as Record<string, number>)['users'] = users.length;

  const projects = await exportCollection('projects');
  saveJSON('projects.json', projects);
  (manifest.collections as Record<string, number>)['projects'] = projects.length;

  const materials = await exportCollection('materials');
  saveJSON('materials.json', materials);
  (manifest.collections as Record<string, number>)['materials'] = materials.length;

  const reports = await exportCollection('reports');
  saveJSON('reports.json', reports);
  (manifest.collections as Record<string, number>)['reports'] = reports.length;

  // ── Sous-collections : notifications (users/{id}/notifications) ──────────

  console.log('\n📦 Export des sous-collections "notifications"...');
  const allNotifications: Record<string, unknown>[] = [];

  for (const user of users) {
    const userId = user._id as string;
    const notifs = await exportSubcollection('users', userId, 'notifications');
    allNotifications.push(...notifs);
  }

  saveJSON('notifications.json', allNotifications);
  (manifest.collections as Record<string, number>)['notifications'] = allNotifications.length;

  // ── Sous-collections : chatMessages (projects/{id}/chatMessages) ──────────

  console.log('\n📦 Export des sous-collections "chatMessages"...');
  const allChatMessages: Record<string, unknown>[] = [];

  for (const project of projects) {
    const projectId = project._id as string;
    const messages = await exportSubcollection('projects', projectId, 'chatMessages');
    allChatMessages.push(...messages);
  }

  saveJSON('chat_messages.json', allChatMessages);
  (manifest.collections as Record<string, number>)['chatMessages'] = allChatMessages.length;

  // ── Manifest ─────────────────────────────────────────────────────────────

  saveJSON('_manifest.json', manifest);

  console.log('\n─────────────────────────────────────────────');
  console.log('✅ Export terminé avec succès !');
  console.log(`📊 Résumé :`);
  for (const [col, count] of Object.entries(manifest.collections as Record<string, number>)) {
    console.log(`   ${col}: ${count} document(s)`);
  }
  console.log(`\n💾 Fichiers dans : ${OUTPUT_DIR}`);
  console.log('⚠️  Ces fichiers sont le backup de Firestore. Ne pas supprimer avant la fin de la migration.');

  process.exit(0);
}

main().catch((err) => {
  console.error('❌ Erreur durant l\'export :', err);
  process.exit(1);
});
