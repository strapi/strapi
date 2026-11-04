import _, { castArray, maxBy } from 'lodash';

import { InvalidRelationError } from '../errors';
import type { ID } from '../types';

interface Link {
  id: ID;
  position?: { before?: ID; after?: ID; start?: true; end?: true };
  order?: number;
  __component?: string;
}

interface OrderedLink extends Link {
  init?: boolean;
  order: number;
}

/**
 * When connecting relations, the order you connect them matters.
 *
 * Example, if you connect the following relations:
 *   { id: 5, position: { before: 1 } }
 *   { id: 1, position: { before: 2 } }
 *   { id: 2, position: { end: true } }
 *
 * Going through the connect array, id 5 has to be connected before id 1,
 * so the order of id5 = id1 - 1. But the order value of id 1 is unknown.
 * The only way to know the order of id 1 is to connect it first.
 *
 * This function makes sure the relations are connected in the right order:
 *   { id: 2, position: { end: true } }
 *   { id: 1, position: { before: 2 } }
 *   { id: 5, position: { before: 1 } }
 *
 */
const sortConnectArray = (connectArr: Link[], initialArr: Link[] = [], strictSort = true) => {
  const sortedConnect: Link[] = [];
  // Boolean to know if we have to recalculate the order of the relations
  let needsSorting = false;
  // Map to validate if relation is already in sortedConnect or DB.
  const relationInInitialArray: Record<ID, boolean> = {};
  initialArr.forEach((rel) => {
    relationInInitialArray[rel.id] = true;
  });
  // Map to store the first index where a relation id is connected
  // Mutated in place: spreading the accumulator on every item is O(n^2)
  const mappedRelations = connectArr.reduce(
    (mapper, relation: Link) => {
      const adjacentRelId = relation.position?.before || relation.position?.after;

      if (!adjacentRelId || (!relationInInitialArray[adjacentRelId] && !mapper[adjacentRelId])) {
        needsSorting = true;
      }

      /**
       * We do not allow duplicate relations to be connected, so we need to check for uniqueness with components
       * Note that the id here includes the uid for polymorphic relations
       *
       * So for normal relations, the same id means the same relation
       * For component relations, it means the unique combo of (id, component name)
       */

      // Check if there's an existing relation with this id
      const existingRelation = mapper[relation.id];

      // Check if existing relation has a component or not
      const hasNoComponent = existingRelation && !('__component' in existingRelation);

      // Check if the existing relation has the same component as the new relation
      const hasSameComponent =
        existingRelation && existingRelation.__component === relation.__component;

      // If we have an existing relation that is not unique (no component or same component) we won't accept it
      if (existingRelation && (hasNoComponent || hasSameComponent)) {
        throw new InvalidRelationError(
          `The relation with id ${relation.id} is already connected. ` +
            'You cannot connect the same relation twice.'
        );
      }

      // The first occurrence of an id wins
      if (!existingRelation) {
        mapper[relation.id] = { ...relation, computed: false };
      }

      return mapper;
    },
    {} as Record<ID, Link & { computed: boolean }>
  );

  // If we don't need to sort the connect array, we can return it as is
  if (!needsSorting) return connectArr;

  // Compute in which order the relation should be connected. Walks the chain of adjacent
  // relations iteratively: a recursive walk overflows the stack on long before/after chains.
  const computeRelation = (startRelation: Link) => {
    // Relations of the current branch, waiting for their adjacent relation to be connected first
    const branch: Link[] = [];
    const relationsSeenInBranch: Record<ID, boolean> = {};
    let relation = startRelation;

    for (;;) {
      const adjacentRelId = relation.position?.before || relation.position?.after;

      // If the relation has already been seen in the current branch,
      // it means there is a circular reference
      if (adjacentRelId && relationsSeenInBranch[adjacentRelId]) {
        throw new InvalidRelationError(
          'A circular reference was found in the connect array. ' +
            'One relation is trying to connect before/after another one that is trying to connect before/after it'
        );
      }

      // This relation has already been computed
      if (mappedRelations[relation.id]?.computed) {
        break;
      }

      mappedRelations[relation.id].computed = true;

      // Relation does not have a before or after attribute or is in the initial array
      if (!adjacentRelId || relationInInitialArray[adjacentRelId]) {
        sortedConnect.push(relation);
        break;
      }

      // Look if id is referenced elsewhere in the array
      if (mappedRelations[adjacentRelId]) {
        relationsSeenInBranch[relation.id] = true;
        branch.push(relation);
        relation = mappedRelations[adjacentRelId];
      } else if (strictSort) {
        // If we reach this point, it means that the adjacent relation is not in the connect array
        // and it is not in the database.
        throw new InvalidRelationError(
          `There was a problem connecting relation with id ${
            relation.id
          } at position ${JSON.stringify(
            relation.position
          )}. The relation with id ${adjacentRelId} needs to be connected first.`
        );
      } else {
        // We are in non-strict mode so we can push the relation.
        sortedConnect.push({ id: relation.id, position: { end: true } });
        break;
      }
    }

    // Each relation of the branch is connected after its adjacent relation
    for (let i = branch.length - 1; i >= 0; i -= 1) {
      sortedConnect.push(branch[i]);
    }
  };

  // Iterate over connectArr and populate sortedConnect
  connectArr.forEach((relation) => computeRelation(relation));

  return sortedConnect;
};

