import type { Common } from '@strapi/types';

import entityValidator from '../..';
import { models, existentIDs } from './utils/relations.testdata';

describe('Entity validator | Relations | Empty connect and disconnect', () => {
  const count = jest.fn(async ({ where }: any) => where.id.$in.length);

  beforeAll(() => {
    global.strapi = {
      components: {
        'basic.dev-compo': {},
      },
      db: {
        query() {
          return { count };
        },
      },
      errors: {
        badRequest: jest.fn(),
      },
      getModel: (uid: string) => models.get(uid),
    } as any;
  });

  beforeEach(() => {
    count.mockClear();
  });

  const model = models.get('api::dev.dev' as Common.UID.ContentType)!;

  it('does not look the relations up when none is connected or disconnected', async () => {
    await entityValidator.validateEntityCreation(
      model,
      { categories: { connect: [], disconnect: [] } },
      { isDraft: true, locale: null }
    );

    expect(count).not.toHaveBeenCalled();
  });

  it('looks the relations up as soon as one is connected', async () => {
    await entityValidator.validateEntityCreation(
      model,
      { categories: { connect: [{ id: existentIDs[0] }], disconnect: [] } },
      { isDraft: true, locale: null }
    );

    expect(count).toHaveBeenCalledTimes(1);
  });
});
