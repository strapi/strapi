import { compareCodeUnits } from '../../../generators/common/compare';
import { filterRegisteredSources } from '../../../generators/common/sources';
import { createLogger } from '../../../generators/utils';

// Each pair orders one way by code units and the other way with localeCompare in common locales
const LOCALE_SENSITIVE_PAIRS = [
  ['Zeta', 'alpha'],
  ['a-b', 'a_b'],
];

describe('compareCodeUnits', () => {
  test.each(LOCALE_SENSITIVE_PAIRS)('orders %s before %s', (first, second) => {
    expect(compareCodeUnits(first, second)).toBe(-1);
    expect(compareCodeUnits(second, first)).toBe(1);
    expect([second, first].sort(compareCodeUnits)).toEqual([first, second]);
  });

  test('equal strings compare as 0', () => {
    expect(compareCodeUnits('global::cors', 'global::cors')).toBe(0);
  });
});

describe('filterRegisteredSources', () => {
  test('sorts the sources by uid in code-unit order', () => {
    const uids = ['global::alpha', 'global::a_b', 'global::Zeta', 'global::a-b'];
    const sources = uids.map((uid) => ({ uid, file: `${uid}.ts`, specifier: `./${uid}` }));
    const registered = Object.fromEntries(uids.map((uid) => [uid, {}]));

    const sorted = filterRegisteredSources(sources, registered, createLogger({ silent: true }));

    expect(sorted.map((source) => source.uid)).toEqual([
      'global::Zeta',
      'global::a-b',
      'global::a_b',
      'global::alpha',
    ]);
  });
});
