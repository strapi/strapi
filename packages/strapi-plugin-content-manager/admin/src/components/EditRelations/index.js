/**
 *
 * EditRelations
 *
 */

import React from 'react';
import { FormattedMessage } from 'react-intl';
import PropTypes from 'prop-types';
import { get } from 'lodash';

// Components.
import SelectOne from 'components/SelectOne';
import SelectMany from 'components/SelectMany';

import styles from './styles.scss';

function EditRelations(props) {
  return (
    <div className={styles.editFormRelations}>
      <FormattedMessage id="content-manager.EditRelations.title">
        {(message) => <h3>{message}</h3>}
      </FormattedMessage>
      {props.displayedRelations.map(relationName => {
        const relation = get(props.schema, ['relations', relationName], {});
        const Select = ['oneWay', 'oneToOne', 'manyToOne', 'oneToManyMorph', 'oneToOneMorph'].includes(relation.nature) ? SelectOne : SelectMany;

        return (
          <Select
            currentModelName={props.currentModelName}
            key={relationName}
            record={props.record}
            relation={relation}
            schema={props.schema}
            setRecordAttribute={props.changeData}
            location={props.location}
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
  changeData: PropTypes.func.isRequired,
  currentModelName: PropTypes.string.isRequired,
  displayedRelations: PropTypes.array,
  location: PropTypes.object.isRequired,
  record: PropTypes.object,
  schema: PropTypes.object,
};

export default EditRelations;
