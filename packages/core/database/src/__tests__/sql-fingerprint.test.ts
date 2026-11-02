import { normalizeSqlFingerprint } from '../performance';

describe('normalizeSqlFingerprint', () => {
  it('replaces string and numeric literals', () => {
    expect(
      normalizeSqlFingerprint("select * from users where id = 42 and email = 'test@example.com'")
    ).toBe('select * from users where id = ? and email = ?');
  });

  it('keeps postgres identifiers and collapses in-lists of different lengths', () => {
    const shortList = 'select "t0"."id" from "tags" as "t0" where "t0"."id" in ($1, $2)';
    const longList = 'select "t0"."id" from "tags" as "t0" where "t0"."id" in ($1, $2, $3)';

    const fingerprint = 'select "t0"."id" from "tags" as "t0" where "t0"."id" in (?)';
    expect(normalizeSqlFingerprint(shortList)).toBe(fingerprint);
    expect(normalizeSqlFingerprint(longList)).toBe(fingerprint);
  });

  it('does not turn quoted identifiers into placeholders', () => {
    expect(normalizeSqlFingerprint('select "t0"."id" from "tags" as "t0"')).toBe(
      'select "t0"."id" from "tags" as "t0"'
    );
  });

  it('keeps mysql backtick identifiers', () => {
    expect(
      normalizeSqlFingerprint('select `t0`.`id` from `tags` as `t0` where `t0`.`id` in (?, ?)')
    ).toBe('select `t0`.`id` from `tags` as `t0` where `t0`.`id` in (?)');
  });

  it('collapses unquoted in-lists after numeric literals are replaced', () => {
    expect(normalizeSqlFingerprint('select * from tags where id in (1, 2, 3)')).toBe(
      'select * from tags where id in (?)'
    );
  });

  it('returns unknown for empty sql', () => {
    expect(normalizeSqlFingerprint()).toBe('unknown');
    expect(normalizeSqlFingerprint('')).toBe('unknown');
  });
});
