/**
 *
 * EditFormRelations
 *
 */

import React from 'react';
import PropTypes from 'prop-types';
import { get, map, size } from 'lodash';

// Components.
import SelectOne from 'components/SelectOne';
import SelectMany from 'components/SelectMany';

// Utils.
import getQueryParameters from 'utils/getQueryParameters';

// Style.
import styles from './styles.scss';

class EditFormRelations extends React.Component { // eslint-disable-line react/prefer-stateless-function
  componentDidMount() {
    const source = getQueryParameters(this.props.location.search, 'source');
    const currentSchema = source !== 'content-manager' ? get(this.props.schema, ['plugins', source, this.props.currentModelName]) : get(this.props.schema, [this.props.currentModelName]);

    if (size(get(currentSchema, ['relations'])) === 0 && !this.props.isNull) {
      this.props.toggleNull();
    }
  }

  render() {
    const source = getQueryParameters(this.props.location.search, 'source');
    const currentSchema = source !== 'content-manager' ? get(this.props.schema, ['plugins', source, this.props.currentModelName]) : get(this.props.schema, [this.props.currentModelName]);

    const relations = map(currentSchema.relations, (relation, i) => {

      switch (relation.nature) {
        case 'oneWay':
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
                location={this.props.location}
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
              location={this.props.location}
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
  location: PropTypes.shape({
    search: PropTypes.string,
  }).isRequired,
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
