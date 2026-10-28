import { getPreviewUrlStatus } from '../getPreviewUrlStatus';

describe('getPreviewUrlStatus', () => {
  it('should map the modified status to draft', () => {
    expect(getPreviewUrlStatus('modified')).toBe('draft');
  });

  it.each(['draft', 'published'])('should keep the %s status', (status) => {
    expect(getPreviewUrlStatus(status)).toBe(status);
  });

  it('should return undefined when the status is missing or unknown', () => {
    expect(getPreviewUrlStatus(undefined)).toBeUndefined();
    expect(getPreviewUrlStatus('foo')).toBeUndefined();
  });
});
