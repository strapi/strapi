/**
 *
 * EditRelations
 *
 */

import React from 'react';
import PropTypes from 'prop-types';
import { get } from 'lodash';

// Components.
import SelectOne from 'components/SelectOne';
import SelectMany from 'components/SelectMany';

import styles from './styles.scss';

function EditRelations(props) {
  return (
    <div className={styles.editFormRelations}>
      {props.displayedRelations.map(relationName => {
        const relation = get(props.schema, ['relations', relationName], {});

        if(['oneWay', 'oneToOne', 'manyToOne', 'oneToManyMorph', 'oneToOneMorph'].includes(relation.nature)) {
          return (
            <SelectOne
              currentModelName={props.currentModelName}
              key={relationName}
              record={props.record}
              relation={relation}
              schema={props.schema}
              setRecordAttribute={props.changeData}
              location={props.location}
              onRedirect={props.onRedirect}
            />
          );
        } 
        
        return (
          <SelectMany
            currentModelName={props.currentModelName}
            key={relationName}
            record={props.record}
            relation={relation}
            schema={props.schema}
            location={props.location}
            onAddRelationalItem={props.onAddRelationalItem}
            onRedirect={props.onRedirect}
            onRemoveRelationItem={props.onRemoveRelationItem}
            onSort={props.onSort}
          />
        );
      })}
    </div>
  );
}

EditRelations.defaultProps = {
  displayedRelations: [],
  record: {},
  schema: {},
};

EditRelations.propTypes = {
  currentModelName: PropTypes.string.isRequired,
  displayedRelations: PropTypes.array,
  location: PropTypes.object.isRequired,
  onAddRelationalItem: PropTypes.func.isRequired,
  onRedirect: PropTypes.func.isRequired,
  onRemoveRelationItem: PropTypes.func.isRequired,
  onSort: PropTypes.func.isRequired,
  record: PropTypes.object,
  schema: PropTypes.object,
};

export default EditRelations;
