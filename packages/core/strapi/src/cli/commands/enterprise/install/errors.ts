/**
 * An expected failure with a message written for the user. The command prints its message without
 * a stack trace and exits with code 1.
 */
export class EnterpriseInstallError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'EnterpriseInstallError';
  }
}