/**
 * Responsible for calculating the relations order when connecting them.
 *
 * The connect method takes an array of relations with positional attributes:
 * - before: the id of the relation to connect before
 * - after: the id of the relation to connect after
 * - end: it should be at the end
 * - start: it should be at the start
 *
 * Example:
 *  - Having a connect array like:
 *      [ { id: 4, before: 2 }, { id: 4, before: 3}, {id: 5, before: 4} ]
 * - With the initial relations:
 *      [ { id: 2, order: 4 }, { id: 3, order: 10 } ]
 * - Step by step, going through the connect array, the array of relations would be:
 *      [ { id: 4, order: 3.5 }, { id: 2, order: 4 }, { id: 3, order: 10 } ]
 *      [ { id: 2, order: 4 }, { id: 4, order: 3.5 }, { id: 3, order: 10 } ]
 *      [ { id: 2, order: 4 }, { id: 5, order: 3.5 },  { id: 4, order: 3.5 }, { id: 3, order: 10 } ]
 * - The final step would be to recalculate fractional order values.
 *      [ { id: 2, order: 4 }, { id: 5, order: 3.33 },  { id: 4, order: 3.66 }, { id: 3, order: 10 } ]
 *
 * `initArr` is not the full relation list. For an ordered connect, `updateRelations` loads only
 * the rows named as anchors by the payload plus the lowest- and highest-ordered rows, so entries
 * that are adjacent in `computedRelations` are not adjacent in the stored list. Placement must be
 * computed from the anchor's own order, never from its neighbours in this array.
 *
 * @param {Array<*>} initArr - array of relations to initialize the class with
 * @param {string} idColumn - the column name of the id
 * @param {string} orderColumn - the column name of the order
 * @param {boolean} strict - if true, will throw an error if a relation is connected adjacent to
 *                               another one that does not exist
 * @return {*}
 */
