import fs from 'fs';
import path from 'path';
import _ from 'lodash';
import type { DatabaseInfo } from '../../types';

export const createDatabaseConfig = ({ useTypescript }: { useTypescript: boolean }) => {
  const language = useTypescript ? 'ts' : 'js';
  const tmpl = fs.readFileSync(
    path.join(__dirname, 'database-templates', language, `database.template`)
  );
  const compile = _.template(tmpl.toString());

  return compile();
};

export const generateDbEnvariables = ({
  connection,
  client,
}: {
  connection: DatabaseInfo;
  client: string;
}) => {
  const tmpl = fs.readFileSync(path.join(__dirname, 'database-templates', `${client}.template`));
  const compile = _.template(tmpl.toString());

  return compile({
    client,
    connection: {
      ...connection.connection,
      ssl: connection.connection.ssl || false,
    },
  });
};
