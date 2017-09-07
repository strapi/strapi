/**
 *
 * EditFormRelations
 *
 */

import React from 'react';
import { pickBy, map } from 'lodash';

import SelectOne from 'components/SelectOne';
import SelectMany from 'components/SelectMany';
import styles from './styles.scss';

class EditFormRelations extends React.Component { // eslint-disable-line react/prefer-stateless-function
  render() {
    const relations = map(pickBy(this.props.schema[this.props.currentModelName].relations, { dominant: true }), (relation, i) => {
      switch (relation.nature) {
        case 'oneToOne':
        case 'oneToMany':
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
        case 'manyToOne':
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
      if (this.props.isNull === false) {
        this.props.toggleNull();
      }

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
  currentModelName: React.PropTypes.oneOfType([
    React.PropTypes.bool,
    React.PropTypes.string,
  ]).isRequired,
  isNull: React.PropTypes.bool.isRequired,
  record: React.PropTypes.oneOfType([
    React.PropTypes.object,
    React.PropTypes.bool,
  ]).isRequired,
  schema: React.PropTypes.oneOfType([
    React.PropTypes.object,
    React.PropTypes.bool,
  ]).isRequired,
  setRecordAttribute: React.PropTypes.func.isRequired,
  toggleNull: React.PropTypes.func.isRequired,
};


export default EditFormRelations;
