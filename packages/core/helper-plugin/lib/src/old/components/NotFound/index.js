import React from 'react';
import PropTypes from 'prop-types';
import { FormattedMessage } from 'react-intl';
import Button from '../Button';
import Wrapper from './Wrapper';

function NotFound({ history }) {
  return (
    <Wrapper>
      <h1>404</h1>
      <h2>
        <FormattedMessage id="app.components.NotFoundPage.description" />
      </h2>
      <Button
        label="app.components.NotFoundPage.back"
        kind="back"
        onClick={e => {
          e.stopPropagation();

          history.push('/');
        }}
      />
    </Wrapper>
  );
}

NotFound.propTypes = {
  history: PropTypes.shape({
    push: PropTypes.func,
  }).isRequired,
};

export default NotFound;
