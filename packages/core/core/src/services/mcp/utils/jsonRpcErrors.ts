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
  AUTHENTICATION_REQUIRED: {
    code: -32000, // Server error
    message: 'Authentication required',
    httpStatus: 401,
  },
  METHOD_NOT_ALLOWED: {
    code: -32601, // Method not found
    message: 'Method not allowed',
    httpStatus: 405,
  },
} as const;
