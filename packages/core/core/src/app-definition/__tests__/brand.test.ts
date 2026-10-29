import { APP_DEFINITION, DISK_SOURCE, isAppDefinition, isDiskSource } from '../brand';
import { defineApp } from '../define-app';
import { fromDisk } from '../sources';

describe('app-definition brands', () => {
  describe('isAppDefinition', () => {
    it('detects a defineApp() result', () => {
      expect(isAppDefinition(defineApp({}))).toBe(true);
    });

    it('detects a hand-built branded object', () => {
      expect(isAppDefinition({ [APP_DEFINITION]: true })).toBe(true);
    });

    it.each([null, undefined, 42, 'app', [], {}, { register() {} }])(
      'rejects non-branded value %p',
      (value) => {
        expect(isAppDefinition(value)).toBe(false);
      }
    );

    it('does not treat a disk source as an app definition', () => {
      expect(isAppDefinition(fromDisk('./app'))).toBe(false);
    });
  });

  describe('isDiskSource', () => {
    it('detects a fromDisk() result', () => {
      expect(isDiskSource(fromDisk('./config'))).toBe(true);
    });

    it('detects a hand-built branded object', () => {
      expect(isDiskSource({ [DISK_SOURCE]: true, path: './x' })).toBe(true);
    });

    it.each([null, undefined, 0, 'disk', [], {}])('rejects non-branded value %p', (value) => {
      expect(isDiskSource(value)).toBe(false);
    });

    it('does not treat an app definition as a disk source', () => {
      expect(isDiskSource(defineApp({}))).toBe(false);
    });
  });

  it('uses the global symbol registry for stable brands', () => {
    expect(APP_DEFINITION).toBe(Symbol.for('strapi.appDefinition'));
    expect(DISK_SOURCE).toBe(Symbol.for('strapi.diskSource'));
  });
});
