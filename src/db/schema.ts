import {
  pgTable,
  text,
  timestamp,
  boolean,
  uuid,
  numeric,
  index,
  unique,
  pgEnum,
  jsonb,
} from 'drizzle-orm/pg-core';

// ─── Enums ───────────────────────────────────────────────────────────────────

export const orgPlanEnum = pgEnum('org_plan', ['TRIAL', 'STARTER', 'PRO', 'ENTERPRISE']);
export const subscriptionStatusEnum = pgEnum('subscription_status', ['ACTIVE', 'PAST_DUE', 'CANCELED', 'TRIALING']);

export const userRoleEnum = pgEnum('user_role', ['ADMIN', 'SUPERVISOR', 'TECHNICIAN']);

export const projectStatusEnum = pgEnum('project_status', ['ACTIVE', 'INACTIVE', 'COMPLETED']);

export const assignmentTypeEnum = pgEnum('assignment_type', ['FULL_TIME', 'PART_TIME']);

export const projectTypeEnum = pgEnum('project_type', ['VISITS', 'HOURS', 'OPEN']);

export const materialTypeEnum = pgEnum('material_type', [
  'cement',
  'asphalt',
  'gravel',
  'sand',
  'other',
  'compaction',
]);

export const reportStatusEnum = pgEnum('report_status', [
  'DRAFT',
  'SUBMITTED',
  'VALIDATED',
  'REJECTED',
]);

export const samplingMethodEnum = pgEnum('sampling_method', [
  'grab',
  'composite',
  'core',
  'other',
]);

export const testCategoryEnum = pgEnum('test_category', [
  'CONCRETE',
  'SOIL',
  'ASPHALT',
  'GRANULAT',
  'CEMENT',
  'FIELD',
]);

export const testFieldTypeEnum = pgEnum('test_field_type', [
  'number',
  'text',
  'select',
  'boolean',
]);

export const notificationTypeEnum = pgEnum('notification_type', [
  'new_chat_message',
  'report_update',
  'project_assignment',
  'system_update',
  'generic',
  'project_assigned_admin_confirm',
  'project_overdue',
  'project_behind_visits',
  'project_behind_hours',
  'technician_inactive',
  'report_pending_too_long',
]);

// ─── Tables ──────────────────────────────────────────────────────────────────

/**
 * organizations — client tenants
 */
