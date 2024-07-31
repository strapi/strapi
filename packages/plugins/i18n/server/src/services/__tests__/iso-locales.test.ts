import isoLocalesServiceFactory from '../iso-locales';

const { getIsoLocales } = isoLocalesServiceFactory();

describe('ISO locales', () => {
  test('getIsoLocales', () => {
    const locales = getIsoLocales();

    expect(locales).toMatchSnapshot();
  });
});
