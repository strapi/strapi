import type { Core, Data } from '@strapi/types';

import type { HistoryVersionAuthor } from '../../../../shared/contracts/history-versions';
import type { StoredAuthorReference } from './utils';

interface AdminUser {
  id: Data.ID;
  username: string | null;
  firstname: string | null;
  lastname: string | null;
  email: string;
}

type FindNames = (ids: string[]) => Promise<Map<string, string>>;

export const getAdminUserName = ({ username, firstname, lastname, email }: AdminUser) => {
  if (username) {
    return username;
  }

  if (firstname) {
    return `${firstname} ${lastname ?? ''}`.trim();
  }

  return email;
};

const createNameFinders = (strapi: Core.Strapi): Partial<Record<string, FindNames>> => ({
  async 'admin::user'(ids) {
    const users: AdminUser[] = await strapi.db.query('admin::user').findMany({
      select: ['id', 'username', 'firstname', 'lastname', 'email'],
      where: { id: { $in: ids } },
    });

    return new Map(users.map((user) => [String(user.id), getAdminUserName(user)]));
  },
});

export const createAuthorNames = ({ strapi }: { strapi: Core.Strapi }) => {
  const nameFinders = createNameFinders(strapi);

  /**
   * Finds the current names of the authors, with one query per model.
   * Returns a function that gives each author its name.
   */
  return async (authors: Array<StoredAuthorReference | null>) => {
    const idsByModel = new Map<string, Set<string>>();

    authors.forEach((author) => {
      if (author?.id) {
        idsByModel.set(author.model, (idsByModel.get(author.model) ?? new Set()).add(author.id));
      }
    });

    const namesByModel = new Map(
      await Promise.all(
        Array.from(idsByModel, async ([model, ids]) => {
          const names = (await nameFinders[model]?.(Array.from(ids))) ?? new Map<string, string>();

          return [model, names] as const;
        })
      )
    );

    return (author: StoredAuthorReference | null): HistoryVersionAuthor | null => {
      if (!author) {
        return null;
      }

      const name = author.id ? namesByModel.get(author.model)?.get(author.id) : undefined;

      return name === undefined ? { ...author, id: null, name: null } : { ...author, name };
    };
  };
};
