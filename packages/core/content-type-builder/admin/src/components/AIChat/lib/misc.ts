export const generateId = (size: number = 16) => {
  return crypto.randomUUID().slice(0, size);
};
