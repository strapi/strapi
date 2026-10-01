export class EnterpriseInstallError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'EnterpriseInstallError';
  }
}
