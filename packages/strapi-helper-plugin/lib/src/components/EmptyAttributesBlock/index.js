/**
 *
 * EmptyAttributesBlock
 *
 */

import React from 'react';
import PropTypes from 'prop-types';
import { FormattedMessage } from 'react-intl';
import Button from '../Button';
import Wrapper from './Wrapper';

function EmptyAttributesBlock({ description, label, onClick, title, id }) {
  return (
    <Wrapper>
      <div>
        <FormattedMessage id={title}>
          {msg => <div className="title">{msg}</div>}
        </FormattedMessage>
        <FormattedMessage id={description}>
          {msg => <div className="description">{msg}</div>}
        </FormattedMessage>
        <div className="buttonContainer">
          <Button onClick={onClick} primaryAddShape label={label} id={id} />
        </div>
      </div>
    </Wrapper>
  );
}

EmptyAttributesBlock.defaultProps = {
  description: 'app.utils.defaultMessage',
  id: '',
  label: 'app.utils.defaultMessage',
  onClick: () => {},
  title: 'app.components.EmptyAttributes.title',
};

EmptyAttributesBlock.propTypes = {
  description: PropTypes.string,
  id: PropTypes.string,
  label: PropTypes.string,
  onClick: PropTypes.func,
  title: PropTypes.string,
};

export default EmptyAttributesBlock;
