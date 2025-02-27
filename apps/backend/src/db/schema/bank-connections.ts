import { pgTable, uuid, text, timestamp, unique } from 'drizzle-orm/pg-core';

export const bankConnections = pgTable(
  'bank_connections',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id').notNull(),   // Reference Supabase auth.users table
    plaidAccessToken: text('plaid_access_token').notNull(),
    plaidItemId: text('plaid_item_id').notNull(),
    institutionId: text('institution_id').notNull(),
    institutionName: text('institution_name'),
    status: text('status')
      .notNull()
      .default('active')
      .$type<'active' | 'inactive'>(),
    itemStatus: text('item_status').notNull().default('good'),
    lastStatusUpdate: timestamp('last_status_update', { withTimezone: true }).defaultNow(),
    errorCode: text('error_code'),
    errorMessage: text('error_message'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
    deleteReason: text('delete_reason')
  },
  (table) => [
    unique('user_institution_unique').on(table.userId, table.institutionId)
  ]
);