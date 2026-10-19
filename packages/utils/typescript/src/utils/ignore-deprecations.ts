import * as ts from 'typescript';

/**
 * Compiler options to merge into a user project's options before Strapi compiles it.
 *
 * Apps generated before TS 6 have `"moduleResolution": "Node"` (node10) in their root tsconfig.
 * TS 6 reports it as error TS5107, which skips the emit under `noEmitOnError` and fails
 * `strapi build` / `strapi develop`. A user-set `ignoreDeprecations` always wins.
 *
 * Only applies on TS 6.x: older versions reject '6.0' (TS5103).
 */
// TODO @Nico remove once TS 7 drops node10; ship an upgrade codemod first that migrates app
// tsconfigs off `moduleResolution: "Node"`
export const defaultIgnoreDeprecations = (
  options: ts.CompilerOptions,
  tsVersion: string = ts.versionMajorMinor
): Pick<ts.CompilerOptions, 'ignoreDeprecations'> => {
  if (options.ignoreDeprecations !== undefined || tsVersion.startsWith('6.') === false) {
    return {};
  }

  return { ignoreDeprecations: '6.0' };
};
