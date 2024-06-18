export interface Options {
  useNpm?: boolean;
  usePnpm?: boolean;
  useYarn?: boolean;
  quickstart?: boolean;
  run?: boolean;
  dbclient?: DBClient;
  skipCloud?: boolean;
  dbhost?: string;
  dbport?: string;
  dbname?: string;
  dbusername?: string;
  dbpassword?: string;
  dbssl?: string;
  dbfile?: string;
  template?: string;
  typescript?: boolean;
  javascript?: boolean;
}

export type DBClient = 'mysql' | 'postgres' | 'sqlite';

export type DBConfig = {
  client: DBClient;
  connection: {
    host?: string;
    port?: string;
    database?: string;
    username?: string;
    password?: string;
    filename?: string;
    ssl?: boolean;
  };
};
