export class EnterpriseInstallError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'EnterpriseInstallError';
  }
}

export class PackageManagerError extends Error {
  readonly exitCode: number;

  constructor(exitCode: number) {
    super(`The package manager exited with code ${exitCode}.`);
    this.name = 'PackageManagerError';
    this.exitCode = exitCode;
  }
}
