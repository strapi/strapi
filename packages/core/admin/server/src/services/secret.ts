import { encryptValue, decryptValue } from '../utils/encryption';

const store = async (key: string, value: string) => {
  const createProvider = strapi.config.get<any>('admin.secret.createProvider');
  if (createProvider) {
    const { store } = createProvider();

    return store(key, value);
  }
  const encryptionKey = strapi.config.get<string>('admin.secret.encryptionKey');
  if (encryptionKey.length !== 64) {
    throw new Error('encryptionKey must be a 32-byte (64 hex characters) string');
  }
  const encryptedValue = encryptValue(value, Buffer.from(encryptionKey, 'hex'));

  await strapi.db.query('admin::secret').create({
    data: {
      key,
      value: encryptedValue,
    },
  });
};

const retrieve = async (key: string) => {
  const createProvider = strapi.config.get<any>('admin.secret.createProvider');
  if (createProvider) {
    const { retrieve } = createProvider();

    return retrieve(key);
  }
  const encryptionKey = strapi.config.get<string>('admin.secret.encryptionKey');
  if (encryptionKey.length !== 64) {
    throw new Error('encryptionKey must be a 32-byte (64 hex characters) string');
  }

  const [secret] = await strapi.db.query('admin::secret').findMany({
    where: {
      key,
    },
  });

  const value = decryptValue(secret.value, Buffer.from(encryptionKey, 'hex'));

  return value;
};

export default {
  store,
  retrieve,
};
