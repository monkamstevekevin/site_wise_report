ALTER TYPE "notification_type" ADD VALUE IF NOT EXISTS 'project_overdue';
ALTER TYPE "notification_type" ADD VALUE IF NOT EXISTS 'project_behind_visits';
ALTER TYPE "notification_type" ADD VALUE IF NOT EXISTS 'project_behind_hours';
ALTER TYPE "notification_type" ADD VALUE IF NOT EXISTS 'technician_inactive';
ALTER TYPE "notification_type" ADD VALUE IF NOT EXISTS 'report_pending_too_long';
