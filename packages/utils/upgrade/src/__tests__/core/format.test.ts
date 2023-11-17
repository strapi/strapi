import * as f from '../../core/format';

import type { RunReports } from '../../types';

describe('Format', () => {
  test('Path', () => {
    const formatted = f.path('Foo');
    expect(formatted).toStrictEqual(formatted);
  });

  test.each(['4.15.0', '5.0.0', '11.11.11', 'latest', 'major', 'minor', 'patch'])(
    'Version (%s)',
    (version) => {
      const formatted = f.version(version);
      expect(formatted).toStrictEqual(formatted);
    }
  );

  test.each(['>4.0.0 <=5.0.0', '>4.5.2 <7.1.4'])('Version Range (%s)', (range) => {
    const formatted = f.versionRange(range);
    expect(formatted).toStrictEqual(formatted);
  });

  test.each(['console.log-to-console.info', 'update-json-file', 'transform'])(
    'Transform File Path (%s)',
    (transformFilePath) => {
      const formatted = f.transform(transformFilePath);
      expect(formatted).toStrictEqual(formatted);
    }
  );

  test.each(['foo', 'bar', 'baz'])('Highlight (%s)', (text) => {
    const formatted = f.version(text);
    expect(formatted).toStrictEqual(formatted);
  });

  test('Reports', () => {
    const reports: RunReports = [
      {
        transform: {
          path: './5.0.0/transform.code.ts',
          fullPath: '/root/5.0.0/transform.code.ts',
          version: '5.0.0',
          formatted: 'transform',
          kind: 'code',
        },
        report: { error: 0, skip: 1, nochange: 2, ok: 3, timeElapsed: '0.400' },
      },
      {
        transform: {
          path: './6.3.0/update-deps.json.ts',
          fullPath: '/root/6.3.0/update-deps.json.ts',
          version: '6.3.0',
          formatted: 'update deps',
          kind: 'json',
        },
        report: { error: 5, skip: 0, nochange: 90, ok: 40, timeElapsed: '0.030' },
      },
    ];

    const formatted = f.reports(reports);

    // Note: Check the jest terminal output (human-readable) in case the snapshot has changed
    expect(formatted).toMatchInlineSnapshot(`
      "[90m┌────[39m[90m┬─────────[39m[90m┬──────[39m[90m┬─────────────[39m[90m┬──────────[39m[90m┬───────────[39m[90m┬─────────────────────┐[39m
      [90m│[39m[31m [1m[90mN°[31m[22m [39m[90m│[39m[31m [1m[35mVersion[31m[22m [39m[90m│[39m[31m [1m[33mKind[31m[22m [39m[90m│[39m[31m [1m[36mName[31m[22m        [39m[90m│[39m[31m [1m[32mAffected[31m[22m [39m[90m│[39m[31m [1m[31mUnchanged[31m[22m [39m[90m│[39m[31m [1m[34mDuration[31m[22m            [39m[90m│[39m
      [90m├────[39m[90m┼─────────[39m[90m┼──────[39m[90m┼─────────────[39m[90m┼──────────[39m[90m┼───────────[39m[90m┼─────────────────────┤[39m
      [90m│[39m [90m0[39m  [90m│[39m [35m5.0.0[39m   [90m│[39m [33mcode[39m [90m│[39m [36mtransform[39m   [90m│[39m [32m3[39m        [90m│[39m [90m2[39m         [90m│[39m 0.400s [2m[3m(cold start)[23m[22m [90m│[39m
      [90m│[39m [90m1[39m  [90m│[39m [35m6.3.0[39m   [90m│[39m [33mjson[39m [90m│[39m [36mupdate deps[39m [90m│[39m [32m40[39m       [90m│[39m [90m90[39m        [90m│[39m 0.030s              [90m│[39m
      [90m└────[39m[90m┴─────────[39m[90m┴──────[39m[90m┴─────────────[39m[90m┴──────────[39m[90m┴───────────[39m[90m┴─────────────────────┘[39m"
    `);
  });

  test.each([
    [0, '0.000s'],
    [10, '0.010s'],
    [100, '0.100s'],
    [1000, '1.000s'],
    [5050, '5.050s'],
    [60000, '60.000s'],
  ])('Duration ms (%s)', (duration, expected) => {
    const formatted = f.durationMs(duration);
    expect(formatted).toStrictEqual(expected);
  });
});
