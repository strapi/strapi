import { getDirs } from '../get-dirs';

describe('getDirs', () => {
  it('exposes content structure for both the app source and dist runtime directories', () => {
    const dirs = getDirs(
      { appDir: '/app', distDir: '/dist' } as never,
      { server: { dirs: { public: 'public' } } } as never
    );

    expect(dirs.app.contentStructure).toBe('/app/src/content-structure');
    expect(dirs.dist.contentStructure).toBe('/dist/src/content-structure');
  });
});
