'use strict';

const _ = require('lodash/fp');
const types = require('../types');

const hasComponentsOrDz = model => {
  return Object.values(model.attributes).some(
    ({ type }) => types.isComponent(type) || types.isDynamicZone(type)
  );
};

const hasInversedBy = _.has('inversedBy');
const hasMappedBy = _.has('mappedBy');

const isBidirectional = attribute => hasInversedBy(attribute) || hasMappedBy(attribute);
const isOwner = attribute => !isBidirectional(attribute) || hasInversedBy(attribute);
const shouldUseJoinTable = attribute => attribute.useJoinTable !== false;

// TODO: how do we make sure this column is created ? should it be added in the attributes ? should the schema layer do the conversion ?
const createJoinColum = (metadata, { attribute /*attributeName, meta */ }) => {
  const targetMeta = metadata.get(attribute.target);

  const joinColumnName = _.snakeCase(`${targetMeta.singularName}_id`);
  const joinColumn = {
    name: joinColumnName,
    referencedColumn: 'id',
    referencedTable: targetMeta.tableName,
  };

  Object.assign(attribute, { owner: true, joinColumn });

  if (isBidirectional(attribute)) {
    const inverseAttribute = targetMeta.attributes[attribute.inversedBy];
    // NOTE: do not invert here but invert in the query ?
    Object.assign(inverseAttribute, {
      joinColumn: {
        name: joinColumn.referencedColumn,
        referencedColumn: joinColumn.name,
      },
    });
  }
};

const createJoinTable = (metadata, { attributeName, attribute, meta }) => {
  const targetMeta = metadata.get(attribute.target);

  const joinTableName = _.snakeCase(
    `${meta.tableName}_${targetMeta.tableName}_${attributeName}_links`
  );

  const joinColumnName = _.snakeCase(`${meta.singularName}_id`);
  const inverseJoinColumnName = _.snakeCase(`${targetMeta.singularName}_id`);

  metadata.add({
    uid: joinTableName,
    tableName: joinTableName,
    attributes: {
      [joinColumnName]: {
        type: 'integer',
        column: {
          unsigned: true,
        },
      },
      [inverseJoinColumnName]: {
        type: 'integer',
        column: {
          unsigned: true,
        },
      },
      // TODO: add extra pivot attributes -> user should use an intermediate entity
    },
    foreignKeys: [
      {
        name: 'join_column_fk',
        columns: [joinColumnName],
        referencedColumns: ['id'],
        referencedTable: meta.tableName,
        onDelete: 'CASCADE',
      },
      {
        name: 'inverse_join_column_fk',
        columns: [inverseJoinColumnName],
        referencedColumns: ['id'],
        referencedTable: targetMeta.tableName,
        onDelete: 'CASCADE',
      },
    ],
  });

  const joinTable = {
    name: joinTableName,
    joinColumn: {
      name: joinColumnName,
      referencedColumn: 'id',
    },
    inverseJoinColumn: {
      name: inverseJoinColumnName,
      referencedColumn: 'id',
    },
  };

  Object.assign(attribute, { joinTable });

  if (isBidirectional(attribute)) {
    const inverseAttribute = targetMeta.attributes[attribute.inversedBy];
    Object.assign(inverseAttribute, {
      joinTable: {
        name: joinTableName,
        joinColumn: joinTable.inverseJoinColumn,
        inverseJoinColumn: joinTable.joinColumn,
      },
    });
  }
};

class Metadata extends Map {
  add(meta) {
    return this.set(meta.uid, meta);
  }
}

const createMetadata = (models = []) => {
  /*

    timestamps => not optional anymore but auto added. Auto added on the content type or in the db layer ?

    options => options are handled on the layer above. Options convert to fields on the CT

    filters => not in v1

    attributes

      - type
      - mapping field name - column name
      - mapping field type - column type
      - formatter / parser => coming from field type so no
      - indexes / checks / contstraints
      - relations => reference to the target model (function or string to avoid circular deps ?)
        - name of the LEFT/RIGHT side foreign keys
        - name of join table

      - compo/dz => reference to the components
      - validators
      - hooks
      - default value
      - required -> should add a not null option instead of the API required
      - unique -> should add a DB unique option instead of the unique in the API (Unique by locale or something else for example)

    lifecycles

    private fields ? => handled on a different layer
  */

  // TODO: reorder to make sure we can create everything or delete everything in the right order
  // TODO: allow passing the join config in the attribute
  // TODO: allow passing column config in the attribute
  const metadata = new Metadata();

  // init pass
  for (const model of models) {
    if (!model.tableName) {
      console.log(model);
    }

    metadata.add({
      singularName: model.singularName,
      uid: model.uid,
      tableName: model.tableName,
      attributes: {
        // TODO: check if there isn't an attribute with an id already
        id: {
          type: 'increments',
        },
        ...model.attributes,
      },
    });
  }

  // build compos / relations
  for (const meta of metadata.values()) {
    if (hasComponentsOrDz(meta)) {
      const compoLinkModelMeta = createCompoLinkModelMeta(meta);
      meta.componentLink = compoLinkModelMeta;
      metadata.add(compoLinkModelMeta);
    }

    for (const [attributeName, attribute] of Object.entries(meta.attributes)) {
      try {
        if (types.isComponent(attribute.type)) {
          // convert component to relation

          Object.assign(attribute, {
            type: 'relation',
            relation: attribute.repeatable === true ? 'oneToMany' : 'oneToOne',
            target: attribute.component,
            joinTable: {
              name: meta.componentLink.tableName,
              joinColumn: {
                name: 'entity_id',
                referencedColumn: 'id',
              },
              inverseJoinColumn: {
                name: 'component_id',
                referencedColumn: 'id',
              },
              on: {
                field: attributeName,
              },
            },
          });

          continue;
        }

        if (types.isDynamicZone(attribute.type)) {
          continue;
        }

        if (types.isRelation(attribute.type)) {
          // NOTE: also validate

          createRelation(attributeName, attribute, meta, metadata);

          continue;
        }
      } catch (error) {
        throw new Error(
          `Error on attribute ${attributeName} in model ${meta.singularName}(${meta.uid}): ${error.message}`
        );
      }
    }
  }

  return metadata;
};

