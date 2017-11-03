/**
 *
 * EditFormRelations
 *
 */

import React from 'react';
import PropTypes from 'prop-types';
import { get, map, size } from 'lodash';

import SelectOne from 'components/SelectOne';
import SelectMany from 'components/SelectMany';
import styles from './styles.scss';

class EditFormRelations extends React.Component { // eslint-disable-line react/prefer-stateless-function
  componentDidMount() {
    if (size(get(this.props.schema, [this.props.currentModelName, 'relations'])) === 0 && !this.props.isNull) {
      this.props.toggleNull();
    }
  }

  render() {
    const relations = map(this.props.schema[this.props.currentModelName].relations, (relation, i) => {

      switch (relation.nature) {
        case 'oneToOne':
        case 'manyToOne':
          if (relation.dominant) {
            return (
              <SelectOne
                currentModelName={this.props.currentModelName}
                key={i}
                record={this.props.record}
                relation={relation}
                schema={this.props.schema}
                setRecordAttribute={this.props.setRecordAttribute}
              />
            );
          }
          break;
        case 'oneToMany':
        case 'manyToMany':
          return (
            <SelectMany
              currentModelName={this.props.currentModelName}
              key={i}
              record={this.props.record}
              relation={relation}
              schema={this.props.schema}
              setRecordAttribute={this.props.setRecordAttribute}
            />
          );
        default:
          break;
      }
    });

    if (!relations.length) {
      return (null);
    }

    return (
      <div className={styles.editFormRelations}>
        <h3>Relational data</h3>
        {relations}
      </div>
    );
  }
}


EditFormRelations.propTypes = {
  currentModelName: PropTypes.oneOfType([
    PropTypes.bool,
    PropTypes.string,
  ]).isRequired,
  isNull: PropTypes.bool.isRequired,
  record: PropTypes.oneOfType([
    PropTypes.object,
    PropTypes.bool,
  ]).isRequired,
  schema: PropTypes.oneOfType([
    PropTypes.object,
    PropTypes.bool,
  ]).isRequired,
  setRecordAttribute: PropTypes.func.isRequired,
  toggleNull: PropTypes.func.isRequired,
};


export default EditFormRelations;
