import type { Question } from 'inquirer';
import type { Scope } from '../types';

interface QuestionFactory {
  (options: { scope: Scope; client: 'postgres' | 'mysql' | 'sqlite' }): Question;
}

const DEFAULT_PORTS = {
  postgres: 5432,
  mysql: 3306,
  sqlite: undefined,
};

const database: QuestionFactory = ({ scope }) => ({
  type: 'input',
  name: 'database',
  message: 'Database name:',
  default: scope.name,
  validate(value: string) {
    if (value.includes('.')) {
      return `The database name can't contain a "."`;
    }

    return true;
  },
});

const host: QuestionFactory = () => ({
  type: 'input',
  name: 'host',
  message: 'Host:',
  default: '127.0.0.1',
});

const port: QuestionFactory = ({ client }) => ({
  type: 'input',
  name: 'port',
  message: 'Port:',
  default: DEFAULT_PORTS[client],
});

const username: QuestionFactory = () => ({
  type: 'input',
  name: 'username',
  message: 'Username:',
});

const password: QuestionFactory = () => ({
  type: 'password',
  name: 'password',
  message: 'Password:',
  mask: '*',
});

const ssl: QuestionFactory = () => ({
  type: 'confirm',
  name: 'ssl',
  message: 'Enable SSL connection:',
  default: false,
});

const filename: QuestionFactory = () => ({
  type: 'input',
  name: 'filename',
  message: 'Filename:',
  default: '.tmp/data.db',
});

export default {
  sqlite: [filename],
  postgres: [database, host, port, username, password, ssl],
  mysql: [database, host, port, username, password, ssl],
};
