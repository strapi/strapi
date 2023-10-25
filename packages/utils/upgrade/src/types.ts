export namespace Version {
  export type SemVer = `${number}.${number}.${number}`;
  export type Latest = 'latest';

  export type Any = SemVer | Latest;
}

export interface CLIOptions {
  // TODO: Add back the version option when we handle targeting specific versions
  // NOTE: For now we can only accept major upgrades & allow minors and patches in future releases
  // version?: Version.Latest | Version.Major;
  silent?: boolean;
  debug?: boolean;
}
