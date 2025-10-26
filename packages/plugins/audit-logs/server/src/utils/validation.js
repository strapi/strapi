'use strict';

/**
 * Validation utilities for audit log API endpoints
 */

const VALID_ACTIONS = ['create', 'update', 'delete'];
const MIN_PAGE = 1;
const MAX_PAGE_SIZE = 100;
const DEFAULT_PAGE_SIZE = 25;
const VALID_SORT_FIELDS = ['timestamp', 'contentType', 'action', 'userId', 'recordId'];
const VALID_SORT_ORDERS = ['asc', 'desc'];

/**
 * Validate and parse pagination parameters
 * @param {object} query - Query parameters
 * @returns {object} Validated pagination object
 * @throws {Error} If validation fails
 */
function validatePagination(query) {
  let page = DEFAULT_PAGE_SIZE;
  let pageSize = DEFAULT_PAGE_SIZE;

  if (query.page) {
    page = parseInt(query.page, 10);
    if (isNaN(page) || page < MIN_PAGE) {
      throw new Error(`Invalid page number. Must be >= ${MIN_PAGE}`);
    }
  } else {
    page = MIN_PAGE;
  }

  if (query.pageSize) {
    pageSize = parseInt(query.pageSize, 10);
    if (isNaN(pageSize) || pageSize < 1 || pageSize > MAX_PAGE_SIZE) {
      throw new Error(`Invalid pageSize. Must be between 1 and ${MAX_PAGE_SIZE}`);
    }
  }

  return { page, pageSize };
}

/**
 * Validate and parse sorting parameters
 * @param {object} query - Query parameters
 * @returns {object} Validated sort object
 * @throws {Error} If validation fails
 */
function validateSort(query) {
  const sortField = query.sortBy || 'timestamp';
  const sortOrder = query.sortOrder || 'desc';

  if (!VALID_SORT_FIELDS.includes(sortField)) {
    throw new Error(
      `Invalid sortBy field: ${sortField}. Must be one of: ${VALID_SORT_FIELDS.join(', ')}`
    );
  }

  if (!VALID_SORT_ORDERS.includes(sortOrder)) {
    throw new Error(
      `Invalid sortOrder: ${sortOrder}. Must be one of: ${VALID_SORT_ORDERS.join(', ')}`
    );
  }

  return { field: sortField, order: sortOrder };
}

/**
 * Validate and parse filter parameters
 * @param {object} query - Query parameters
 * @returns {object} Validated filters object
 * @throws {Error} If validation fails
 */
function validateFilters(query) {
  const filters = {};

  // Validate action
  if (query.action) {
    if (!VALID_ACTIONS.includes(query.action)) {
      throw new Error(
        `Invalid action: ${query.action}. Must be one of: ${VALID_ACTIONS.join(', ')}`
      );
    }
    filters.action = query.action;
  }

  // Validate userId
  if (query.userId) {
    const userId = parseInt(query.userId, 10);
    if (isNaN(userId)) {
      throw new Error('Invalid userId. Must be a number');
    }
    filters.userId = userId;
  }

  // Validate date range
  if (query.dateFrom) {
    const dateFrom = new Date(query.dateFrom);
    if (isNaN(dateFrom.getTime())) {
      throw new Error('Invalid dateFrom. Must be a valid ISO date string');
    }
    filters.dateFrom = query.dateFrom;
  }

  if (query.dateTo) {
    const dateTo = new Date(query.dateTo);
    if (isNaN(dateTo.getTime())) {
      throw new Error('Invalid dateTo. Must be a valid ISO date string');
    }
    filters.dateTo = query.dateTo;
  }

  // Validate date range logic
  if (filters.dateFrom && filters.dateTo) {
    const from = new Date(filters.dateFrom);
    const to = new Date(filters.dateTo);
    if (from > to) {
      throw new Error('dateFrom must be before dateTo');
    }
  }

  // Content type and record ID don't need special validation (strings)
  if (query.contentType) {
    filters.contentType = query.contentType;
  }

  if (query.recordId) {
    filters.recordId = query.recordId;
  }

  return filters;
}

/**
 * Validate ID parameter
 * @param {string} id - ID parameter
 * @throws {Error} If validation fails
 */
function validateId(id) {
  if (!id || typeof id !== 'string') {
    throw new Error('Invalid ID parameter');
  }

  const numericId = parseInt(id, 10);
  if (isNaN(numericId) || numericId < 1) {
    throw new Error('ID must be a positive number');
  }
}

module.exports = {
  validatePagination,
  validateSort,
  validateFilters,
  validateId,
  VALID_ACTIONS,
  VALID_SORT_FIELDS,
  VALID_SORT_ORDERS,
  MAX_PAGE_SIZE,
};
