import type { RenameHop } from '../../../types';

export interface RenamePair {
  oldName: string;
  newName: string;
}

/**
 * A group of rename hops on one type that share attribute names, transitively:
 * `a -> b`, `b -> c` is one chain, so is the swap `a -> tmp`, `b -> a`,
 * `tmp -> b`, while `a -> b` and `x -> y` are two chains. Consent to preserve
 * data is given per chain, never per hop, because replaying a partial chain
 * either fails or silently skips hops whose target column still exists.
 */
export interface RenameChain {
  /** `${uid}:chain:${firstHopIndex}` — stable key for consent decisions. */
  id: string;
  /** Indexes into the type's ordered `renames[]`, ascending. */
  hopIndexes: number[];
  /** Net effect after replaying the chain's hops, in first-appearance order. */
  pairs: RenamePair[];
  /** Names that only ever appear as intermediates (e.g. `tmp`). */
  via: string[];
}

const findRoot = (parent: Map<string, string>, name: string): string => {
  let current = name;
  while (parent.get(current) !== current) {
    current = parent.get(current) as string;
  }
  // Path compression keeps repeated lookups cheap on long chains.
  let node = name;
  while (parent.get(node) !== current) {
    const next = parent.get(node) as string;
    parent.set(node, current);
    node = next;
  }
  return current;
};

const union = (parent: Map<string, string>, a: string, b: string): void => {
  if (!parent.has(a)) {
    parent.set(a, a);
  }
  if (!parent.has(b)) {
    parent.set(b, b);
  }
  const rootA = findRoot(parent, a);
  const rootB = findRoot(parent, b);
  if (rootA !== rootB) {
    parent.set(rootB, rootA);
  }
};

const buildChain = (uid: string, renames: RenameHop[], hopIndexes: number[]): RenameChain => {
  // current name -> original name, seeded lazily: a hop whose `oldName` is not
  // yet tracked starts from an original attribute.
  const originalOf = new Map<string, string>();
  const firstIndexOf = new Map<string, number>();
  const intermediates: string[] = [];

  hopIndexes.forEach((index) => {
    const { oldName, newName } = renames[index];

    if (!originalOf.has(oldName)) {
      originalOf.set(oldName, oldName);
      firstIndexOf.set(oldName, index);
    }

    const original = originalOf.get(oldName) as string;
    originalOf.delete(oldName);
    originalOf.set(newName, original);
    intermediates.push(newName);
  });

  const pairs = [...originalOf.entries()]
    .filter(([current, original]) => current !== original)
    .map(([current, original]) => ({ oldName: original, newName: current }))
    .sort((a, b) => (firstIndexOf.get(a.oldName) ?? 0) - (firstIndexOf.get(b.oldName) ?? 0));

  const finalNames = new Set(originalOf.keys());
  const via = intermediates.filter(
    (name, position) =>
      !finalNames.has(name) && !firstIndexOf.has(name) && intermediates.indexOf(name) === position
  );

  return { id: `${uid}:chain:${hopIndexes[0]}`, hopIndexes, pairs, via };
};

/**
 * Groups a type's ordered `renames[]` into chains (see `RenameChain`). Chains
 * are ordered by their first hop; hops inside a chain keep their index order.
 */
export const groupRenameChains = (uid: string, renames: RenameHop[]): RenameChain[] => {
  const parent = new Map<string, string>();
  renames.forEach((hop) => union(parent, hop.oldName, hop.newName));

  const buckets = new Map<string, number[]>();
  renames.forEach((hop, index) => {
    const root = findRoot(parent, hop.oldName);
    const bucket = buckets.get(root);
    if (bucket) {
      bucket.push(index);
    } else {
      buckets.set(root, [index]);
    }
  });

  return [...buckets.values()]
    .sort((a, b) => a[0] - b[0])
    .map((hopIndexes) => buildChain(uid, renames, hopIndexes));
};

/**
 * Maps every hop index of `renames` to the chain it belongs to.
 */
export const chainByHopIndex = (chains: RenameChain[]): Map<number, RenameChain> => {
  const byIndex = new Map<number, RenameChain>();
  chains.forEach((chain) => chain.hopIndexes.forEach((index) => byIndex.set(index, chain)));
  return byIndex;
};
