'use strict';

const {
  isBidirectional,
  isOneToAny,
  isManyToAny,
  isAnyToOne,
  isAnyToMany,
} = require('../metadata/relations');
const { createQueryBuilder } = require('../query');

const getSelect = (joinTable, attribute) => {
  const { joinColumn, orderColumnName, inverseJoinColumn, inverseOrderColumnName } = joinTable;
  const select = [joinColumn.name, inverseJoinColumn.name];
  if (isAnyToMany(attribute)) {
    select.push(orderColumnName);
  }
  if (isBidirectional(attribute) && isManyToAny(attribute)) {
    select.push(inverseOrderColumnName);
  }
  return select;
};

const deletePreviousOneToAnyRelations = async ({ id, attribute, joinTable, relIdsToadd, db }) => {
  const { joinColumn, inverseJoinColumn, orderColumnName } = joinTable;
  const select = getSelect(joinTable, attribute);

  // need to delete the previous relations for oneToAny relations
  if (isBidirectional(attribute) && isOneToAny(attribute)) {
    // update orders for previous oneToAny relations that will be deleted if it has order (oneToMany)
    if (isAnyToMany(attribute)) {
      const currentRelsToDelete = await createQueryBuilder(joinTable.name, db)
        .select(select)
        .where({
          [inverseJoinColumn.name]: relIdsToadd,
          [joinColumn.name]: { $ne: id },
        })
        .where(joinTable.on || {})
        .execute();

      currentRelsToDelete.sort((a, b) => b[orderColumnName] - a[orderColumnName]);

      for (const relToDelete of currentRelsToDelete) {
        if (relToDelete[orderColumnName] !== null) {
          await createQueryBuilder(joinTable.name, db)
            .decrement(orderColumnName, 1)
            .where({
              [joinColumn.name]: relToDelete[joinColumn.name],
              [orderColumnName]: { $gt: relToDelete[orderColumnName] },
            })
            .where(joinTable.on || {})
            .execute();
        }
      }
    }

    // delete previous oneToAny relations
    await createQueryBuilder(joinTable.name, db)
      .delete()
      .where({
        [inverseJoinColumn.name]: relIdsToadd,
        [joinColumn.name]: { $ne: id },
      })
      .where(joinTable.on || {})
      .execute();
  }
};

const deletePreviousAnyToOneRelations = async ({ id, attribute, joinTable, relIdsToadd, db }) => {
  const { joinColumn, inverseJoinColumn, inverseOrderColumnName } = joinTable;
  const select = getSelect(joinTable, attribute);

  // Delete the previous relations for anyToOne relations
  if (isBidirectional(attribute) && isAnyToOne(attribute)) {
    // update orders for previous anyToOne relations that will be deleted if it has order (manyToOne)
    if (isManyToAny(attribute)) {
      const currentRelsToDelete = await createQueryBuilder(joinTable.name, db)
        .select(select)
        .where({
          [joinColumn.name]: id,
          [inverseJoinColumn.name]: { $notIn: relIdsToadd },
        })
        .where(joinTable.on || {})
        .execute();

      for (const relToDelete of currentRelsToDelete) {
        if (relToDelete[inverseOrderColumnName] !== null) {
          await createQueryBuilder(joinTable.name, db)
            .decrement(inverseOrderColumnName, 1)
            .where({
              [inverseJoinColumn.name]: relToDelete[inverseJoinColumn.name],
              [inverseOrderColumnName]: { $gt: relToDelete[inverseOrderColumnName] },
            })
            .where(joinTable.on || {})
            .execute();
        }
      }
    }

    // delete previous oneToAny relations
    await createQueryBuilder(joinTable.name, db)
      .delete()
      .where({
        [joinColumn.name]: id,
        [inverseJoinColumn.name]: { $notIn: relIdsToadd },
      })
      .where(joinTable.on || {})
      .execute();
  }
};

// INVERSE ORDER UPDATE
const deleteAllRelations = async ({
  id,
  attribute,
  joinTable,
  except = undefined,
  onlyFor = undefined,
  db,
}) => {
  const { joinColumn, inverseJoinColumn, orderColumnName, inverseOrderColumnName } = joinTable;
  const select = getSelect(joinTable, attribute);

  if (isAnyToMany(attribute) || (isBidirectional(attribute) && isManyToAny(attribute))) {
    let lastId = 0;
    let done = false;
    const batchSize = 100;
    while (!done) {
      const relsToDelete = await createQueryBuilder(joinTable.name, db)
        .select(select)
        .where({
          [joinColumn.name]: id,
          id: { $gt: lastId },
          ...(except ? { [inverseJoinColumn.name]: { $notIn: except } } : {}),
          ...(onlyFor ? { [inverseJoinColumn.name]: { $in: onlyFor } } : {}),
        })
        .where(joinTable.on || {})
        .orderBy('id')
        .limit(batchSize)
        .execute();
      done = relsToDelete.length < batchSize;
      lastId = relsToDelete[relsToDelete.length - 1]?.id;

      // ORDER UPDATE
      if (isAnyToMany(attribute)) {
        // sort by order DESC so that the order updates are done in the correct order
        // avoiding one to interfere with the others
        relsToDelete.sort((a, b) => b[orderColumnName] - a[orderColumnName]);

        for (const relToDelete of relsToDelete) {
          if (relToDelete[orderColumnName] !== null) {
            await createQueryBuilder(joinTable.name, db)
              .decrement(orderColumnName, 1)
              .where({
                [joinColumn.name]: id,
                [orderColumnName]: { $gt: relToDelete[orderColumnName] },
              })
              .where(joinTable.on || {})
              // manque le pivot ici
              .execute();
          }
        }
      }

      if (isBidirectional(attribute) && isManyToAny(attribute)) {
        const updateInverseOrderPromises = [];
        for (const relToDelete of relsToDelete) {
          if (relToDelete[inverseOrderColumnName] !== null) {
            const updatePromise = createQueryBuilder(joinTable.name, db)
              .decrement(inverseOrderColumnName, 1)
              .where({
                [inverseJoinColumn.name]: relToDelete[inverseJoinColumn.name],
                [inverseOrderColumnName]: { $gt: relToDelete[inverseOrderColumnName] },
              })
              .where(joinTable.on || {})
              .execute();
            updateInverseOrderPromises.push(updatePromise);
          }
        }
        await Promise.all(updateInverseOrderPromises);
      }
    }
  }

  await createQueryBuilder(joinTable.name, db)
    .delete()
    .where({
      [joinColumn.name]: id,
      ...(except ? { [inverseJoinColumn.name]: { $notIn: except } } : {}),
      ...(onlyFor ? { [inverseJoinColumn.name]: { $in: onlyFor } } : {}),
    })
    .where(joinTable.on || {})
    .execute();
};

module.exports = {
  deletePreviousOneToAnyRelations,
  deletePreviousAnyToOneRelations,
  deleteAllRelations,
};
