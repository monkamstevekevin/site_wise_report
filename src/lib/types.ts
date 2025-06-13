import type { FieldReport as AIFieldReport } from '@/ai/flows/report-anomaly-detection';

// Re-exporting or aligning with AIFieldReport to ensure consistency
export type FieldReport = AIFieldReport;

export type UserRole = 'ADMIN' | 'SUPERVISOR' | 'TECHNICIAN';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatarUrl?: string;
  assignedProjectIds?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface Project {
  id: string;
  name: string;
  location: string;
  description?: string;
  status: 'ACTIVE' | 'INACTIVE' | 'COMPLETED';
  createdAt: string;
  updatedAt: string;
}

export interface Material {
  id: string;
  name: string;
  type: 'cement' | 'asphalt' | 'gravel' | 'sand' | 'other'; // Example types
  validationRules?: {
    minDensity?: number;
    maxDensity?: number;
    minTemperature?: number;
    maxTemperature?: number;
  };
  createdAt: string;
  updatedAt: string;
}

export interface Notification {
  id: string;
  userId: string;
  message: string;
  type: 'info' | 'warning' | 'error' | 'success';
  isRead: boolean;
  link?: string;
  createdAt: string;
}

export type SamplingMethod = 'grab' | 'composite' | 'core' | 'other';

export interface ChatMessage {
  id: string;
  projectId: string;
  senderId: string;
  senderName: string;
  senderAvatar?: string;
  text?: string;
  imageUrl?: string;
  timestamp: string; // ISO string
  isOwnMessage?: boolean; // Helper for UI, set client-side
}
