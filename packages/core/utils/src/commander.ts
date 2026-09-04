/**
 * The subset of a Commander `Command` needed by these helpers, typed structurally
 * so that this package does not have to depend on commander.
 */
export interface NamedCommand {
  name(): string;
  parent: NamedCommand | null;
}

/**
 * Rebuilds the invocation path of a command (e.g. `openapi generate`), so error
 * messages can point at the command the user actually typed. The root program is
 * left out, since it is the binary name rather than something the user passed.
 */
export function getCommandPath(command: NamedCommand) {
  const names: string[] = [];
  let current: NamedCommand | null = command;

  while (current?.parent) {
    names.unshift(current.name());
    current = current.parent;
  }

  return names.join(' ');
}
