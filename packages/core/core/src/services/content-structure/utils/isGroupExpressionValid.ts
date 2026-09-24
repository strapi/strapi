const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
};

export const isGroupExpressionValid = (
  rawGroupExpression: unknown
): rawGroupExpression is {
  parent: string | null;
  children: unknown[];
  name: string;
  id: string;
} => {
  if (!isRecord(rawGroupExpression)) return false;

  if (typeof rawGroupExpression.id !== 'string') return false;
  if (rawGroupExpression.id === '') return false;

  if (typeof rawGroupExpression.name !== 'string') return false;

  if (rawGroupExpression.parent !== null && typeof rawGroupExpression.parent !== 'string') {
    return false;
  }

  if (!Array.isArray(rawGroupExpression.children)) return false;

  return true;
};
