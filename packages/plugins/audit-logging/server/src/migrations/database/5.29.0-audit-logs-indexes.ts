import type { Migration, Database } from '@strapi/database';

type Knex = Parameters<Migration['up']>[0];

/**
 * Migration to add performance indexes to the audit_logs table
 * These indexes optimize common query patterns for filtering and sorting audit logs
 */
export const addAuditLogsIndexes: Migration = {
  name: 'audit-logging::5.29.0-add-audit-logs-indexes',
  async up(trx: Knex, db: Database) {
    const tableName = 'audit_logs';
    
    // Check if the table exists
    const hasTable = await trx.schema.hasTable(tableName);
    
    if (!hasTable) {
      // Table will be created by Strapi's content type system
      return;
    }

    // Add individual indexes for common filter fields
    const indexes = [
      { name: 'idx_audit_logs_content_type', column: 'content_type' },
      { name: 'idx_audit_logs_user_id', column: 'user_id' },
      { name: 'idx_audit_logs_action', column: 'action' },
      { name: 'idx_audit_logs_timestamp', column: 'timestamp' },
    ];

    // Add composite indexes for common query patterns
    const compositeIndexes = [
      { 
        name: 'idx_audit_logs_content_type_timestamp', 
        columns: ['content_type', 'timestamp'] 
      },
      { 
        name: 'idx_audit_logs_user_action', 
        columns: ['user_id', 'action'] 
      },
    ];

    // Create individual indexes
    for (const index of indexes) {
      const hasIndex = await trx.schema.hasIndex(tableName, index.name);
      if (!hasIndex) {
        await trx.schema.alterTable(tableName, (table) => {
          table.index([index.column], index.name);
        });
      }
    }

    // Create composite indexes
    for (const index of compositeIndexes) {
      const hasIndex = await trx.schema.hasIndex(tableName, index.name);
      if (!hasIndex) {
        await trx.schema.alterTable(tableName, (table) => {
          table.index(index.columns, index.name);
        });
      }
    }
  },

  async down(trx: Knex) {
    const tableName = 'audit_logs';
    
    // Check if the table exists
    const hasTable = await trx.schema.hasTable(tableName);
    
    if (!hasTable) {
      return;
    }

    // Remove indexes in reverse order
    const allIndexes = [
      'idx_audit_logs_user_action',
      'idx_audit_logs_content_type_timestamp',
      'idx_audit_logs_timestamp',
      'idx_audit_logs_action',
      'idx_audit_logs_user_id',
      'idx_audit_logs_content_type',
    ];

    for (const indexName of allIndexes) {
      const hasIndex = await trx.schema.hasIndex(tableName, indexName);
      if (hasIndex) {
        await trx.schema.alterTable(tableName, (table) => {
          table.dropIndex([], indexName);
        });
      }
    }
  },
};