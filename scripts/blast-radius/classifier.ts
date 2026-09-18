import type { Radius } from './types';

export function classify(input: {
  affectedProjects: readonly string[];
  totalProjects: number;
  globalMatches: ReadonlyArray<{ category: string; path: string }>;
  allPathsRecognizedNonRuntime: boolean;
}): { radius: Radius; reasons: string[] } {
  const count = input.affectedProjects.length;
  if (input.globalMatches.length)
    return {
      radius: 'REPOSITORY',
      reasons: input.globalMatches
        .map(
          ({ category, path }) =>
            `Repository-global category ${JSON.stringify(category)} matched ${JSON.stringify(path)}.`
        )
        .sort(),
    };
  if (input.totalProjects <= 0) throw new Error('Workspace project count must be positive.');
  if (count / input.totalProjects >= 0.5)
    return {
      radius: 'REPOSITORY',
      reasons: [
        `${count} of ${input.totalProjects} workspace projects are affected, meeting the repository threshold of at least half.`,
      ],
    };
  if (count === 0 && input.allPathsRecognizedNonRuntime)
    return { radius: 'NON_RUNTIME', reasons: ['All changed paths are recognized non-runtime.'] };
  if (count === 1)
    return {
      radius: 'SINGLE_PACKAGE',
      reasons: [`1 of ${input.totalProjects} workspace projects is affected.`],
    };
  if (count <= 5)
    return {
      radius: 'MULTI_PACKAGE',
      reasons: [`${count} of ${input.totalProjects} workspace projects are affected.`],
    };
  return {
    radius: 'WIDE',
    reasons: [`${count} of ${input.totalProjects} workspace projects are affected.`],
  };
}
