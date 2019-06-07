import React from 'react';
import { FormattedMessage } from 'react-intl';
import PropTypes from 'prop-types';
import Button from '../Button';
import SubTitle from './SubTitle';
import Title from './Title';
import Wrapper from './Wrapper';

function ListHeader({ button, subtitle, subtitleValues, title, titleValues }) {
  return (
    <Wrapper>
      {button && <Button {...button} />}
      <FormattedMessage id={title} values={titleValues}>
        {msg => <Title>{msg}</Title>}
      </FormattedMessage>
      <FormattedMessage id={subtitle} values={subtitleValues}>
        {msg => <SubTitle>{msg}</SubTitle>}
      </FormattedMessage>
    </Wrapper>
  );
}

ListHeader.defaultProps = {
  button: null,
  subtitle: 'app.utils.defaultMessage',
  subtitleValues: {},
  title: 'app.utils.defaultMessage',
  titleValues: {},
};

ListHeader.propTypes = {
  button: PropTypes.object,
  subtitle: PropTypes.string,
  subtitleValues: PropTypes.object,
  title: PropTypes.string,
  titleValues: PropTypes.object,
};

export default ListHeader;
