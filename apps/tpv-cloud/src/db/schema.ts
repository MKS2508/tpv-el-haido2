import { pgTable, uuid, varchar, text, timestamp, boolean, index, primaryKey } from 'drizzle-orm/pg-core'

export const licenses = pgTable('licenses', {
  id: uuid('id').primaryKey().defaultRandom(),
  keyHash: varchar('key_hash', { length: 128 }).notNull().unique(),
  email: varchar('email', { length: 255 }).notNull(),
  machineFingerprint: varchar('machine_fingerprint', { length: 128 }),
  licenseType: varchar('license_type', { length: 32 }).notNull(), // 'master' | 'regular'
  activatedAt: timestamp('activated_at').defaultNow(),
  expiresAt: timestamp('expires_at'),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow()
}, (t) => ({
  keyHashIdx: index('licenses_key_hash_idx').on(t.keyHash),
  emailIdx: index('licenses_email_idx').on(t.email)
}))

export const releases = pgTable('releases', {
  version: varchar('version', { length: 32 }).notNull(),
  target: varchar('target', { length: 32 }).notNull(),   // 'windows' | 'darwin' | 'linux'
  arch: varchar('arch', { length: 32 }).notNull(),       // 'x86_64' | 'aarch64'
  url: varchar('url', { length: 512 }).notNull(),
  signature: text('signature').notNull(),                // .sig file content
  pubDate: timestamp('pub_date').notNull().defaultNow(),
  notes: text('notes'),
  createdAt: timestamp('created_at').notNull().defaultNow()
}, (t) => ({
  pk: primaryKey({ columns: [t.version, t.target, t.arch] }),
  pubDateIdx: index('releases_pub_date_idx').on(t.pubDate)
}))

export const activations = pgTable('activations', {
  id: uuid('id').primaryKey().defaultRandom(),
  licenseId: uuid('license_id').notNull().references(() => licenses.id),
  machineFingerprint: varchar('machine_fingerprint', { length: 128 }).notNull(),
  activatedAt: timestamp('activated_at').notNull().defaultNow(),
  ipAddress: varchar('ip_address', { length: 64 })
})
