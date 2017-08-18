/**
 *
 * EditFormRelations
 *
 */

import React from 'react';
import _ from 'lodash';

import EditFormRelation from 'components/EditFormRelation';
import styles from './styles.scss';

class EditFormRelations extends React.Component { // eslint-disable-line react/prefer-stateless-function
  render() {
    const relations = _.map(this.props.schema[this.props.currentModelName].relations, (relation, i) => (
      <EditFormRelation
        currentModelName={this.props.currentModelName}
        key={i}
        record={this.props.record}
        relation={relation}
        schema={this.props.schema}
        setRecordAttribute={this.props.setRecordAttribute}
      />));

    return (
      <div className={styles.editFormRelations}>
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
  record: React.PropTypes.oneOfType([
    React.PropTypes.object,
    React.PropTypes.bool,
  ]).isRequired,
  schema: React.PropTypes.oneOfType([
    React.PropTypes.object,
    React.PropTypes.bool,
  ]).isRequired,
  setRecordAttribute: React.PropTypes.func.isRequired,
};


export default EditFormRelations;
