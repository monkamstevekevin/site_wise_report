
import type { FieldReport as AIFieldReport } from '@/ai/flows/report-anomaly-detection';
import type { LucideIcon } from 'lucide-react';

// Re-exporting or aligning with AIFieldReport to ensure consistency
export type FieldReport = AIFieldReport & {
  rejectionReason?: string; // Added for rejection feedback
  aiIsAnomalous?: boolean; // Added for AI assessment result
  aiAnomalyExplanation?: string; // Added for AI assessment explanation
};

export type UserRole = 'ADMIN' | 'SUPERVISOR' | 'TECHNICIAN';

export interface UserAssignment {
  projectId: string;
  assignmentType: 'FULL_TIME' | 'PART_TIME';
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatarUrl?: string;
  // assignedProjectIds: string[]; // Deprecated in favor of assignments
  assignments: UserAssignment[]; // New structure for assignments
  createdAt: string;
  updatedAt: string;
}

export type MaterialType = 'cement' | 'asphalt' | 'gravel' | 'sand' | 'other';

export interface Project {
  id: string;
  name: string;
  location: string;
  description?: string;
  status: 'ACTIVE' | 'INACTIVE' | 'COMPLETED';
  startDate?: string; // ISO string date
  endDate?: string;   // ISO string date
  assignedMaterialIds?: string[]; 
  createdAt: string;
  updatedAt: string;
}


export interface MaterialValidationRules {
  minDensity?: number;
  maxDensity?: number;
  minTemperature?: number;
  maxTemperature?: number;
}

export interface Material {
  id: string;
  name: string;
  type: MaterialType;
  validationRules?: MaterialValidationRules;
  createdAt: string;
  updatedAt: string;
}

export type NotificationType = 'new_chat_message' | 'report_update' | 'project_assignment' | 'system_update' | 'generic' | 'project_assigned_admin_confirm';

export interface Notification {
  id: string; // Firestore document ID
  message: string;
  type: NotificationType;
  isRead: boolean;
  targetId?: string; // e.g., projectId for chat, reportId for report, userId for assignment confirmation
  link?: string; // Optional direct link for navigation
  createdAt: string; // ISO string (converted from Firestore Timestamp)
}

// Data used when creating a new notification, 'id', 'createdAt', 'isRead' are set by the service/server.
export type NewNotificationPayload = Omit<Notification, 'id' | 'createdAt' | 'isRead'>;


export type SamplingMethod = 'grab' | 'composite' | 'core' | 'other';

export interface ChatMessage {
  id: string; // Firestore document ID
  projectId: string;
  senderId: string;
  senderName: string;
  senderAvatar?: string;
  text?: string;
  imageUrl?: string; // For now, this will remain client-side or null in Firestore
  timestamp: string; // ISO string (converted from Firestore Timestamp)
  isOwnMessage?: boolean; // Helper for UI, set client-side based on senderId
}

// Data sent to Firestore when adding a new message
export type NewChatMessagePayload = {
  projectId: string;
  senderId: string;
  senderName: string;
  senderAvatar?: string;
  text?: string;
  imageUrl?: string | null; // Explicitly allow null for Firestore
  // timestamp is serverTimestamp()
};

