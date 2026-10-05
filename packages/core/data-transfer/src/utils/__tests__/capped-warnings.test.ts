import { createCappedWarningReporter, DEFAULT_DETAILED_WARNING_LIMIT } from '../capped-warnings';

describe('createCappedWarningReporter', () => {
  test('emits every warning when under the limit', () => {
    const onWarning = jest.fn();
    const reporter = createCappedWarningReporter(onWarning, 3);

    reporter.warn('one');
    reporter.warn('two');

    expect(onWarning.mock.calls).toEqual([['one'], ['two']]);
  });

  test('emits a suppression notice once the limit is reached', () => {
    const onWarning = jest.fn();
    const reporter = createCappedWarningReporter(onWarning, 2);

    reporter.warn('one');
    reporter.warn('two');
    reporter.warn('three');
    reporter.warn('four');

    expect(onWarning).toHaveBeenCalledTimes(3);
    expect(onWarning).toHaveBeenNthCalledWith(1, 'one');
    expect(onWarning).toHaveBeenNthCalledWith(2, 'two');
    expect(onWarning).toHaveBeenNthCalledWith(
      3,
      expect.stringContaining('Further detailed warnings suppressed after 2 messages')
    );
  });

  test('defaults to DEFAULT_DETAILED_WARNING_LIMIT', () => {
    const onWarning = jest.fn();
    const reporter = createCappedWarningReporter(onWarning);

    for (let i = 0; i < DEFAULT_DETAILED_WARNING_LIMIT + 1; i += 1) {
      reporter.warn(`warning-${i}`);
    }

    expect(onWarning).toHaveBeenCalledTimes(DEFAULT_DETAILED_WARNING_LIMIT + 1);
  });

  test('is a no-op when onWarning is omitted', () => {
    const reporter = createCappedWarningReporter();

    expect(() => reporter.warn('ignored')).not.toThrow();
  });
});
