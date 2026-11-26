import {
  findUnpinnedStrapiDependencies,
  getStrapiPinTargetVersion,
  isPinnedSemVer,
  pinStrapiDependencies,
} from '../strapi-dependencies';
import { semVerFactory } from '../../version';

describe('strapi-dependencies', () => {
  describe('isPinnedSemVer', () => {
    it('accepts literal semver pins', () => {
      expect(isPinnedSemVer('4.26.1')).toBe(true);
      expect(isPinnedSemVer('5.0.0')).toBe(true);
    });

    it('rejects version ranges', () => {
      expect(isPinnedSemVer('^4.26.1')).toBe(false);
      expect(isPinnedSemVer('~4.26.1')).toBe(false);
      expect(isPinnedSemVer('>=4.26.1 <5.0.0')).toBe(false);
    });
  });

  describe('findUnpinnedStrapiDependencies', () => {
    it('returns scoped @strapi packages that are not pinned', () => {
      const unpinned = findUnpinnedStrapiDependencies(
        {
          '@strapi/strapi': '^4.26.1',
          '@strapi/plugin-users-permissions': '4.26.1',
          lodash: '^4.17.21',
        },
        {
          '@strapi/types': '~4.26.1',
        }
      );

      expect(unpinned).toEqual([
        {
          name: '@strapi/strapi',
          declaredVersion: '^4.26.1',
          section: 'dependencies',
        },
        {
          name: '@strapi/types',
          declaredVersion: '~4.26.1',
          section: 'devDependencies',
        },
      ]);
    });

    it('returns an empty list when every @strapi package is pinned', () => {
      const unpinned = findUnpinnedStrapiDependencies(
        {
          '@strapi/strapi': '4.26.1',
          '@strapi/plugin-users-permissions': '4.26.1',
        },
        {
          '@strapi/types': '4.26.1',
        }
      );

      expect(unpinned).toEqual([]);
    });
  });

  describe('pinStrapiDependencies', () => {
    it('pins only the listed @strapi packages', () => {
      const packageJSON = {
        name: 'test-app',
        version: '0.1.0',
        dependencies: {
          '@strapi/strapi': '^4.26.1',
          '@strapi/plugin-users-permissions': '4.26.1',
        },
        devDependencies: {
          '@strapi/types': '~4.26.1',
        },
      };

      const unpinned = findUnpinnedStrapiDependencies(
        packageJSON.dependencies,
        packageJSON.devDependencies
      );

      const updated = pinStrapiDependencies(packageJSON, '4.26.1', unpinned);

      expect(updated.dependencies).toEqual({
        '@strapi/strapi': '4.26.1',
        '@strapi/plugin-users-permissions': '4.26.1',
      });
      expect(updated.devDependencies).toEqual({
        '@strapi/types': '4.26.1',
      });
    });
  });

  describe('getStrapiPinTargetVersion', () => {
    it('uses the declared floor for ranged @strapi/strapi versions', () => {
      const project = {
        packageJSON: {
          name: 'test-app',
          version: '0.1.0',
          dependencies: {
            '@strapi/strapi': '^4.26.1',
          },
        },
        getInstalledStrapiVersion: () => semVerFactory('4.26.2'),
      } as const;

      expect(getStrapiPinTargetVersion(project).raw).toBe('4.26.1');
    });
  });
});
