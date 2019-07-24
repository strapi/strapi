/**
 *
 * ClickOverHint
 */

import React, { memo } from 'react';
import { FormattedMessage } from 'react-intl';
import PropTypes from 'prop-types';
import styled from 'styled-components';

const Wrapper = styled.div`
  position: absolute;
  top: 0;
  right: 40px;
  color: #b4b6ba;
  font-style: italic;
`;

function ClickOverHint({ show }) {
  if (show) {
    return (
      <Wrapper>
        <FormattedMessage id="content-manager.components.DraggableAttr.edit" />
      </Wrapper>
    );
  }

  return null;
}

ClickOverHint.propTypes = {
  show: PropTypes.bool.isRequired,
};

export default memo(ClickOverHint);
