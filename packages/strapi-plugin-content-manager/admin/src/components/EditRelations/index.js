/**
 *
 * EditRelations
 *
 */

import React from 'react';
import { FormattedMessage } from 'react-intl';
import PropTypes from 'prop-types';
import { get, map } from 'lodash';

// Components.
import SelectOne from 'components/SelectOne';
import SelectMany from 'components/SelectMany';

import styles from './styles.scss';

const filterRelationsUpload = (data) => Object.keys(data).reduce((acc, current) => {
  if (get(data, [current, 'plugin']) !== 'upload') {
    acc[current] = data[current];
  }

  return acc;
}, {});

function EditRelations(props) {
  return (
    <div className={styles.editFormRelations}>
      <FormattedMessage id="content-manager.EditRelations.title">
        {(message) => <h3>{message}</h3>}
      </FormattedMessage>
      {map(filterRelationsUpload(props.schema.relations), (relation, key) => {

        const Select = ['oneWay', 'oneToOne', 'manyToOne'].includes(relation.nature) && relation.dominant ? SelectOne : SelectMany;

        return (
          <Select
            currentModelName={props.currentModelName}
            key={key}
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
  record: {},
  schema: {},
};

EditRelations.propTypes = {
  changeData: PropTypes.func.isRequired,
  currentModelName: PropTypes.string.isRequired,
  location: PropTypes.object.isRequired,
  record: PropTypes.object,
  schema: PropTypes.object,
};

export default EditRelations;
