import type { Source } from './types';

const VOCABULARY = 'http://cv.iptc.org/newscodes/digitalsourcetype/';

const TERMS: Record<Source, string | null> = {
  'ai-generated': 'trainedAlgorithmicMedia',
  'ai-assisted': 'compositeWithTrainedAlgorithmicMedia',
  'human-entered': 'digitalCreation',
  // No IPTC term says "copied from another system" or "unknown"
  automated: null,
  unattributed: null,
};

/**
 * The IPTC Digital Source Type of a source, as the URI the vocabulary defines, or `null`
 * when no term fits.
 */
export const toDigitalSourceType = (source: Source) => {
  const term = TERMS[source];

  return term === null ? null : `${VOCABULARY}${term}`;
};
