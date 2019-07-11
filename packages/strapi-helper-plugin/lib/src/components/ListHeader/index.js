import React from 'react';
import { FormattedMessage } from 'react-intl';
import PropTypes from 'prop-types';
import Button from '../Button';
import SubTitle from './SubTitle';
import Title from './Title';
import Wrapper from './Wrapper';

function ListHeader({ button, subtitle, subtitleValues, title }) {
  return (
    <Wrapper>
      {button && <Button {...button} />}
      <div>
        {title.map(item => {
          return (
            <FormattedMessage
              key={item.label}
              id={item.label}
              values={item.values}
            >
              {msg => <Title>{msg}&nbsp;</Title>}
            </FormattedMessage>
          );
        })}
      </div>
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
  title: null,
};

ListHeader.propTypes = {
  button: PropTypes.object,
  subtitle: PropTypes.string,
  subtitleValues: PropTypes.object,
  title: PropTypes.arrayOf(
    PropTypes.shape({
      label: PropTypes.string,
      values: PropTypes.object,
    })
  ),
};

export default ListHeader;
