const makeUnique = <T extends string>(array: T[]): T[] => [...new Set(array)];

export { makeUnique };
