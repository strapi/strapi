/**
 * JSON-RPC error codes and messages
 * @see https://json-rpc.dev/docs/reference/error-codes
 */
export const JSON_RPC_ERRORS = {
  INTERNAL_ERROR: {
    code: -32603, // 	Internal error
    message: 'Internal error',
    httpStatus: 500,
  },
  INVALID_SESSION: {
    code: -32003, // Session expired
    message: 'Invalid session',
    httpStatus: 400,
  },
  MAX_SESSIONS_REACHED: {
    code: -32001, // Server overloaded
    message: 'Maximum number of sessions reached',
    httpStatus: 503,
  },
  SESSION_REQUIRED: {
    code: -32000, // Server error
    message: 'Session required',
    httpStatus: 400,
  },
  METHOD_NOT_ALLOWED: {
    code: -32601, // Method not found
    message: 'Method not allowed',
    httpStatus: 405,
  },
} as const;
