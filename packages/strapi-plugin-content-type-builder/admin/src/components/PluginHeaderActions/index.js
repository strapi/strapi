/**
 *
 * PluginHeaderActions
 *
 */

import React from 'react';
import PropTypes from 'prop-types';
import { FormattedMessage } from 'react-intl';
import { isEmpty } from 'lodash';
import { Button } from '@buffetjs/core';

import Wrapper from './Wrapper';

function PluginHeaderActions({ actions }) {
  const renderLabel = action => {
    const { title, children } = action;
    return !isEmpty(title) && !children ? (
      <FormattedMessage id={title} />
    ) : (
      children
    );
  };

  return (
    <Wrapper>
      {actions.map(action => {
        return (
          <Button key={JSON.stringify(action.title)} {...action}>
            {renderLabel(action)}
          </Button>
        );
      })}
    </Wrapper>
  );
}

PluginHeaderActions.defaultProps = {
  actions: [],
};

PluginHeaderActions.propTypes = {
  actions: PropTypes.array,
};

export default PluginHeaderActions;