export const organizations = pgTable('organizations', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  plan: orgPlanEnum('plan').notNull().default('TRIAL'),
  subscriptionStatus: subscriptionStatusEnum('subscription_status').notNull().default('TRIALING'),
  stripeCustomerId: text('stripe_customer_id').unique(),
  stripeSubscriptionId: text('stripe_subscription_id').unique(),
  trialEndsAt: timestamp('trial_ends_at', { withTimezone: true }),
  inviteToken: text('invite_token').unique(),
  logoUrl: text('logo_url'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

/**
 * users — miroir du profil Supabase Auth + champs métier
 * L'id correspond à l'uid Supabase Auth (uuid v4)
 */
export const users = pgTable('users', {
  id: uuid('id').primaryKey(), // = Supabase Auth uid
  email: text('email').unique().notNull(),
  name: text('name').notNull(),
  role: userRoleEnum('role').notNull().default('TECHNICIAN'),
  avatarUrl: text('avatar_url'),
  organizationId: uuid('organization_id').references(() => organizations.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

/**
 * projects — chantiers de génie civil
 */
export const projects = pgTable('projects', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  location: text('location').notNull(),
  description: text('description'),
  status: projectStatusEnum('status').notNull().default('ACTIVE'),
  projectType: projectTypeEnum('project_type').notNull().default('OPEN'),
  targetVisits: numeric('target_visits', { precision: 6, scale: 0 }),
  targetHours: numeric('target_hours', { precision: 8, scale: 2 }),
  startDate: timestamp('start_date', { withTimezone: true }),
  endDate: timestamp('end_date', { withTimezone: true }),
  organizationId: uuid('organization_id').references(() => organizations.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

/**
 * user_assignments — table de jonction utilisateurs ↔ projets
 */
export const userAssignments = pgTable(
  'user_assignments',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    projectId: uuid('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    assignmentType: assignmentTypeEnum('assignment_type').notNull().default('PART_TIME'),
    organizationId: uuid('organization_id').references(() => organizations.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    unique('user_project_unique').on(table.userId, table.projectId),
    index('ua_user_id_idx').on(table.userId),
    index('ua_project_id_idx').on(table.projectId),
    index('ua_org_id_idx').on(table.organizationId),
  ]
);

/**
 * materials — matériaux avec règles de validation dynamiques
 */
export const materials = pgTable('materials', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  type: materialTypeEnum('type').notNull(),
  minDensity: numeric('min_density', { precision: 10, scale: 4 }),
  maxDensity: numeric('max_density', { precision: 10, scale: 4 }),
  minTemperature: numeric('min_temperature', { precision: 10, scale: 4 }),
  maxTemperature: numeric('max_temperature', { precision: 10, scale: 4 }),
  organizationId: uuid('organization_id').references(() => organizations.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

/**
 * test_types — templates de tests de laboratoire / terrain
 * organizationId = null → template global partagé par toutes les orgs
 */
export const testTypes = pgTable(
  'test_types',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: text('name').notNull(),
    category: testCategoryEnum('category').notNull(),
    description: text('description'),
    // fields: JSON array de TestFieldDef
    // [{ key, label, type, unit?, min?, max?, required, options? }]
    fields: jsonb('fields').notNull().default([]),
    isDefault: boolean('is_default').notNull().default(false),
    organizationId: uuid('organization_id').references(() => organizations.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('tt_org_id_idx').on(table.organizationId),
    index('tt_category_idx').on(table.category),
  ]
);

/**
 * project_test_types — types de tests disponibles sur un projet
 */
export const projectTestTypes = pgTable(
  'project_test_types',
  {
    projectId: uuid('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    testTypeId: uuid('test_type_id')
      .notNull()
      .references(() => testTypes.id, { onDelete: 'cascade' }),
  },
  (table) => [
    unique('project_test_type_unique').on(table.projectId, table.testTypeId),
    index('ptt_project_id_idx').on(table.projectId),
  ]
);

/**
 * project_materials — table de jonction projets ↔ matériaux
 */
export const projectMaterials = pgTable(
  'project_materials',
  {
    projectId: uuid('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    materialId: uuid('material_id')
      .notNull()
      .references(() => materials.id, { onDelete: 'cascade' }),
  },
  (table) => [
    unique('project_material_unique').on(table.projectId, table.materialId),
    index('pm_project_id_idx').on(table.projectId),
  ]
);

/**
 * reports — rapports de terrain (le cœur de l'application)
 */
export const reports = pgTable(
  'reports',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    projectId: uuid('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'restrict' }),
    technicianId: uuid('technician_id')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    materialType: materialTypeEnum('material_type').notNull(),
    temperature: numeric('temperature', { precision: 10, scale: 4 }).notNull(),
    volume: numeric('volume', { precision: 10, scale: 4 }).notNull(),
    density: numeric('density', { precision: 10, scale: 4 }).notNull(),
    humidity: numeric('humidity', { precision: 10, scale: 4 }).notNull(),
    batchNumber: text('batch_number').notNull(),
    supplier: text('supplier').notNull(),
    samplingMethod: samplingMethodEnum('sampling_method').notNull(),
    notes: text('notes'),
    status: reportStatusEnum('status').notNull().default('DRAFT'),
    photoUrl: text('photo_url'),
    rejectionReason: text('rejection_reason'),
    aiIsAnomalous: boolean('ai_is_anomalous'),
    aiAnomalyExplanation: text('ai_anomaly_explanation'),
    // Nouveaux champs pour les tests dynamiques
    testTypeId: uuid('test_type_id').references(() => testTypes.id, { onDelete: 'set null' }),
    testData: jsonb('test_data'), // { [fieldKey]: value }
    organizationId: uuid('organization_id').references(() => organizations.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('reports_project_id_idx').on(table.projectId),
    index('reports_technician_id_idx').on(table.technicianId),
    index('reports_status_idx').on(table.status),
    index('reports_created_at_idx').on(table.createdAt),
    index('reports_material_type_idx').on(table.materialType),
    index('reports_org_id_idx').on(table.organizationId),
  ]
);

/**
 * report_attachments — pièces jointes des rapports
 */
export const reportAttachments = pgTable(
  'report_attachments',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    reportId: uuid('report_id')
      .notNull()
      .references(() => reports.id, { onDelete: 'cascade' }),
    fileUrl: text('file_url').notNull(),
    fileName: text('file_name').notNull(),
    mimeType: text('mime_type'),
    organizationId: uuid('organization_id').references(() => organizations.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('ra_report_id_idx').on(table.reportId),
    index('ra_org_id_idx').on(table.organizationId),
  ]
);

/**
 * compaction_test_rows — individual test measurements for compaction reports
 * Used for both RC-6306 (daily, qualitative) and RC-6304 (client summary, quantitative)
 */
export const compactionTestRows = pgTable(
  'compaction_test_rows',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    reportId: uuid('report_id')
      .notNull()
      .references(() => reports.id, { onDelete: 'cascade' }),
    projectId: uuid('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    rowOrder: numeric('row_order', { precision: 4, scale: 0 }).notNull().default('0'),
    // Quantitative (RC-6304)
    localisation: text('localisation'),
    testDate: text('test_date'), // stored as ISO date string 'YYYY-MM-DD'
    waterContent: numeric('water_content', { precision: 6, scale: 2 }),
    dryDensity: numeric('dry_density', { precision: 8, scale: 2 }),
    retained5mm: numeric('retained_5mm', { precision: 6, scale: 2 }),
    correctedDensity: numeric('corrected_density', { precision: 8, scale: 2 }),
    compactionPercent: numeric('compaction_percent', { precision: 6, scale: 2 }),
    // Qualitative (RC-6306)
    materialRef: text('material_ref'), // 'mat1' | 'mat2'
    requiredPercent: numeric('required_percent', { precision: 6, scale: 2 }),
    isCompliant: boolean('is_compliant'),
    sampleTaken: boolean('sample_taken'),
    sampleNo: text('sample_no'),
    remarks: text('remarks'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('ctr_report_id_idx').on(table.reportId),
    index('ctr_project_id_idx').on(table.projectId),
    index('ctr_org_id_idx').on(table.organizationId),
  ]
);

/**
 * time_entries — suivi du temps par technicien et par projet
 */
export const timeEntries = pgTable(
  'time_entries',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    projectId: uuid('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    reportId: uuid('report_id')
      .references(() => reports.id, { onDelete: 'set null' }),
    date: timestamp('date', { withTimezone: true }).notNull(),
    durationMinutes: numeric('duration_minutes', { precision: 8, scale: 2 }).notNull(),
    notes: text('notes'),
    organizationId: uuid('organization_id').references(() => organizations.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('te_user_id_idx').on(table.userId),
    index('te_project_id_idx').on(table.projectId),
    index('te_date_idx').on(table.date),
    index('te_org_id_idx').on(table.organizationId),
  ]
);

export type TimeEntry = typeof timeEntries.$inferSelect;
export type NewTimeEntry = typeof timeEntries.$inferInsert;

/**
 * chat_messages — messages de chat par projet
 */
export const chatMessages = pgTable(
  'chat_messages',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    projectId: uuid('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    senderId: uuid('sender_id')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    senderName: text('sender_name').notNull(),
    senderAvatar: text('sender_avatar'),
    text: text('text'),
    imageUrl: text('image_url'),
    organizationId: uuid('organization_id').references(() => organizations.id, { onDelete: 'cascade' }),
    timestamp: timestamp('timestamp', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('cm_project_id_idx').on(table.projectId),
    index('cm_timestamp_idx').on(table.timestamp),
    index('cm_sender_id_idx').on(table.senderId),
    index('cm_org_id_idx').on(table.organizationId),
  ]
);

/**
 * notifications — notifications in-app par utilisateur
 */
export const notifications = pgTable(
  'notifications',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    type: notificationTypeEnum('type').notNull(),
    message: text('message').notNull(),
    targetId: text('target_id'),
    link: text('link'),
    isRead: boolean('is_read').notNull().default(false),
    organizationId: uuid('organization_id').references(() => organizations.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('notif_user_id_idx').on(table.userId),
    index('notif_is_read_idx').on(table.isRead),
    index('notif_created_at_idx').on(table.createdAt),
    index('notif_org_id_idx').on(table.organizationId),
  ]
);

/**
 * webhook_events — idempotency pour les webhooks Stripe (multi-instance safe)
 */
export const webhookEvents = pgTable('webhook_events', {
  id: text('id').primaryKey(), // Stripe event ID (evt_xxx)
  processedAt: timestamp('processed_at', { withTimezone: true }).defaultNow().notNull(),
});

// ─── Types inférés (utilisables dans le reste de l'app) ──────────────────────

export type Organization = typeof organizations.$inferSelect;
export type NewOrganization = typeof organizations.$inferInsert;

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

export type Project = typeof projects.$inferSelect;
export type NewProject = typeof projects.$inferInsert;

export type UserAssignment = typeof userAssignments.$inferSelect;
export type NewUserAssignment = typeof userAssignments.$inferInsert;

export type Material = typeof materials.$inferSelect;
export type NewMaterial = typeof materials.$inferInsert;

export type ProjectMaterial = typeof projectMaterials.$inferSelect;

// ── TestType ──────────────────────────────────────────────────────────────────

/** Définition d'un champ dans un template de test */
export interface TestFieldDef {
  key: string;           // ex: 'slump_mm'
  label: string;         // ex: 'Affaissement (mm)'
  type: 'number' | 'text' | 'select' | 'boolean';
  unit?: string;         // ex: 'mm', '°C', '%', 'MPa'
  min?: number;
  max?: number;
  required: boolean;
  options?: string[];    // pour type === 'select'
  hint?: string;         // texte d'aide affiché sous le champ
}

export type TestType = typeof testTypes.$inferSelect & {
  fields: TestFieldDef[];
};
export type NewTestType = typeof testTypes.$inferInsert;
export type ProjectTestType = typeof projectTestTypes.$inferSelect;

export type Report = typeof reports.$inferSelect;
export type NewReport = typeof reports.$inferInsert;

export type ReportAttachment = typeof reportAttachments.$inferSelect;
export type NewReportAttachment = typeof reportAttachments.$inferInsert;

export type ChatMessage = typeof chatMessages.$inferSelect;
export type NewChatMessage = typeof chatMessages.$inferInsert;

export type Notification = typeof notifications.$inferSelect;
export type NewNotification = typeof notifications.$inferInsert;

export type CompactionTestRow = typeof compactionTestRows.$inferSelect;
export type NewCompactionTestRow = typeof compactionTestRows.$inferInsert;

/** Header data stored in reports.testData for compaction reports */
export interface CompactionReportData {
  // Timing
  arrivalTime: string;     // 'HH:MM'
  departureTime: string;   // 'HH:MM'
  nucleoNo?: string;       // Nucléodensimètre No
  // Materials
  material1: {
    name: string;
    source: string;
    maxDensity: number;        // Masse volumique max (kg/m³)
    densityMethod: 'proctor' | 'planche';
    optimalMoisture: number;   // Teneur en eau optimale (%)
    compactionReq: number;     // Exigence compaction (90|95|98)
  };
  material2?: {
    name: string;
    source: string;
    maxDensity: number;
    densityMethod: 'proctor' | 'planche';
    optimalMoisture: number;
    compactionReq: number;
  };
  // Work type & location
  workType: 'ROUTE' | 'BATIMENT';
  workCategory: string;
  chainageFrom?: string;
  chainageTo?: string;
  axis?: string;
  entrepreneur?: string;
  subcontractor?: string;
}
