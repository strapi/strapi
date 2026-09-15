export type Radius = 'NON_RUNTIME' | 'LOCAL' | 'FEATURE' | 'WIDE' | 'REPOSITORY';
export function classify(input: {
  affectedProjects: readonly string[];
  totalProjects: number;
  globalMatches: ReadonlyArray<{ category: string; path: string }>;
  allPathsRecognizedNonRuntime: boolean;
}) {
  const count = input.affectedProjects.length;
  if (input.globalMatches.length)
    return {
      radius: 'REPOSITORY' as Radius,
      reasons: input.globalMatches
        .map(
          ({ category, path }) =>
            `Repository-global category ${JSON.stringify(category)} matched ${JSON.stringify(path)}.`
        )
        .sort(),
    };
  if (count / input.totalProjects >= 0.5)
    return {
      radius: 'REPOSITORY' as Radius,
      reasons: [
        `${count} of ${input.totalProjects} workspace projects are affected, meeting the repository threshold of at least half.`,
      ],
    };
  if (count === 0 && input.allPathsRecognizedNonRuntime)
    return {
      radius: 'NON_RUNTIME' as Radius,
      reasons: [
        'No workspace project is affected and all changed paths are recognized as non-runtime.',
      ],
    };
  if (count === 1)
    return {
      radius: 'LOCAL' as Radius,
      reasons: [`1 of ${input.totalProjects} workspace projects is affected.`],
    };
  if (count <= 5)
    return {
      radius: 'FEATURE' as Radius,
      reasons: [`${count} of ${input.totalProjects} workspace projects are affected.`],
    };
  return {
    radius: 'WIDE' as Radius,
    reasons: [`${count} of ${input.totalProjects} workspace projects are affected.`],
  };
}
