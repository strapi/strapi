'use strict';

// Database migration to add indexes for audit_logs table
module.exports = {
  async up(knex) {
    await knex.schema.alterTable('audit_logs', (table) => {
      table.index(['content_type', 'timestamp'], 'idx_audit_logs_content_type_timestamp');
      table.index(['record_id', 'timestamp'], 'idx_audit_logs_record_id_timestamp');
      table.index(['user', 'timestamp'], 'idx_audit_logs_user_timestamp');
      table.index(['action', 'timestamp'], 'idx_audit_logs_action_timestamp');
      table.index(['request_id'], 'idx_audit_logs_request_id');
      table.index(['timestamp'], 'idx_audit_logs_timestamp');
    });
  },

  async down(knex) {
    await knex.schema.alterTable('audit_logs', (table) => {
      table.dropIndex(['content_type', 'timestamp'], 'idx_audit_logs_content_type_timestamp');
      table.dropIndex(['record_id', 'timestamp'], 'idx_audit_logs_record_id_timestamp');
      table.dropIndex(['user', 'timestamp'], 'idx_audit_logs_user_timestamp');
      table.dropIndex(['action', 'timestamp'], 'idx_audit_logs_action_timestamp');
      table.dropIndex(['request_id'], 'idx_audit_logs_request_id');
      table.dropIndex(['timestamp'], 'idx_audit_logs_timestamp');
    });
  }
};
