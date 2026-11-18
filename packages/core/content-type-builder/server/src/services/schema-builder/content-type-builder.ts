import path from 'path';
import _ from 'lodash';

import { strings, errors } from '@strapi/utils';
import type { Schema, Internal } from '@strapi/types';
import { isRelation, isConfigurable } from '../../utils/attributes';
import { typeKinds } from '../constants';
import createSchemaHandler from './schema-handler';
import { CreateContentTypeInput } from '../../controllers/validation/content-type';
import type { InternalRelationAttribute, InternalAttribute } from './types';

const { ApplicationError } = errors;

const reuseUnsetPreviousProperties = (
  newAttribute: Schema.Attribute.AnyAttribute,
  oldAttribute: Schema.Attribute.AnyAttribute
) => {
  _.defaults(
    newAttribute,
    _.omit(oldAttribute, [
      'configurable',
      'required',
      'private',
      'unique',
      'pluginOptions',
      'inversedBy',
      'mappedBy',
      'conditions', // Don't automatically preserve conditions
    ])
  );
};

/**
 * Whether `relation`, an attribute of the type being edited after the edit, is a relation to
 * `target` whose other side is `targetAttributeName`: `setRelation` then writes that other
 * side. Only `targetAttribute` counts. A body in the format of the GET response of the
 * single-type route also has the stored `inversedBy`, which names the other side before the
 * edit. A relation that is new in the save and sent in the stored format (`inversedBy`, no
 * `targetAttribute`) is written as it is sent, and does not write its other side.
 */
const namesOtherSide = (
  relation: InternalAttribute | undefined,
  target: string,
  targetAttributeName: string
) => {
  if (relation === undefined || isRelation(relation) === false) {
    return false;
  }

  const { target: relationTarget, targetAttribute } = relation as InternalRelationAttribute;

  return relationTarget === target && targetAttribute === targetAttributeName;
};

/** The name of the other side of a stored relation (`inversedBy` or `mappedBy`), if any. */
const otherSideName = (attribute: Schema.Attribute.AnyAttribute | undefined) => {
  if (attribute === undefined || isRelation(attribute) === false) {
    return undefined;
  }

  const { inversedBy, mappedBy } = attribute as InternalRelationAttribute;

  return inversedBy || mappedBy || undefined;
};

/** The fields of a stored attribute that decide which pair it belongs to. */
const pairFields = (attribute: Schema.Attribute.AnyAttribute | undefined) =>
  attribute === undefined
    ? undefined
    : _.pick(attribute, ['type', 'relation', 'target', 'inversedBy', 'mappedBy']);

/**
 * Whether `targetAttribute`, the attribute named by `inversedBy` or `mappedBy` on the
 * target of the relation `key` of `uid`, is the other side of that relation. Same rule as
 * the database boot check:
 * - an inverse side (`mappedBy`) is paired with the owner that points back to it: a
 *   relation to `uid` with `inversedBy: key`. The `mappedBy` name alone does not pair them.
 * - an owner (`inversedBy`) is paired with the inverse side it names: a relation to `uid`
 *   with `mappedBy` (the database does not read that name). A relation with no `mappedBy`
 *   is not paired with it: a one-way relation, or the owner of another pair. If an earlier
 *   step of the same save made it the owner of this pair, it has `inversedBy: key`.
 */
const isOtherSide = ({
  key,
  uid,
  attribute,
  targetAttribute,
}: {
  key: string;
  uid: string;
  attribute: InternalRelationAttribute;
  targetAttribute: Schema.Attribute.AnyAttribute;
}) => {
  if (isRelation(targetAttribute) === false) {
    return false;
  }

  const counterpart = targetAttribute as InternalRelationAttribute;

  if (counterpart.target !== uid) {
    return false;
  }

  if (attribute.inversedBy === undefined || attribute.inversedBy === null) {
    return counterpart.inversedBy === key;
  }

  return (
    (counterpart.mappedBy !== undefined && counterpart.mappedBy !== null) ||
    counterpart.inversedBy === key
  );
};

/**
 * Reads a relation sent in the stored format (`inversedBy` or `mappedBy`, no `targetAttribute`)
 * as the admin sends it (`targetAttribute`), so that the edit compares and rebuilds its other
 * side. `convertAttribute` then writes `inversedBy` or `mappedBy` for the relation kind, and
 * `dominant` keeps the stored side of a oneToOne or manyToMany relation when the attribute had
 * no other side before the save (a one-way relation made two-way).
 */
