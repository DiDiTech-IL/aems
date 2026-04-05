import { pgTable, uuid, varchar, timestamp, jsonb, integer, pgEnum } from 'drizzle-orm/pg-core';

// ─── Enums ───────────────────────────────────────────────────────────────────

export const rbacRoleEnum = pgEnum('rbac_role', ['admin', 'instructor', 'trainee', 'observer']);

export const protocolStatusEnum = pgEnum('protocol_status', ['draft', 'published', 'deprecated']);

export const caseStatusEnum = pgEnum('case_status', ['draft', 'published', 'deprecated']);

export const careLevelEnum = pgEnum('care_level', ['BLS', 'ALS']);

export const simulationStatusEnum = pgEnum('simulation_status', [
  'pending',
  'active',
  'paused',
  'completed',
  'aborted',
]);

export const simulationOutcomeEnum = pgEnum('simulation_outcome', [
  'success',
  'failure',
  'partial',
]);

// ─── Users ───────────────────────────────────────────────────────────────────

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  passwordHash: varchar('password_hash', { length: 255 }).notNull(),
  role: rbacRoleEnum('role').notNull().default('trainee'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

// ─── Protocol Templates ───────────────────────────────────────────────────────

export const protocolTemplates = pgTable('protocol_templates', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }).notNull(),
  version: varchar('version', { length: 20 }).notNull(),
  status: protocolStatusEnum('status').notNull().default('draft'),
  careLevel: careLevelEnum('care_level').notNull(),
  phases: jsonb('phases').notNull(),
  createdBy: uuid('created_by')
    .notNull()
    .references(() => users.id),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  publishedAt: timestamp('published_at', { withTimezone: true }),
});

// ─── Case Templates ───────────────────────────────────────────────────────────

export const caseTemplates = pgTable('case_templates', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }).notNull(),
  version: varchar('version', { length: 20 }).notNull(),
  status: caseStatusEnum('status').notNull().default('draft'),
  careLevel: careLevelEnum('care_level').notNull(),
  difficultyLevel: integer('difficulty_level').notNull().default(1),
  scenario: jsonb('scenario').notNull(),
  initialPatientState: jsonb('initial_patient_state').notNull(),
  allowedProtocolIds: jsonb('allowed_protocol_ids').notNull().$type<string[]>(),
  rules: jsonb('rules').notNull().$type<unknown[]>(),
  createdBy: uuid('created_by')
    .notNull()
    .references(() => users.id),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  publishedAt: timestamp('published_at', { withTimezone: true }),
});

// ─── Simulation Runs ──────────────────────────────────────────────────────────

export const simulationRuns = pgTable('simulation_runs', {
  id: uuid('id').primaryKey().defaultRandom(),
  caseTemplateId: uuid('case_template_id')
    .notNull()
    .references(() => caseTemplates.id),
  caseTemplateVersion: varchar('case_template_version', { length: 20 }).notNull(),
  protocolTemplateId: uuid('protocol_template_id')
    .notNull()
    .references(() => protocolTemplates.id),
  protocolTemplateVersion: varchar('protocol_template_version', { length: 20 }).notNull(),
  traineeId: uuid('trainee_id')
    .notNull()
    .references(() => users.id),
  instructorId: uuid('instructor_id').references(() => users.id),
  status: simulationStatusEnum('status').notNull().default('pending'),
  difficultyLevel: integer('difficulty_level').notNull().default(1),
  currentPatientState: jsonb('current_patient_state').notNull(),
  currentPhaseId: varchar('current_phase_id', { length: 255 }).notNull(),
  score: jsonb('score'),
  outcome: simulationOutcomeEnum('outcome'),
  mistakeLog: jsonb('mistake_log').notNull().$type<unknown[]>(),
  startedAt: timestamp('started_at', { withTimezone: true }).notNull().defaultNow(),
  completedAt: timestamp('completed_at', { withTimezone: true }),
});

// ─── Simulation Events ────────────────────────────────────────────────────────

export const simulationEvents = pgTable('simulation_events', {
  id: uuid('id').primaryKey().defaultRandom(),
  simulationRunId: uuid('simulation_run_id')
    .notNull()
    .references(() => simulationRuns.id),
  timestampMs: integer('timestamp_ms').notNull(),
  type: varchar('type', { length: 64 }).notNull(),
  payload: jsonb('payload').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// ─── Audit Log ────────────────────────────────────────────────────────────────

export const auditLog = pgTable('audit_log', {
  id: uuid('id').primaryKey().defaultRandom(),
  actorId: uuid('actor_id').references(() => users.id),
  action: varchar('action', { length: 255 }).notNull(),
  resourceType: varchar('resource_type', { length: 64 }).notNull(),
  resourceId: uuid('resource_id').notNull(),
  diff: jsonb('diff'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});
