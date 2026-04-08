import {
  assertAssetFlowBatchWithinLimit,
  assertJsonBatchWithinLimit,
  batchLimitsFromAgreedMaxBatchSize,
  LEGACY_BATCH_BYTES,
  MAX_BATCH_SIZE_LIMIT_MIB,
  negotiateAgreedMaxBatchSize,
  parseOptionalMaxBatchSize,
  totalDecodedBytesInAssetFlow,
} from '../transfer-max-batch-size';

describe('transfer-max-batch-size', () => {
  describe('parseOptionalMaxBatchSize', () => {
    test('accepts valid positive finite numbers', () => {
      expect(parseOptionalMaxBatchSize(64)).toBe(64);
      expect(parseOptionalMaxBatchSize('128')).toBe(128);
    });

    test('returns undefined for invalid or out-of-range values', () => {
      expect(parseOptionalMaxBatchSize(undefined)).toBeUndefined();
      expect(parseOptionalMaxBatchSize('')).toBeUndefined();
      expect(parseOptionalMaxBatchSize(0)).toBeUndefined();
      expect(parseOptionalMaxBatchSize(-1)).toBeUndefined();
      expect(parseOptionalMaxBatchSize(NaN)).toBeUndefined();
      expect(parseOptionalMaxBatchSize(MAX_BATCH_SIZE_LIMIT_MIB + 1)).toBeUndefined();
    });
  });

  describe('negotiateAgreedMaxBatchSize', () => {
    test('returns null when both sides omit', () => {
      expect(negotiateAgreedMaxBatchSize(undefined, undefined)).toBeNull();
    });

    test('returns the minimum of declared values', () => {
      expect(negotiateAgreedMaxBatchSize(128, 256)).toBe(128);
      expect(negotiateAgreedMaxBatchSize(512, 256)).toBe(256);
    });

    test('uses the other side when one omits', () => {
      expect(negotiateAgreedMaxBatchSize(64, undefined)).toBe(64);
      expect(negotiateAgreedMaxBatchSize(undefined, 32)).toBe(32);
    });
  });

  describe('batchLimitsFromAgreedMaxBatchSize', () => {
    test('legacy 1 MiB when agreed value is null', () => {
      const limits = batchLimitsFromAgreedMaxBatchSize(null);
      expect(limits.assetBatchMaxBytes).toBe(LEGACY_BATCH_BYTES);
      expect(limits.jsonBatchMaxBytes).toBe(LEGACY_BATCH_BYTES);
    });

    test('smaller values yield smaller batches capped at 1 MiB max', () => {
      const limits = batchLimitsFromAgreedMaxBatchSize(32);
      expect(limits.assetBatchMaxBytes).toBeLessThanOrEqual(LEGACY_BATCH_BYTES);
      expect(limits.jsonBatchMaxBytes).toBeLessThanOrEqual(LEGACY_BATCH_BYTES);
      expect(limits.assetBatchMaxBytes).toBeGreaterThanOrEqual(64 * 1024);
    });

    test('negotiation pipeline: both sides omit -> same as legacy 1 MiB batches (non-breaking)', () => {
      const agreed = negotiateAgreedMaxBatchSize(undefined, undefined);
      expect(agreed).toBeNull();
      const limits = batchLimitsFromAgreedMaxBatchSize(agreed);
      expect(limits.assetBatchMaxBytes).toBe(1024 * 1024);
      expect(limits.jsonBatchMaxBytes).toBe(1024 * 1024);
    });

    test('negotiation pipeline: min(128, 256) MiB yields deterministic clamped batch sizes', () => {
      const agreed = negotiateAgreedMaxBatchSize(128, 256);
      expect(agreed).toBe(128);
      const limits = batchLimitsFromAgreedMaxBatchSize(agreed);
      expect(limits.assetBatchMaxBytes).toBe(1024 * 1024);
      expect(limits.jsonBatchMaxBytes).toBe(1024 * 1024);
    });

    test('negotiation pipeline: low value (16 MiB) yields sub-megabyte batches', () => {
      const agreed = negotiateAgreedMaxBatchSize(16, 16);
      expect(agreed).toBe(16);
      const limits = batchLimitsFromAgreedMaxBatchSize(agreed);
      expect(limits.assetBatchMaxBytes).toBeLessThan(1024 * 1024);
      expect(limits.jsonBatchMaxBytes).toBeLessThan(1024 * 1024);
      expect(limits.assetBatchMaxBytes).toBeGreaterThanOrEqual(64 * 1024);
    });
  });

  describe('assertJsonBatchWithinLimit', () => {
    test('throws when serialized payload exceeds limit', () => {
      expect(() => assertJsonBatchWithinLimit([{ x: 'y' }], 1)).toThrow(
        /exceeds negotiated jsonBatchMaxBytes/
      );
    });

    test('allows small payloads', () => {
      expect(() => assertJsonBatchWithinLimit([{ a: 1 }], LEGACY_BATCH_BYTES)).not.toThrow();
    });
  });

  describe('assertAssetFlowBatchWithinLimit', () => {
    test('throws when decoded stream bytes exceed limit', () => {
      const big = Buffer.alloc(2000, 1);
      expect(() =>
        assertAssetFlowBatchWithinLimit(
          [
            {
              action: 'stream',
              encoding: 'base64' as const,
              data: big.toString('base64'),
            },
          ],
          1000
        )
      ).toThrow(/exceeds negotiated assetBatchMaxBytes/);
    });
  });

  describe('totalDecodedBytesInAssetFlow', () => {
    test('sums stream chunks only (uses same length estimate as batching)', () => {
      const b64 = Buffer.from('hello').toString('base64');
      const n = totalDecodedBytesInAssetFlow([
        { action: 'start', assetID: 'a', data: {} as any },
        { action: 'stream', encoding: 'base64' as const, data: b64 },
      ]);
      expect(n).toBe(Math.floor((b64.length * 3) / 4));
    });
  });
});