const toTargetAttributeFormat = (attribute: InternalAttribute): InternalAttribute => {
  if (isRelation(attribute) === false) {
    return attribute;
  }

  const { inversedBy, mappedBy, ...relation } = attribute as InternalRelationAttribute;

  if (relation.targetAttribute !== undefined) {
    return attribute;
  }

  const targetAttribute = inversedBy || mappedBy;

  if (_.isNil(targetAttribute)) {
    return attribute;
  }

  return {
    ...relation,
    targetAttribute,
    dominant: inversedBy !== undefined && inversedBy !== null && inversedBy !== '',
  };
};

/**
 * The side that a oneToOne or manyToMany relation of the save takes when the edit sees it as new
 * (a new key, or an attribute that becomes a relation), from the state before the save:
 * - the relation itself before the save keeps its side (an earlier step of the save can have
 *   deleted it in the builder);
 * - else its other side before the save keeps the storage when it held it: an owner or a one-way
 *   relation stays the owner, and this relation is its inverse side;
 * - else an inverse side before the save makes this relation the owner.
 * Returns `undefined` when the state before the save does not decide.
 */
const ownsBeforeSave = (
  attribute: InternalRelationAttribute,
  beforeSave: Schema.Attribute.AnyAttribute | undefined,
  counterpartBeforeSave: Schema.Attribute.AnyAttribute | undefined
) => {
  if (
    beforeSave !== undefined &&
    isRelation(beforeSave) &&
    (beforeSave as InternalRelationAttribute).relation === attribute.relation
  ) {
    const { inversedBy, mappedBy } = beforeSave as InternalRelationAttribute;

    if (inversedBy) {
      return true;
    }

    if (mappedBy) {
      return false;
    }
  }

  if (counterpartBeforeSave !== undefined && isRelation(counterpartBeforeSave)) {
    return Boolean((counterpartBeforeSave as InternalRelationAttribute).mappedBy);
  }

  return undefined;
};

/**
 * Maps each attribute name produced by this save's rename hops to the name it
 * had before the save, by folding the hops in order (`a -> tmp, tmp -> b`
 * gives `b -> a`).
 */
const getRenameOrigins = (renames: unknown): Map<string, string> => {
  const originOf = new Map<string, string>();

  if (!Array.isArray(renames)) {
    return originOf;
  }

  for (const { oldName, newName } of renames as { oldName?: string; newName?: string }[]) {
    if (!oldName || !newName || oldName === newName) {
      continue;
    }

    const origin = originOf.get(oldName) ?? oldName;
    originOf.delete(oldName);
    originOf.set(newName, origin);
  }

  return originOf;
};

/** A relation (`key` of `uid`) and the other side that `setRelation` wrote for it. */
type BuiltPair = { uid: string; key: string; target: string; name: string };

