import React from 'react';
import PropTypes from 'prop-types';
import { FormattedMessage } from 'react-intl';
import ManyToMany from '../../icons/ManyToMany';
import ManyToOne from '../../icons/ManyToOne';
import ManyWay from '../../icons/ManyWay';
import OneToMany from '../../icons/OneToMany';
import OneToOne from '../../icons/OneToOne';
import OneWay from '../../icons/OneWay';
import getTrad from '../../utils/getTrad';
import Wrapper from './Wrapper';

const RelationFormNaturePicker = ({ nature }) => {
  return (
    <Wrapper>
      <div className="nature-container">
        <div className="nature-buttons">
          <ManyToOne />
          <ManyToOne isSelected />
          <ManyWay />
          <ManyWay isSelected />
          <ManyToMany />
          <ManyToMany isSelected />
          <OneToMany />
          <OneToMany isSelected />
          <OneToOne />
          <OneToOne isSelected />
          <OneWay />
          <OneWay isSelected />
        </div>
        <div className="nature-txt">
          <span>left</span>
          &nbsp; <FormattedMessage id={getTrad(`relation.${nature}`)} />
          &nbsp;
          <span>right</span>
        </div>
      </div>
    </Wrapper>
  );
};

RelationFormNaturePicker.defaultProps = {
  nature: 'oneWay',
};

RelationFormNaturePicker.propTypes = {
  nature: PropTypes.string,
};

export default RelationFormNaturePicker;
