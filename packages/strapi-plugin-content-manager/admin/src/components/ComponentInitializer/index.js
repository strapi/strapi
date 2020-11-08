import React from 'react';
import PropTypes from 'prop-types';
import { FormattedMessage } from 'react-intl';
import pluginId from '../../pluginId';
import useDataManager from '../../hooks/useDataManager';
import NonRepeatableWrapper from '../NonRepeatableWrapper';
import PlusButton from '../PlusButton';
import P from './P';

const ComponentInitializer = ({ componentUid, isReadOnly, name }) => {
  const { addNonRepeatableComponentToField } = useDataManager();

  return (
    <NonRepeatableWrapper isEmpty isReadOnly={isReadOnly}>
      <PlusButton
        onClick={() => {
          if (!isReadOnly) {
            addNonRepeatableComponentToField(name, componentUid);
          }
        }}
        type="button"
      />
      <FormattedMessage id={`${pluginId}.components.empty-repeatable`}>
        {msg => <P style={{ paddingTop: 78 }}>{msg}</P>}
      </FormattedMessage>
    </NonRepeatableWrapper>
  );
};

ComponentInitializer.defaultProps = {
  isReadOnly: false,
  name: '',
};

ComponentInitializer.propTypes = {
  componentUid: PropTypes.string.isRequired,
  isReadOnly: PropTypes.bool,
  name: PropTypes.string,
};

export default ComponentInitializer;
