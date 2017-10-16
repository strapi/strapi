/**
*
* RelationNaturePicker
*
*/

import React from 'react';
import PropTypes from 'prop-types';
import { map, startCase } from 'lodash';
import pluralize from 'pluralize';
import { FormattedMessage } from 'react-intl';

import RelationIco from 'components/RelationIco';

import ManyToMany from '../../assets/images/many_to_many.svg';
import ManyToManySelected from '../../assets/images/many_to_many_selected.svg';
import ManyToOne from '../../assets/images/many_to_one.svg';
import ManyToOneSelected from '../../assets/images/many_to_one_selected.svg';
import OneToMany from '../../assets/images/one_to_many.svg';
import OneToManySelected from '../../assets/images/one_to_many_selected.svg';
import OneToOne from '../../assets/images/one_to_one.svg';
import OneToOneSelected from '../../assets/images/one_to_one_selected.svg';

import styles from './styles.scss';

class RelationNaturePicker extends React.Component { // eslint-disable-line react/prefer-stateless-function
  constructor(props) {
    super(props);
    this.icos = [
      {
        name: 'oneToOne',
        ico: OneToOne,
        icoSelected: OneToOneSelected,
      },
      {
        name: 'oneToMany',
        ico: OneToMany,
        icoSelected: OneToManySelected,
      },
      {
        name: 'manyToOne',
        ico: ManyToOne,
        icoSelected: ManyToOneSelected,
      },
      {
        name: 'manyToMany',
        ico: ManyToMany,
        icoSelected: ManyToManySelected,
      },
    ];
  }
  render() {
    let contentTypeName = startCase(this.props.contentTypeName);
    let contentTypeTarget = startCase(this.props.contentTypeTarget);

    switch (this.props.selectedIco) {
      case 'oneToMany':
        contentTypeTarget = pluralize(contentTypeTarget);
        break;
      case 'manyToOne':
        contentTypeName = contentTypeTarget;
        contentTypeTarget = pluralize(startCase(this.props.contentTypeName));
        break;
      case 'manyToMany':
        contentTypeName = pluralize(contentTypeName);
        contentTypeTarget = pluralize(contentTypeTarget);
        break;
      default:

    }

    const relationText = this.props.selectedIco ? <FormattedMessage id={`content-type-builder.relation.${this.props.selectedIco}`}  /> : '';

    return (
      <div className={styles.relationNaturePicker}>
        {map(this.icos, (value, key) => (
          <RelationIco key={key} ico={this.props.selectedIco === value.name ? value.icoSelected : value.ico} name={value.name} onChange={this.props.onChange} />
        ))}
        <div className={styles.infoContainer}>
          <span>
            {contentTypeName}
          </span>
          &nbsp;
          {relationText}
          &nbsp;
          <span>
            {contentTypeTarget}
          </span>
        </div>
      </div>
    );
  }
}

RelationNaturePicker.propTypes = {
  contentTypeName: PropTypes.string,
  contentTypeTarget: PropTypes.string,
  onChange: PropTypes.func.isRequired,
  selectedIco: PropTypes.string,
};

RelationNaturePicker.defaultProps = {
  contentTypeName: '',
  contentTypeTarget: '',
  selectedIco: 'oneToOne',
};

export default RelationNaturePicker;
