import { isReleaseBlocked } from '../index';

// One rule for the `blocked` status and for the check that rejects or fails a run: a release
// is blocked exactly when a run of it would release nothing.
describe('isReleaseBlocked', () => {
  test.each([
    // all_or_nothing: one entry that isn't publishable holds back the others
    ['all_or_nothing', 3, 0, false],
    ['all_or_nothing', 3, 1, true],
    ['all_or_nothing', 3, 3, true],
    // A release from before the condition existed behaves as all_or_nothing
    [null, 3, 1, true],
    [undefined, 3, 1, true],
    // allow_partial: blocked only when no entry is publishable
    ['allow_partial', 3, 0, false],
    ['allow_partial', 3, 2, false],
    ['allow_partial', 3, 3, true],
    // A release with no entries runs, and ends done
    ['allow_partial', 0, 0, false],
    ['all_or_nothing', 0, 0, false],
  ] as const)(
    '%p with %p entries, %p not publishable: blocked is %p',
    (releaseCondition, total, notPublishable, blocked) => {
      expect(isReleaseBlocked(releaseCondition, { total, notPublishable })).toBe(blocked);
    }
  );
});
