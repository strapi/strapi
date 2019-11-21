import React from 'react';
import PropTypes from 'prop-types';
import { FormattedMessage } from 'react-intl';
import Wrapper from './Wrapper';
import getTrad from '../../utils/getTrad';

const RelationFormNaturePicker = ({ nature }) => {
  return (
    <Wrapper>
      <div className="nature-container">
        <div className="nature-buttons"></div>
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
