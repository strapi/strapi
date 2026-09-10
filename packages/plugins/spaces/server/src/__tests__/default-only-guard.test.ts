import { findDefaultOnlyRule } from '../default-only-guard';

describe('default-only rules', () => {
  it('refuses schema writes outside default but keeps the schema readable', () => {
    expect(findDefaultOnlyRule('/content-type-builder/update-schema', 'POST')?.message).toContain(
      'default workspace'
    );
    expect(
      findDefaultOnlyRule('/content-type-builder/content-types/api::a.a', 'PUT')
    ).toBeDefined();
    expect(findDefaultOnlyRule('/content-type-builder/components/x.y', 'DELETE')).toBeDefined();
    expect(findDefaultOnlyRule('/content-type-builder/schema', 'GET')).toBeUndefined();
    expect(findDefaultOnlyRule('/content-type-builder/reserved-names', 'GET')).toBeUndefined();
  });

  it('refuses publishing a release outside default, and nothing else of releases', () => {
    expect(findDefaultOnlyRule('/content-releases/12/publish', 'POST')).toBeDefined();
    expect(findDefaultOnlyRule('/content-releases/12', 'PUT')).toBeUndefined();
    expect(findDefaultOnlyRule('/content-releases/12/actions', 'POST')).toBeUndefined();
    expect(findDefaultOnlyRule('/content-releases', 'GET')).toBeUndefined();
  });

  it('keeps workspace management in default and the self-service routes open', () => {
    expect(findDefaultOnlyRule('/spaces/all', 'GET')).toBeDefined();
    expect(findDefaultOnlyRule('/spaces/limits', 'GET')).toBeDefined();
    expect(findDefaultOnlyRule('/spaces', 'POST')).toBeDefined();
    expect(findDefaultOnlyRule('/spaces/3', 'DELETE')).toBeDefined();
    expect(findDefaultOnlyRule('/spaces/mine', 'GET')).toBeUndefined();
    expect(findDefaultOnlyRule('/spaces/mine/current', 'PUT')).toBeUndefined();
    expect(findDefaultOnlyRule('/spaces/move', 'POST')).toBeUndefined();
    expect(findDefaultOnlyRule('/spaces/entry-states', 'GET')).toBeUndefined();
    expect(findDefaultOnlyRule('/spaces/releases/3/status', 'GET')).toBeUndefined();
  });

  it('never gates the Content Manager, uploads or the admin settings by workspace', () => {
    expect(findDefaultOnlyRule('/content-manager/content-types', 'GET')).toBeUndefined();
    expect(findDefaultOnlyRule('/upload', 'POST')).toBeUndefined();
    expect(findDefaultOnlyRule('/admin/api-tokens', 'GET')).toBeUndefined();
    expect(findDefaultOnlyRule('/i18n/locales', 'POST')).toBeUndefined();
  });
});