const relationsOrderer = <TRelation extends Record<string, ID | number | null>>(
  initArr: TRelation[],
  idColumn: keyof TRelation,
  orderColumn: keyof TRelation,
  strict?: boolean
) => {
  const initialRelations: OrderedLink[] = _.sortBy(
    castArray(initArr ?? []).map((r) => ({
      init: true,
      id: r[idColumn] as ID,
      order: r[orderColumn] !== null && r[orderColumn] !== undefined ? Number(r[orderColumn]) : 1,
    })),
    'order'
  );

  const maxOrder = maxBy(initialRelations, 'order')?.order || 0;

  // The relations are kept in a doubly linked list indexed by id, so that finding, removing and
  // inserting a relation next to another one does not scan or shift an array: an array made
  // connecting n positioned relations O(n^2).
  interface RelationNode {
    relation: OrderedLink;
    prev: RelationNode | null;
    next: RelationNode | null;
  }

  let head: RelationNode | null = null;
  let tail: RelationNode | null = null;
  let size = 0;
  const nodesById = new Map<ID, RelationNode[]>();

  const linkNode = (relation: OrderedLink, before: RelationNode | null) => {
    const node: RelationNode = { relation, prev: null, next: before };

    if (before) {
      node.prev = before.prev;
      before.prev = node;
    } else {
      node.prev = tail;
      tail = node;
    }

    if (node.prev) {
      node.prev.next = node;
    } else {
      head = node;
    }

    size += 1;

    const nodes = nodesById.get(relation.id);
    if (nodes) {
      nodes.push(node);
    } else {
      nodesById.set(relation.id, [node]);
    }
  };

  const unlinkNode = (node: RelationNode) => {
    if (node.prev) {
      node.prev.next = node.next;
    } else {
      head = node.next;
    }

    if (node.next) {
      node.next.prev = node.prev;
    } else {
      tail = node.prev;
    }

    size -= 1;

    const nodes = nodesById.get(node.relation.id)!;
    nodes.splice(nodes.indexOf(node), 1);
    if (nodes.length === 0) {
      nodesById.delete(node.relation.id);
    }
  };

  // The first node holding this id, in list order
  const findNode = (id: ID): RelationNode | undefined => {
    const nodes = nodesById.get(id);

    if (!nodes || nodes.length <= 1) {
      return nodes?.[0];
    }

    // Only reached when the same id is in the list more than once
    for (let node = head; node; node = node.next) {
      if (node.relation.id === id) {
        return node;
      }
    }

    return undefined;
  };

  const toArray = () => {
    const relations: OrderedLink[] = new Array(size);
    let idx = 0;
    for (let node = head; node; node = node.next) {
      relations[idx] = node.relation;
      idx += 1;
    }
    return relations;
  };

  initialRelations.forEach((relation) => linkNode(relation, null));

  const removeRelation = (r: Link) => {
    const node = findNode(r.id);
    if (node) {
      unlinkNode(node);
    }
  };

  const insertRelation = (r: Link) => {
    // The node the relation is inserted before, null to insert it at the end
    let beforeNode: RelationNode | null;

    if (r.position?.before) {
      const node = findNode(r.position.before);
      if (!node) {
        throw new Error(`Relation ${r.position.before} is not connected`);
      }

      const { relation } = node;
      if (relation.init) {
        r.order = relation.order - 0.5;
      } else {
        r.order = relation.order;
      }
      beforeNode = node;
    } else if (r.position?.after) {
      const node = findNode(r.position.after);
      if (!node) {
        throw new Error(`Relation ${r.position.after} is not connected`);
      }

      const { relation } = node;
      if (relation.init) {
        r.order = relation.order + 0.5;
      } else {
        r.order = relation.order;
      }
      beforeNode = node.next;
    } else if (r.position?.start) {
      if (head) {
        const firstRelation = head.relation;
        r.order = firstRelation.init ? firstRelation.order - 0.5 : firstRelation.order;
      } else {
        r.order = 0.5;
      }
      beforeNode = head;
    } else {
      r.order = maxOrder + 0.5;
      beforeNode = null;
    }

    linkNode(r as OrderedLink, beforeNode);
  };

  return {
    disconnect(relations: Link | Link[]) {
      castArray(relations).forEach((relation) => {
        removeRelation(relation);
      });
      return this;
    },
    connect(relations: Link | Link[]) {
      sortConnectArray(castArray(relations), toArray(), strict).forEach((relation) => {
        this.disconnect(relation);

        try {
          insertRelation(relation);
        } catch {
          throw new Error(
            `There was a problem connecting relation with id ${
              relation.id
            } at position ${JSON.stringify(
              relation.position
            )}. The list of connect relations is not valid`
          );
        }
      });
      return this;
    },
    get() {
      return toArray();
    },
    /**
     * Get a map between the relation id and its order
     */
    getOrderMap() {
      const map: Record<ID, number> = {};
      const chunks = _(toArray()).groupBy('order').value();
      const sortedKeys = Object.keys(chunks).sort((a, b) => parseFloat(a) - parseFloat(b));

      for (const orderStr of sortedKeys) {
        const relations = chunks[orderStr];
        let offset = 1;
        relations.forEach((relation) => {
          if (!relation.init) {
            map[relation.id] = parseFloat(orderStr) + (offset / (relations.length + 1)) * 0.49;
            offset += 1;
          }
        });
      }

      return map;
    },
  };
};

export { relationsOrderer, sortConnectArray };
