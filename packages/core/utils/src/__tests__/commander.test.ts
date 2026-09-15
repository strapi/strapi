import { getCommandPath, type NamedCommand } from '../commander';

/**
 * Stands in for a commander `Command`. The real type is checked against
 * `NamedCommand` where the helper is called, this only covers the traversal.
 */
const command = (name: string, parent: NamedCommand | null = null): NamedCommand => ({
  name: () => name,
  parent,
});

describe('getCommandPath', () => {
  it('returns the name of a top level command', () => {
    const program = command('strapi');

    expect(getCommandPath(command('build', program))).toBe('build');
  });

  it('joins the names of a nested command', () => {
    const program = command('strapi');
    const openapi = command('openapi', program);

    expect(getCommandPath(command('generate', openapi))).toBe('openapi generate');
  });

  it('leaves out the root program, which is the binary rather than an argument', () => {
    expect(getCommandPath(command('strapi'))).toBe('');
  });
});
