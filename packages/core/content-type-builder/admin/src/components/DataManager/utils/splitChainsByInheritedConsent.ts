import type { RenameChain } from './groupRenameChains';
import type { RenameHop } from '../../../types';

export interface SplitChains {
  /** Chains that join a chain the user already accepted: kept without a prompt. */
  keep: RenameChain[];
  /** Chains touching a name the user already declined: dropped without a prompt. */
  decline: RenameChain[];
  /** Chains with no prior decision: the user has to be asked. */
  prompt: RenameChain[];
}

const hopsOf = (chain: RenameChain, renames: RenameHop[]): RenameHop[] =>
  chain.hopIndexes.map((index) => renames[index]);

/**
 * Buckets incoming rename chains (e.g. declared by the AI chat) by the consent
 * the user already gave for the hops recorded on the type, using the same rules
 * as the per-edit prompt (see `resolveAfterEditRenameConsent`): a chain that
 * continues a recorded hop or swaps into a name one vacated is kept, a chain
 * touching a declined name is declined, anything else needs a prompt.
 */
export const splitChainsByInheritedConsent = ({
  recorded,
  declinedRenameNames,
  chains,
  renames,
}: {
  recorded: RenameHop[];
  declinedRenameNames: string[];
  chains: RenameChain[];
  /** The ordered hops the chains index into. */
  renames: RenameHop[];
}): SplitChains => {
  const declined = new Set(declinedRenameNames);
  const result: SplitChains = { keep: [], decline: [], prompt: [] };

  chains.forEach((chain) => {
    const hops = hopsOf(chain, renames);

    const joinsAcceptedChain = hops.some((hop) =>
      recorded.some((known) => known.newName === hop.oldName || known.oldName === hop.newName)
    );
    if (joinsAcceptedChain) {
      result.keep.push(chain);
      return;
    }

    const touchesDeclinedName = hops.some(
      (hop) => declined.has(hop.oldName) || declined.has(hop.newName)
    );
    if (touchesDeclinedName) {
      result.decline.push(chain);
      return;
    }

    result.prompt.push(chain);
  });

  return result;
};

/** Every attribute name a set of chains touches, deduplicated, in hop order. */
export const namesOfChains = (chains: RenameChain[], renames: RenameHop[]): string[] => {
  const names = new Set<string>();
  chains.forEach((chain) => {
    hopsOf(chain, renames).forEach((hop) => {
      names.add(hop.oldName);
      names.add(hop.newName);
    });
  });
  return [...names];
};
