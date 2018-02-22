/**
 *
 * EditRelations
 *
 */

import React from 'react';
import { FormattedMessage } from 'react-intl';
import PropTypes from 'prop-types';
import { map } from 'lodash';

// Components.
import SelectOne from 'components/SelectOne';
import SelectMany from 'components/SelectMany';

import styles from './styles.scss';

// TODO change handler names
/* eslint-disable react/jsx-handler-names */
function EditRelations(props) {
  return (
    <div className={styles.editFormRelations}>
      <FormattedMessage id="content-manager.EditRelations.title">
        {(message) => <h3>{message}</h3>}
      </FormattedMessage>
      {map(props.schema.relations, (relation, key) => {
        switch (relation.nature) {
          case 'oneWay':
          case 'oneToOne':
          case 'manyToOne':
            if (relation.dominant) {
              return (
                <SelectOne
                  currentModelName={props.currentModelName}
                  key={key}
                  record={props.record}
                  relation={relation}
                  schema={props.schema}
                  setRecordAttribute={props.changeData}
                  location={props.location}
                />
              );
            }
            break;
          case 'oneToMany':
          case 'manyToMany':
            return (
              <SelectMany
                currentModelName={props.currentModelName}
                key={key}
                record={props.record}
                relation={relation}
                schema={props.schema}
                setRecordAttribute={props.changeData}
                location={props.location}
              />
            );
          default:
            break;
        }
      })}
    </div>
  );
}

EditRelations.defaultProps = {
  schema: {},
};

EditRelations.propTypes = {
  schema: PropTypes.object,
};

export default EditRelations;
