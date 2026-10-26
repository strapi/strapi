import { describe, expect, it } from 'vitest';

import { toDigitalSourceType } from '../iptc';

describe('toDigitalSourceType', () => {
  it('maps AI sources to the IPTC terms', () => {
    expect(toDigitalSourceType('ai-generated')).toBe(
      'http://cv.iptc.org/newscodes/digitalsourcetype/trainedAlgorithmicMedia'
    );
    expect(toDigitalSourceType('ai-assisted')).toBe(
      'http://cv.iptc.org/newscodes/digitalsourcetype/compositeWithTrainedAlgorithmicMedia'
    );
  });

  it('has no term for unknown or automated content', () => {
    expect(toDigitalSourceType('unattributed')).toBeNull();
    expect(toDigitalSourceType('automated')).toBeNull();
  });
});
