export interface Options {
  useYarn?: boolean;
}

export interface PackageInfo {
  name: string;
  version: string;
}

export interface Program {
  useNpm?: boolean;
  debug?: boolean;
  quickstart?: boolean;
  dbclient?: string;
  dbhost?: string;
  dbport?: string;
  dbname?: string;
  dbusername?: string;
  dbpassword?: string;
  dbssl?: string;
  dbfile?: string;
  dbforce?: boolean;
  template?: string;
}