const createRelation = (attributeName, attribute, meta, metadata) => {
  switch (attribute.relation) {
    case 'oneToOne': {
      /*
        if one to one then
          if owner then
            if with join table then
              create join table
            else
              create joinColumn
            if bidirectional then
              set inverse attribute joinCol or joinTable info correctly
          else
            this property must be set by the owner side
            verify the owner side is valid // should be done before or at the same time ?
      */

      if (isOwner(attribute)) {
        if (shouldUseJoinTable(attribute)) {
          createJoinTable(metadata, {
            attribute,
            attributeName,
            meta,
          });
        } else {
          createJoinColum(metadata, {
            attribute,
            attributeName,
            meta,
          });
        }
      } else {
        // verify other side is valid
      }
      break;
    }

    case 'oneToMany': {
      /*
       if one to many then
        if unidirectional then
          create join table
        if bidirectional then
          cannot be owning side
          do nothing
      */

      if (!isBidirectional(attribute)) {
        createJoinTable(metadata, {
          attribute,
          attributeName,
          meta,
        });
      } else {
        if (isOwner(attribute)) {
          throw new Error(
            'one side of a oneToMany cannot be the owner side in a bidirectional relation'
          );
        }
      }

      break;
    }

    case 'manyToOne': {
      /*
        if many to one then
          if unidirectional then
            if with join table then
              create join table
            else
              create join column
          else
            must be the owner side
            if with join table then
              create join table
            else
              create join column
            set inverse attribute joinCol or joinTable info correctly
      */

      if (isBidirectional(attribute) && !isOwner(attribute)) {
        throw new Error('The many side of a manyToOne must be the owning side');
      }

      if (shouldUseJoinTable(attribute)) {
        createJoinTable(metadata, {
          attribute,
          attributeName,
          meta,
        });
      } else {
        createJoinColum(metadata, {
          attribute,
          attributeName,
          meta,
        });
      }

      break;
    }

    case 'manyToMany': {
      /*
        if many to many then
          if unidirectional
            create join table
          else
            if owner then
              if with join table then
                create join table
            else
              do nothing
      */

      if (!isBidirectional(attribute) || isOwner(attribute)) {
        createJoinTable(metadata, {
          attribute,
          attributeName,
          meta,
        });
      }

      break;
    }

    default: {
      throw new Error(`Unknow relation ${attribute.relation}`);
    }
  }

  /*




      polymorphic relations

      OneToOneX
      ManyToOneX
      OnetoManyX
      ManytoManyX
      XOneToOne
      XManyToOne
      XOnetoMany
      XManytoMany

      XOneToOneX
      XManyToOneX
      XOnetoManyX
      XManytoManyX
  */
};

// NOTE: we might just move the compo logic outside this layer too at some point
const createCompoLinkModelMeta = baseModelMeta => {
  return {
    // TODO: make sure there can't be any conflicts with a prefix
    // singularName: 'compo',
    uid: `${baseModelMeta.uid}_components`,
    tableName: `${baseModelMeta.tableName}_components`,
    attributes: {
      id: {
        type: 'increments',
      },
      entity_id: {
        type: 'integer',
        column: {
          unsigned: true,
        },
      },
      component_id: {
        type: 'integer',
        column: {
          unsigned: true,
        },
      },
      component_type: {
        type: 'string',
      },
      field: {
        type: 'string',
      },
      order: {
        type: 'integer',
        column: {
          unsigned: true,
          defaultTo: [0],
        },
      },
    },
    indexes: [
      {
        name: `${baseModelMeta.tableName}_field_index`,
        columns: ['field'],
      },
      {
        name: `${baseModelMeta.tableName}_component_type_index`,
        columns: ['component_type'],
      },
    ],
    foreignKeys: [
      {
        name: 'entity_fk',
        columns: ['entity_id'],
        referencedColumns: ['id'],
        referencedTable: baseModelMeta.tableName,
        onDelete: 'CASCADE',
      },
    ],
  };
};

module.exports = createMetadata;
