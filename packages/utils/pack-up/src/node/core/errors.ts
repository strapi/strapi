const isError = (err: unknown): err is Error => err instanceof Error;

export { isError };
