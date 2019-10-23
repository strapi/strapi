/**
 * Row
 */

import React from 'react';
import { FormattedMessage } from 'react-intl';
import PropTypes from 'prop-types';
import ButtonContainer from './ButtonContainer';
import { Wrapper } from './components';

function Row({
  currentDocVersion,
  data,
  isHeader,
  onClickDelete,
  onUpdateDoc,
}) {
  const { version, generatedDate } = data;

  return (
    <Wrapper>
      <div>{version}</div>
      <div>
        {isHeader ? (
          <FormattedMessage id="documentation.components.Row.generatedDate" />
        ) : (
          <span>{generatedDate}</span>
        )}
      </div>
      <ButtonContainer
        currentDocVersion={currentDocVersion}
        isHeader={isHeader}
        version={version}
        onClickDelete={onClickDelete}
        onClick={onUpdateDoc}
      />
    </Wrapper>
  );
}

Row.defaultProps = {
  currentDocVersion: '1.0.0',
  data: {},
  isHeader: false,
  onClickDelete: () => {},
  onUpdateDoc: () => {},
};

Row.propTypes = {
  currentDocVersion: PropTypes.string,
  data: PropTypes.object,
  isHeader: PropTypes.bool,
  onClickDelete: PropTypes.func,
  onUpdateDoc: PropTypes.func,
};

export default Row;
