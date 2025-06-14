
import type { FieldReport as AIFieldReport } from '@/ai/flows/report-anomaly-detection';
import type { LucideIcon } from 'lucide-react';

// Re-exporting or aligning with AIFieldReport to ensure consistency
export type FieldReport = AIFieldReport & {
  rejectionReason?: string; // Added for rejection feedback
};

export type UserRole = 'ADMIN' | 'SUPERVISOR' | 'TECHNICIAN';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatarUrl?: string;
  assignedProjectIds: string[]; // Ensure this is not optional for easier handling
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

export type MaterialType = 'cement' | 'asphalt' | 'gravel' | 'sand' | 'other';

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
  id: string;
  message: string;
  type: NotificationType;
  isRead: boolean;
  targetId?: string; // e.g., projectId for chat, reportId for report, userId for assignment confirmation
  link?: string; // Optional direct link, takes precedence if both targetId and link exist
  createdAt: string; // ISO string, for sorting and display
  displayTime: string; // User-friendly time like "5m ago"
  icon?: LucideIcon;
  iconClass?: string;
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

