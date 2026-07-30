/**
 * inquirer v9+ is ESM-only; Jest resolves it here via moduleNameMapper in jest.config.js.
 * Override per test with jest.spyOn(inquirer, 'prompt') or prompt.mockResolvedValue(...).
 */
export const prompt = jest.fn().mockResolvedValue({});

export default {
  prompt,
};
