import { validateUploadBody as validateAdminUploadBody } from '../admin/upload';
import { validateUploadBody as validateContentApiUploadBody } from '../content-api/upload';

/**
 * The focal point is stored as a percentage of the image, so 0–100 is the whole
 * valid range. The admin panel clamps to it before submitting, which means these
 * bounds are the only thing standing between a hand-rolled request and an
 * out-of-range value reaching the database.
 */
describe.each([
  ['admin', validateAdminUploadBody],
  ['content-api', validateContentApiUploadBody],
])('%s upload validation — focal point bounds', (_name, validateUploadBody) => {
  const withFocalPoint = (focalPoint: unknown) => ({ fileInfo: { focalPoint } });

  it('accepts both ends of the range', async () => {
    await expect(validateUploadBody(withFocalPoint({ x: 0, y: 0 }))).resolves.toBeTruthy();
    await expect(validateUploadBody(withFocalPoint({ x: 100, y: 100 }))).resolves.toBeTruthy();
  });

  it('rejects a value past the far edge', async () => {
    await expect(validateUploadBody(withFocalPoint({ x: 50, y: 101 }))).rejects.toThrow();
    await expect(validateUploadBody(withFocalPoint({ x: 101, y: 50 }))).rejects.toThrow();
  });

  it('rejects a negative value', async () => {
    await expect(validateUploadBody(withFocalPoint({ x: -1, y: 50 }))).rejects.toThrow();
    await expect(validateUploadBody(withFocalPoint({ x: 50, y: -1 }))).rejects.toThrow();
  });

  it('requires both axes once a focal point is given', async () => {
    await expect(validateUploadBody(withFocalPoint({ x: 50 }))).rejects.toThrow();
    await expect(validateUploadBody(withFocalPoint({ y: 50 }))).rejects.toThrow();
  });

  it('accepts no focal point at all', async () => {
    await expect(validateUploadBody(withFocalPoint(null))).resolves.toBeTruthy();
    await expect(validateUploadBody({ fileInfo: {} })).resolves.toBeTruthy();
  });
});
