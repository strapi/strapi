import { getDateFnsLocaleName } from '../locales';

describe('getDateFnsLocale', () => {
  it('should return the correct date-fns locale', () => {
    expect(getDateFnsLocaleName('en')).toBe('enUS');
    expect(getDateFnsLocaleName('enUS')).toBe('enUS');
    expect(getDateFnsLocaleName('fr')).toBe('fr');
    expect(getDateFnsLocaleName('es')).toBe('es');
    expect(getDateFnsLocaleName('notareallocale')).toBe('enUS');
  });
});