export default function createComponentBuilder() {
  return {
    // The pairs that setRelation wrote in this save, checked by assertRelationPairs
    builtPairs: [] as BuiltPair[],

    // The attributes that the save sends for each type it creates or edits
    savedAttributes: new Map<string, Record<string, unknown>>(),

    // The types that the save deletes
    deletedContentTypes: new Set<string>(),

    /**
     * Writes the other side of the relation `key` of `uid` on its target. The other side keeps
     * the options (`required`, `private`, `pluginOptions`, `conditions`) of the attribute it
     * replaces, or of `renamedCounterpart` (the other side under its name before the save) when
     * the save renames it.
     */
    setRelation(
      this: any,
      {
        key,
        uid,
        attribute,
        renamedCounterpart,
      }: {
        key: string;
        uid: string;
        attribute: InternalRelationAttribute;
        renamedCounterpart?: Partial<InternalRelationAttribute>;
      }
    ) {
      if (!_.has(attribute, 'target')) {
        return;
      }

      const targetCT = this.contentTypes.get(attribute.target);

      if (!targetCT) {
        throw new ApplicationError(`Content type ${attribute.target} not found`);
      }

      const targetAttribute = targetCT.getAttribute(attribute.targetAttribute);

      if (!attribute.targetAttribute) {
        return;
      }

      // When generating the inverse relation, preserve existing conditions if they exist
      // If the target attribute already exists and has conditions, preserve them
      const targetAttributeData = targetAttribute || renamedCounterpart || {};

      // If the source doesn't have conditions but the target does, preserve target's conditions

      targetCT.setAttribute(
        attribute.targetAttribute,
        generateRelation({ key, attribute, uid, targetAttribute: targetAttributeData })
      );

      // assertRelationPairs checks this pair against the state that the save leaves
      this.builtPairs.push({ uid, key, target: attribute.target, name: attribute.targetAttribute });
    },

    /**
     * Checks the relation pairs of the save against the state that the save leaves, before any
     * schema file is written. Run once, after the create and edit steps of the save, so that the
     * order of the types in the save does not change the result.
     *
     * For each relation that the save sends with another side (`targetAttribute`), unless the
     * save deletes its type or its target type (the relation is removed with that type):
     * - a later step of the save did not change or remove it (the payloads of two types do not
     *   agree);
     * - the save does not remove its other side when that other side existed before the save.
     *
     * For each of these relations whose other side `setRelation` wrote (a pair that the save
     * does not change is kept as it is, see `editContentType`):
     * - the other side is a relation that points back to the relation (owner and inverse side),
     *   and the save of the target type does not make it another kind of attribute. When two
     *   relations of the save name the same other side, the last one written keeps it, as
     *   before this check;
     * - the other side did not replace an attribute that stores its own data (not a relation,
     *   or a one-way relation), unless the save of the target type removed that attribute or
     *   made it a relation;
     * - no relation that the save keeps is still paired with the attribute that became the
     *   other side.
     *
     * @throws ApplicationError when a pair is not valid
     */
    assertRelationPairs(this: any) {
      const builtPairs = new Set(
        (this.builtPairs as BuiltPair[]).map(({ uid, key }) => `${uid}.${key}`)
      );

      for (const [uid, savedAttributes] of this.savedAttributes as Map<
        string,
        Record<string, unknown>
      >) {
        for (const [key, saved] of Object.entries(savedAttributes)) {
          if (isRelation(saved as Schema.Attribute.AnyAttribute) === false) {
            continue;
          }

          const { target, targetAttribute: name } = saved as InternalRelationAttribute;

          if (name === undefined || name === null) {
            continue;
          }

          const error = (reason: string) =>
            new ApplicationError(
              `Relation ${key} of ${uid} cannot have ${name} of ${target} as its other side: ${reason}`
            );

          // A relation to a type that the save deletes is removed with that type, as before
          if (this.deletedContentTypes.has(uid) || this.deletedContentTypes.has(target)) {
            continue;
          }

          const relation = this.contentTypes.get(uid)?.schema.attributes[key];

          if (otherSideName(relation) !== name || relation.target !== target) {
            throw error(`another type of the save changes or removes ${key} of ${uid}`);
          }

          const targetCT = this.contentTypes.get(target);
          const counterpart = targetCT?.schema.attributes[name] as InternalRelationAttribute;

          if (
            counterpart === undefined &&
            targetCT?.initialSchema?.attributes?.[name] !== undefined
          ) {
            throw error(`the save removes ${name}, and keeps ${key}`);
          }

          if (builtPairs.has(`${uid}.${key}`) === false) {
            continue;
          }

          const isOwner = (relation as InternalRelationAttribute).inversedBy === name;
          const pointsBack =
            counterpart !== undefined &&
            isRelation(counterpart) &&
            counterpart.target === uid &&
            (isOwner ? counterpart.mappedBy === key : counterpart.inversedBy === key);

          if (pointsBack === false) {
            // Two relations of the save name the same other side: the last one written keeps
            // it, as before this check
            const claimant = otherSideName(counterpart);
            const isClaimedBySave =
              claimant !== undefined &&
              counterpart.target === uid &&
              namesOtherSide(
                savedAttributes[claimant] as InternalAttribute | undefined,
                target,
                name
              );

            if (isClaimedBySave === false) {
              throw error(`${name} is not a relation that points back to ${key}`);
            }

            continue;
          }

          const savedCounterpart = this.savedAttributes.get(target)?.[name];

          if (savedCounterpart !== undefined && isRelation(savedCounterpart) === false) {
            throw error(`the save of ${target} makes ${name} a ${savedCounterpart.type} attribute`);
          }

          const beforeSave = targetCT.initialSchema?.attributes?.[name];

          if (beforeSave === undefined) {
            continue;
          }

          // A relation to a type that the save deletes is removed with that type
          if (
            isRelation(beforeSave) &&
            this.deletedContentTypes.has((beforeSave as InternalRelationAttribute).target)
          ) {
            continue;
          }

          const partnerName = otherSideName(beforeSave);

          if (partnerName === undefined) {
            const savedTargetAttributes = this.savedAttributes.get(target);
            const isReplacedBySave =
              savedTargetAttributes !== undefined &&
              (_.has(savedTargetAttributes, name) === false ||
                isRelation(savedTargetAttributes[name]));

            if (isReplacedBySave === false) {
              throw error(`the save would replace ${name}, which stores its own data`);
            }

            continue;
          }

          const partnerUid = beforeSave.target;

          if (partnerUid === uid && partnerName === key) {
            continue;
          }

          // A type that the save deletes keeps no relation
          const partner = this.deletedContentTypes.has(partnerUid)
            ? undefined
            : this.contentTypes.get(partnerUid)?.schema.attributes[partnerName];

          if (otherSideName(partner) === name && partner.target === target) {
            throw error(`${name} is the other side of ${partnerName} of ${partnerUid}`);
          }
        }
      }
    },

    /** The other side of `attribute`, on its target, before the save. */
    counterpartBeforeSave(this: any, attribute: InternalRelationAttribute) {
      if (attribute.targetAttribute === undefined || attribute.targetAttribute === null) {
        return undefined;
      }

      return this.contentTypes.get(attribute.target)?.initialSchema?.attributes?.[
        attribute.targetAttribute
      ];
    },

    /**
     * Deletes the other side of the relation `key` of `uid` from its target.
     * The attribute named by `inversedBy` or `mappedBy` is kept when:
     * - an attribute of `uid` after the edit (`attributes`) names it as its other side, for
     *   example another attribute that takes it over in the same save: `setRelation` then
     *   rebuilds it, and keeps its own options (`private`, `required`, `pluginOptions`,
     *   `conditions`);
     * - it is not the other side of this relation (see `isOtherSide`), for example a
     *   one-way relation, or the owner of another pair.
     */
    unsetRelation(
      this: any,
      {
        key,
        uid,
        attribute,
        attributes,
      }: {
        key: string;
        uid: string;
        attribute: Schema.Attribute.Relation<Schema.Attribute.RelationKind.Any>;
        attributes: Record<string, InternalAttribute>;
      }
    ) {
      if (!('target' in attribute) || !attribute.target) {
        return;
      }

      const targetCT = this.contentTypes.get(attribute.target);

      const relationAttribute = attribute as InternalRelationAttribute;
      const targetAttributeName = relationAttribute.inversedBy || relationAttribute.mappedBy;

      if (targetAttributeName === undefined) {
        return;
      }

      const targetAttribute = targetCT.getAttribute(targetAttributeName);

      if (!targetAttribute) return;

      const isNamedAfterEdit = Object.values(attributes).some((other) =>
        namesOtherSide(other, relationAttribute.target, targetAttributeName)
      );

      if (isNamedAfterEdit === true) {
        return;
      }

      if (isOtherSide({ key, uid, attribute: relationAttribute, targetAttribute }) === false) {
        return;
      }

      return targetCT.deleteAttribute(targetAttributeName);
    },

    createContentTypeAttributes(
      this: any,
      uid: string,
      attributes: CreateContentTypeInput['attributes']
    ) {
      if (!this.contentTypes.has(uid)) {
        throw new ApplicationError('contentType.notFound');
      }

      const contentType = this.contentTypes.get(uid);

      // support self referencing content type relation
      Object.keys(attributes).forEach((key) => {
        const { target } = attributes[key];
        if (target === '__self__') {
          attributes[key].target = uid;
        }
      });

      this.savedAttributes.set(uid, attributes);
      contentType.setAttributes(this.convertAttributes(attributes));

      Object.keys(attributes).forEach((key) => {
        const attribute = attributes[key] as InternalAttribute;

        if (isRelation(attribute)) {
          const relationAttribute = attribute as InternalRelationAttribute;
          if (['manyToMany', 'oneToOne'].includes(relationAttribute.relation)) {
            if (
              relationAttribute.target === uid &&
              relationAttribute.targetAttribute !== undefined
            ) {
              // self referencing relation
              const targetAttribute = attributes[
                relationAttribute.targetAttribute
              ] as InternalRelationAttribute;

              if (targetAttribute.dominant === undefined) {
                relationAttribute.dominant = true;
              } else {
                relationAttribute.dominant = false;
              }
            } else {
              relationAttribute.dominant = true;
            }
          }

          this.setRelation({
            key,
            uid,
            attribute: relationAttribute,
          });
        }
      });

      return contentType;
    },

    /**
     * Creates a content type in memory to be written to files later on
     */
    createContentType(this: any, infos: CreateContentTypeInput) {
      // TODO:: check for unique uid / singularName & pluralName & collectionName

      if (infos.uid && infos.uid !== createContentTypeUID(infos)) {
        throw new ApplicationError('contentType.invalidUID');
      }

      const uid = infos.uid ?? createContentTypeUID(infos);

      if (this.contentTypes.has(uid)) {
        throw new ApplicationError('contentType.alreadyExists');
      }

      const dir = infos.plugin
        ? path.join(strapi.dirs.app.extensions, infos.plugin, 'content-types', infos.singularName)
        : path.join(strapi.dirs.app.api, infos.singularName, 'content-types', infos.singularName);

      const contentType = createSchemaHandler({
        uid,
        isNew: true,
        modelName: infos.singularName,
        dir,
        filename: `schema.json`,
      });

      this.contentTypes.set(uid, contentType);

      contentType
        .set('kind', infos.kind || typeKinds.COLLECTION_TYPE)
        .set(
          'collectionName',
          infos.collectionName || strings.nameToCollectionName(infos.pluralName)
        )
        .set('info', {
          singularName: infos.singularName,
          pluralName: infos.pluralName,
          displayName: infos.displayName,
          description: infos.description,
        })
        .set('options', {
          ...infos.options,
          draftAndPublish: infos.draftAndPublish ?? infos.options?.draftAndPublish,
        })
        .set('pluginOptions', infos.pluginOptions)
        .set('config', infos.config);

      this.createContentTypeAttributes(uid, infos.attributes);

      return contentType;
    },

    editContentType(this: any, infos: any) {
      const { uid } = infos;

      if (!this.contentTypes.has(uid)) {
        throw new ApplicationError('contentType.notFound');
      }

      const contentType = this.contentTypes.get(uid);

      const oldAttributes = contentType.schema.attributes;

      const renameOrigins = getRenameOrigins(infos.renames);
      const renamedTo = new Map(
        Array.from(renameOrigins, ([newName, origin]) => [origin, newName] as const)
      );

      // Only the attributes that exist before the save: a new relation in the stored format
      // keeps its stored side, as before
      const normalizedAttributes = _.mapValues(
        infos.attributes as Record<string, InternalAttribute>,
        (attribute, key) =>
          _.has(oldAttributes, key) ? toTargetAttributeFormat(attribute) : attribute
      );

      // A save that renames one side of a self relation (the rename:field command) can send
      // the other side with the old name: read it as the new name, unless the save adds an
      // attribute under the old name
      const attributes: typeof infos.attributes = _.mapValues(
        normalizedAttributes,
        (attribute): InternalAttribute => {
          if (isRelation(attribute) === false) {
            return attribute;
          }

          const { target, targetAttribute } = attribute as InternalRelationAttribute;
          const newName =
            typeof targetAttribute === 'string' ? renamedTo.get(targetAttribute) : undefined;

          if (
            target !== uid ||
            newName === undefined ||
            _.has(normalizedAttributes, targetAttribute as string)
          ) {
            return attribute;
          }

          return { ...attribute, targetAttribute: newName } as InternalAttribute;
        }
      );

      this.savedAttributes.set(uid, attributes);

      const newAttributes = _.omitBy(attributes, (attr, key) => {
        return _.has(oldAttributes, key) && !isConfigurable(oldAttributes[key]);
      });

      // The attributes of the type after the edit: `setAttributes` keeps the attributes that
      // are not configurable
      const attributesAfterEdit = {
        ..._.mapValues(
          _.pickBy(oldAttributes, (attribute) => !isConfigurable(attribute)),
          toTargetAttributeFormat
        ),
        ...newAttributes,
      };

      // The other sides that more than one relation of the edit names: these keep the default
      // owner and inverse sides, as before (see ownsBeforeSave)
      const claimCounts = _.countBy(
        (Object.values(newAttributes) as InternalAttribute[])
          .filter((attribute) => isRelation(attribute))
          .map((attribute) => attribute as InternalRelationAttribute)
          .filter(({ targetAttribute }) => !_.isNil(targetAttribute)),
        ({ target, targetAttribute }) => `${target}.${targetAttribute}`
      );
      const counterpartBeforeSave = (attribute: InternalRelationAttribute) =>
        claimCounts[`${attribute.target}.${attribute.targetAttribute}`] === 1
          ? this.counterpartBeforeSave(attribute)
          : undefined;

      const newKeys = _.difference(Object.keys(newAttributes), Object.keys(oldAttributes));
      const deletedKeys = _.difference(Object.keys(oldAttributes), Object.keys(newAttributes));
      const remainingKeys = _.intersection(Object.keys(oldAttributes), Object.keys(newAttributes));

      // remove old relations
      deletedKeys.forEach((key) => {
        const attribute = oldAttributes[key];

        // if the old relation has a target attribute. we need to remove it in the target type
        if (isConfigurable(attribute) && isRelation(attribute)) {
          const relationAttribute = attribute as InternalRelationAttribute;
          const targetAttributeName = relationAttribute.inversedBy || relationAttribute.mappedBy;

          if (targetAttributeName !== null && targetAttributeName !== undefined) {
            this.unsetRelation({ key, uid, attribute, attributes: attributesAfterEdit });
          }
        }
      });

      remainingKeys.forEach((key) => {
        const oldAttribute = oldAttributes[key];
        const newAttribute = newAttributes[key] as InternalAttribute;

        if (!isRelation(oldAttribute) && isRelation(newAttribute)) {
          const relationAttribute = newAttribute as InternalRelationAttribute;

          // Same owner and inverse side as a new relation (see newKeys below)
          if (['manyToMany', 'oneToOne'].includes(relationAttribute.relation)) {
            const otherSide =
              relationAttribute.target === uid && relationAttribute.targetAttribute !== undefined
                ? (newAttributes[relationAttribute.targetAttribute] as InternalRelationAttribute)
                : undefined;

            relationAttribute.dominant =
              ownsBeforeSave(
                relationAttribute,
                undefined,
                counterpartBeforeSave(relationAttribute)
              ) ??
              (otherSide === undefined || otherSide.dominant === undefined);
          }

          return this.setRelation({
            key,
            uid,
            attribute: relationAttribute,
          });
        }

        if (isRelation(oldAttribute) && !isRelation(newAttribute)) {
          return this.unsetRelation({
            key,
            uid,
            attribute: oldAttribute,
            attributes: attributesAfterEdit,
          });
        }

        if (isRelation(oldAttribute) && isRelation(newAttribute)) {
          const relationAttribute = newAttribute as InternalRelationAttribute;
          const oldRelationAttribute = oldAttribute as InternalRelationAttribute;
          const oldTargetAttributeName =
            oldRelationAttribute.inversedBy || oldRelationAttribute.mappedBy;

          const sameRelation = oldAttribute.relation === relationAttribute.relation;
          const targetAttributeHasChanged =
            oldTargetAttributeName !== relationAttribute.targetAttribute;
          // A retargeted relation keeps no counterpart on its old target, even when the
          // counterpart name is unchanged
          const targetHasChanged = oldRelationAttribute.target !== relationAttribute.target;

          // A save that renames the other side on the same target: the other side keeps its
          // options under its new name. Read it as it was before the save, so that an earlier
          // step of the save that rewrote it does not change the result.
          const oldCounterpart =
            targetAttributeHasChanged && !targetHasChanged && oldTargetAttributeName
              ? this.contentTypes.get(relationAttribute.target)?.initialSchema?.attributes?.[
                  oldTargetAttributeName
                ]
              : undefined;
          const renamedCounterpart =
            oldCounterpart !== undefined &&
            isOtherSide({
              key,
              uid,
              attribute: oldRelationAttribute,
              targetAttribute: oldCounterpart,
            })
              ? (oldCounterpart as InternalRelationAttribute)
              : undefined;

          const attributeBeforeSave = contentType.initialSchema?.attributes?.[key] as
            InternalAttribute | undefined;

          // A pair that the save does not change is not rebuilt: same target, kind and other
          // side as before the save, and the other side as it was before the save. A schema
          // whose other side is not a valid pair (written by hand) stays as it is.
          const otherSide = relationAttribute.targetAttribute;
          const isPairUnchanged =
            attributeBeforeSave !== undefined &&
            isRelation(attributeBeforeSave) &&
            otherSide !== undefined &&
            otherSide !== null &&
            (attributeBeforeSave as InternalRelationAttribute).target ===
              relationAttribute.target &&
            (attributeBeforeSave as InternalRelationAttribute).relation ===
              relationAttribute.relation &&
            otherSideName(attributeBeforeSave) === otherSide &&
            _.isEqual(
              pairFields(this.contentTypes.get(relationAttribute.target)?.getAttribute(otherSide)),
              pairFields(
                this.contentTypes.get(relationAttribute.target)?.initialSchema?.attributes?.[
                  otherSide
                ]
              )
            );

          if (
            isPairUnchanged === false &&
            (!sameRelation || targetAttributeHasChanged || targetHasChanged)
          ) {
            this.unsetRelation({
              key,
              uid,
              attribute: oldAttribute,
              attributes: attributesAfterEdit,
            });
          }

          // An earlier type of this save can have written this attribute already: setRelation
          // of its new target. The other side that this relation had before the save is then
          // still on its old target. For a retargeted inverse side, this deletes its old owner,
          // as when the inverse side is saved first.
          if (
            isPairUnchanged === false &&
            attributeBeforeSave !== undefined &&
            isRelation(attributeBeforeSave) === true &&
            (attributeBeforeSave as InternalRelationAttribute).target !== relationAttribute.target
          ) {
            this.unsetRelation({
              key,
              uid,
              attribute: attributeBeforeSave,
              attributes: attributesAfterEdit,
            });
          }

          // keep extra options that were set manually on oldAttribute
          reuseUnsetPreviousProperties(relationAttribute, oldAttribute);

          // Handle conditions explicitly - only preserve if present and not undefined in new attribute
          const newAttributeFromInfos = newAttributes[key];
          const hasNewConditions =
            newAttributeFromInfos.conditions !== undefined &&
            newAttributeFromInfos.conditions !== null;

          if (oldAttribute.conditions) {
            if (hasNewConditions) {
              // Conditions are still present, keep them
              relationAttribute.conditions = newAttributeFromInfos.conditions;
            } else {
              // Conditions were removed (undefined or null), ensure they're not preserved
              delete relationAttribute.conditions;
            }
          } else if (hasNewConditions) {
            // New conditions added
            relationAttribute.conditions = newAttributeFromInfos.conditions;
          }

          if (oldRelationAttribute.inversedBy) {
            relationAttribute.dominant = true;
          } else if (oldRelationAttribute.mappedBy) {
            relationAttribute.dominant = false;
          } else if (relationAttribute.dominant === undefined) {
            // A one-way relation that gets another side owns the pair, as a new relation does
            relationAttribute.dominant = true;
          }

          if (isPairUnchanged === true) {
            return;
          }

          return this.setRelation({
            key,
            uid,
            attribute: relationAttribute,
            renamedCounterpart,
          });
        }
      });

      // add new relations
      newKeys.forEach((key) => {
        const attribute = newAttributes[key] as InternalAttribute;

        if (isRelation(attribute)) {
          const relationAttribute = attribute as InternalRelationAttribute;
          if (['manyToMany', 'oneToOne'].includes(relationAttribute.relation)) {
            // A renamed relation keeps the ownership of the attribute it was
            // renamed from (same rule as a remaining key), so the join table
            // stays with its owner and the rename migration can carry it.
            const origin = renameOrigins.get(key);
            const originAttribute =
              origin !== undefined && _.has(oldAttributes, origin)
                ? (oldAttributes[origin] as InternalRelationAttribute)
                : undefined;
            const originOwnership =
              originAttribute !== undefined &&
              isRelation(originAttribute) &&
              originAttribute.relation === relationAttribute.relation &&
              originAttribute.target === relationAttribute.target
                ? originAttribute
                : undefined;

            const ownsBefore = ownsBeforeSave(
              relationAttribute,
              contentType.initialSchema?.attributes?.[key],
              counterpartBeforeSave(relationAttribute)
            );

            if (originOwnership?.inversedBy) {
              relationAttribute.dominant = true;
            } else if (originOwnership?.mappedBy) {
              relationAttribute.dominant = false;
            } else if (ownsBefore !== undefined) {
              relationAttribute.dominant = ownsBefore;
            } else if (
              relationAttribute.target === uid &&
              relationAttribute.targetAttribute !== undefined
            ) {
              // self referencing relation
              const targetAttribute = newAttributes[
                relationAttribute.targetAttribute
              ] as InternalRelationAttribute;

              // The opposite of the other side when the save already decided it
              relationAttribute.dominant =
                targetAttribute.dominant === undefined ? true : !targetAttribute.dominant;
            } else {
              relationAttribute.dominant = true;
            }
          }

          this.setRelation({
            key,
            uid,
            attribute: relationAttribute,
          });
        }
      });

      contentType
        .set('kind', infos.kind || contentType.schema.kind)
        .set(['info', 'displayName'], infos.displayName)
        .set(['info', 'description'], infos.description)
        .set('options', {
          // Payloads may omit options keys the CTB does not edit (e.g. populateCreatorFields)
          ...contentType.schema.options,
          ...infos.options,
          // A payload that does not set draftAndPublish keeps the stored value
          draftAndPublish:
            infos.draftAndPublish ??
            infos.options?.draftAndPublish ??
            contentType.schema.options?.draftAndPublish,
        })
        .set('pluginOptions', infos.pluginOptions)
        .setAttributes(this.convertAttributes(newAttributes));

      return contentType;
    },

    deleteContentType(this: any, uid: string) {
      if (!this.contentTypes.has(uid)) {
        throw new ApplicationError('contentType.notFound');
      }

      this.deletedContentTypes.add(uid);

      this.components.forEach((compo: any) => {
        compo.removeContentType(uid);
      });

      this.contentTypes.forEach((ct: any) => {
        ct.removeContentType(uid);
      });

      return this.contentTypes.get(uid).delete();
    },
  };
}

