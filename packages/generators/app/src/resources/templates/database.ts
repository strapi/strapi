import fs from 'fs';
import path from 'path';
import _ from 'lodash';
import type { Scope } from '../../types';

export const createDatabaseConfig = ({ useTypescript }: { useTypescript: boolean }) => {
  const language = useTypescript ? 'ts' : 'js';
  const tmpl = fs.readFileSync(
    path.join(__dirname, 'database-templates', language, `database.template`)
  );
  const compile = _.template(tmpl.toString());

  return compile();
};

export const generateDbEnvVariables = (scope: Scope) => {
  const tmpl = fs.readFileSync(
    path.join(__dirname, 'database-templates', `${scope.database.client}.template`)
  );
  const compile = _.template(tmpl.toString());

  return compile({
    client: scope.database.client,
    connection: {
      ...scope.database.connection,
      ssl: scope.database.connection?.ssl || false,
    },
  });
};
