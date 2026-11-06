import type { Core, Struct } from '@strapi/types';

/** The parts of a GraphQL AST node the walk reads */
interface SelectionNode {
  kind: string;
  name?: { value: string };
  selectionSet?: { selections: readonly SelectionNode[] };
  typeCondition?: { name: { value: string } };
}

interface SelectionInfo {
  fieldNodes?: readonly SelectionNode[];
  fragments?: Record<string, SelectionNode>;
}

type Populate = Record<string, unknown>;

const FILE_UID = 'plugin::upload.file';
const CONNECTION_SUFFIX = '_connection';

/**
 * The relations, media, components and dynamic zones the selection set of a resolver's field reads,
 * at every depth, as the populate REST would send for them (`{ tags: { populate: { … } } }`), so a
 * mutation can have the drafts gate judge them before it writes, as REST judges its `populate`
 *. Only what is selected is in it; arguments of nested fields (their `filters`) are
 * judged by their own resolvers. A polymorphic relation is left out: its resolver refuses it.
 */
export const selectionPopulate = (
  strapi: Core.Strapi,
  contentType: Struct.Schema,
  info: SelectionInfo | undefined
): Populate => {
  const fragments = info?.fragments ?? {};

  /**
   * The fields of a selection set, with its fragments spread in: all of them, or those that apply
   * to one type (a dynamic zone's component, by its GraphQL type name)
   */
  const fieldsOf = (
    selections: readonly SelectionNode[] | undefined,
    typeName?: string
  ): SelectionNode[] =>
    (selections ?? []).flatMap((selection) => {
      if (selection.kind === 'Field') {
        return [selection];
      }

      const fragment =
        selection.kind === 'FragmentSpread' && selection.name
          ? fragments[selection.name.value]
          : selection;

      if (selection.kind !== 'InlineFragment' && selection.kind !== 'FragmentSpread') {
        return [];
      }

      const condition = fragment?.typeCondition?.name.value;

      if (typeName !== undefined && condition !== undefined && condition !== typeName) {
        return [];
      }

      return fieldsOf(fragment?.selectionSet?.selections, typeName);
    });

  const componentTypeName = (component: Struct.Schema): string | undefined => {
    try {
      return strapi.plugin('graphql').service('utils').naming.getComponentName(component);
    } catch {
      return undefined;
    }
  };

  const walk = (model: Struct.Schema | undefined, selections: readonly SelectionNode[]) => {
    const populate: Populate = {};

    if (model === undefined) {
      return populate;
    }

    for (const field of fieldsOf(selections)) {
      let name = field.name?.value ?? '';
      let below = field.selectionSet?.selections ?? [];

      // A to-many relation's `_connection` reads its entries under `nodes`
      if (name.endsWith(CONNECTION_SUFFIX)) {
        name = name.slice(0, -CONNECTION_SUFFIX.length);
        below = fieldsOf(below)
          .filter((node) => node.name?.value === 'nodes')
          .flatMap((node) => node.selectionSet?.selections ?? []);
      }

      const attribute = (model.attributes ?? {})[name] as Record<string, any> | undefined;

      if (attribute === undefined) {
        continue;
      }

      let node: Populate | undefined;

      if (attribute.type === 'relation') {
        if (typeof attribute.target !== 'string' || attribute.relation?.startsWith('morph')) {
          continue;
        }

        node = walk(strapi.getModel(attribute.target as never), below);
      } else if (attribute.type === 'media') {
        node = walk(strapi.getModel(FILE_UID as never), below);
      } else if (attribute.type === 'component') {
        node = walk(strapi.getModel(attribute.component as never), below);
      } else if (attribute.type === 'dynamiczone') {
        const on: Populate = {};

        for (const uid of (attribute.components ?? []) as string[]) {
          const component = strapi.getModel(uid as never) as Struct.Schema | undefined;
          const typeName = component ? componentTypeName(component) : undefined;

          if (component === undefined || typeName === undefined) {
            continue;
          }

          const inner = walk(component, fieldsOf(below, typeName));

          if (Object.keys(inner).length > 0) {
            on[uid] = { populate: inner };
          }
        }

        populate[name] = Object.keys(on).length > 0 ? { on } : true;
        continue;
      } else {
        continue;
      }

      populate[name] = Object.keys(node).length > 0 ? { populate: node } : true;
    }

    return populate;
  };

  return walk(contentType, info?.fieldNodes?.[0]?.selectionSet?.selections ?? []);
};
