import controller from '../iso-locales';

describe('ISO locales', () => {
  test('listIsoLocales', () => {
    const isoLocales = [{ code: 'af', name: 'Afrikaans (af)' }];
    const getIsoLocales = jest.fn(() => isoLocales);
    global.strapi = {
      plugins: {
        i18n: {
          services: {
            'iso-locales': {
              getIsoLocales,
            },
          },
        },
      },
    } as any;

    const ctx: any = {};
    controller.listIsoLocales(ctx, async () => {});

    expect(ctx.body).toMatchObject(isoLocales);
  });
});
