import path from 'path';
import type { Core } from '@strapi/strapi';

const config = ({ env }: Core.Config.Shared.ConfigParams): Core.Config.Database<'sqlite'> => ({
  connection: {
    client: 'sqlite',
    connection: {
      filename: path.join(__dirname, '..', '..', env('DATABASE_FILENAME', '.tmp/data.db')),
    },
    useNullAsDefault: true,
  },
});

export default config;
