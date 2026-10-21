import { getUploadSettingsChanges, registerAuditEvents } from '../audit-logs';

const getTransformers = () => {
  const transformers: Record<string, (...args: any[]) => any> = {};

  registerAuditEvents({
    registerEvent(name: string, transform: any) {
      transformers[name] = transform;
    },
  });

  return transformers;
};

const settings = {
  sizeOptimization: true,
  responsiveDimensions: true,
  autoOrientation: false,
  aiMetadata: true,
};

describe('Upload audit events', () => {
  test('registers the upload events', () => {
    expect(Object.keys(getTransformers())).toEqual(['upload-settings.update']);
  });

  test('upload-settings.update has a resource with no id and carries the changes', () => {
    const changes = { sizeOptimization: { before: true, after: false } };

    expect(getTransformers()['upload-settings.update']({ changes })).toEqual({
      resource: { type: 'upload-settings' },
      details: { changes },
    });
  });

  describe('getUploadSettingsChanges', () => {
    test('records each changed option', () => {
      expect(
        getUploadSettingsChanges(settings, {
          ...settings,
          sizeOptimization: false,
          aiMetadata: false,
        })
      ).toEqual({
        sizeOptimization: { before: true, after: false },
        aiMetadata: { before: true, after: false },
      });
    });

    test('returns no changes for identical values', () => {
      expect(getUploadSettingsChanges(settings, { ...settings })).toEqual({});
    });

    test('records an option missing from the new value as null', () => {
      const { autoOrientation, ...withoutAutoOrientation } = settings;

      expect(getUploadSettingsChanges(settings, withoutAutoOrientation)).toEqual({
        autoOrientation: { before: false, after: null },
      });
    });

    test('records every option when nothing was stored', () => {
      expect(getUploadSettingsChanges(null, settings)).toEqual({
        sizeOptimization: { before: null, after: true },
        responsiveDimensions: { before: null, after: true },
        autoOrientation: { before: null, after: false },
        aiMetadata: { before: null, after: true },
      });
    });

    test('ignores keys outside the four options', () => {
      expect(getUploadSettingsChanges(settings, { ...settings, extra: 1 } as any)).toEqual({});
    });
  });
});
