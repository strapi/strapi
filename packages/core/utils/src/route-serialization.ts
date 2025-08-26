/*
 * Utility to sanitize content API route objects for safe JSON serialization.
 * Removes circular references from all objects for safe serialization.
 *
 * NOTE: some content API routes are returned to the admin panel e.g. to
 * populate the users and permissions roles page. We need to ensure that the
 * routes can be serialized to JSON without errors.
 */

import createdDebugger from 'debug';

const debug = createdDebugger('strapi:core:utils:route-serialization');

/**
 * Builds a readable path string from the current processing stack
 */
const buildObjectPath = (stack: object[], currentObj: object): string => {
  const pathParts: string[] = [];
  let current = currentObj;

  // Work backwards through the stack to build the path
  for (let i = stack.length - 1; i >= 0; i -= 1) {
    const parent = stack[i];
    // Find the key that leads from parent to current
    for (const [key, value] of Object.entries(parent as Record<string, unknown>)) {
      if (value === current) {
        pathParts.unshift(key);
        break;
      }
    }
    current = parent;
  }

  return pathParts.join('.');
};

const removeCircularReferences = (
  obj: unknown,
  stack: object[] = [],
  depth: number = 0,
  maxDepth: number = 20
): unknown => {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }

  // Skip Zod schema internals that are known to be deep and problematic
  if (depth > 5 && typeof obj === 'object' && obj !== null) {
    const keys = Object.keys(obj as object);
    if (keys.includes('def') || keys.includes('shape') || keys.includes('element')) {
      return '[ZodSchema]'; // Skip deep Zod structures
    }
  }

  // Prevent going too deep to avoid performance issues
  if (depth > maxDepth) {
    const path = buildObjectPath(stack, obj as object);
    debug(
      `Max depth (${maxDepth}) exceeded at depth ${depth}. Path: ${path}. Object type: ${Array.isArray(obj) ? 'Array' : 'Object'}, keys: ${Object.keys(
        obj as object
      )
        .slice(0, 5)
        .join(', ')}${Object.keys(obj as object).length > 5 ? '...' : ''}`
    );
    return '[MaxDepth]';
  }

  // Check if this object is in the current processing stack (true circular reference)
  if (stack.includes(obj as object)) {
    const path = buildObjectPath(stack, obj as object);
    debug(
      `Circular reference detected at depth ${depth}. Path: ${path}. Object type: ${Array.isArray(obj) ? 'Array' : 'Object'}, keys: ${Object.keys(
        obj as object
      )
        .slice(0, 5)
        .join(', ')}${Object.keys(obj as object).length > 5 ? '...' : ''}`
    );
    return '[Circular]';
  }

  // Add to current stack
  stack.push(obj as object);

  if (Array.isArray(obj)) {
    const result = obj.map((item) => removeCircularReferences(item, stack, depth + 1, maxDepth));
    // Remove from stack when done with this branch
    stack.pop();
    return result;
  }

  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
    result[key] = removeCircularReferences(value, stack, depth + 1, maxDepth);
  }

  // Remove from stack when done with this branch
  stack.pop();
  return result;
};

export const sanitizeRoutesMapForSerialization = (
  map: Record<string, unknown[]>
): Record<string, unknown> => removeCircularReferences(map) as Record<string, unknown>;