/**
 * Returns a uid from a content type infos
 *
 * @param {object} options options
 * @param {string} options.singularName content-type singularName
 * @returns {string} uid
 */
const createContentTypeUID = ({
  plugin,
  singularName,
}: {
  plugin?: string;
  singularName: string;
}): Internal.UID.ContentType =>
  `${plugin ? `plugin` : `api`}::${plugin || singularName}.${singularName}`;

const generateRelation = ({
  key,
  attribute,
  uid,
  targetAttribute = {},
}: {
  key: string;
  attribute: InternalRelationAttribute;
  uid: string;
  targetAttribute?: Partial<InternalRelationAttribute>;
}) => {
  const opts: any = {
    type: 'relation',
    target: uid,
    required: targetAttribute.required || undefined,
    private: targetAttribute.private || undefined,
    pluginOptions: targetAttribute.pluginOptions || undefined,
    // Preserve conditions from targetAttribute if they exist
    // This allows each side of the relation to maintain its own conditions
    ...(targetAttribute.conditions && { conditions: targetAttribute.conditions }),
  };

  switch (attribute.relation) {
    case 'oneToOne': {
      opts.relation = 'oneToOne';

      if (attribute.dominant) {
        opts.mappedBy = key;
      } else {
        opts.inversedBy = key;
      }
      break;
    }
    case 'oneToMany': {
      opts.relation = 'manyToOne';
      opts.inversedBy = key;
      break;
    }
    case 'manyToOne': {
      opts.relation = 'oneToMany';
      opts.mappedBy = key;
      break;
    }
    case 'manyToMany': {
      opts.relation = 'manyToMany';

      if (attribute.dominant) {
        opts.mappedBy = key;
      } else {
        opts.inversedBy = key;
      }

      break;
    }
    default:
  }

  // we do this just to make sure we have the same key order when writing to files
  const { type, relation, target, ...restOptions } = opts;

  const result = {
    type,
    relation,
    target,
    ...restOptions,
  };

  return result;
};
