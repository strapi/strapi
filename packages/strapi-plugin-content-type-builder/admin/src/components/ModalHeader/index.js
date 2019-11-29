import React from 'react';
import PropTypes from 'prop-types';
import { HeaderModalTitle } from 'strapi-helper-plugin';
import { get } from 'lodash';
import { AttributeIcon } from '@buffetjs/core';
import { FormattedMessage } from 'react-intl';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import useDataManager from '../../hooks/useDataManager';
import pluginId from '../../pluginId';
import ComponentIcon from './ComponentIcon';
import Header from './Header';

const ModalHeader = ({
  category,
  headerId,
  iconType,
  name,
  target,
  targetUid,
}) => {
  const { modifiedData } = useDataManager();
  const currentComponent = get(modifiedData, ['components', targetUid], {});
  const shouldDisplayComponentCatInfos = target === 'components';
  const currentComponentIcon = get(currentComponent, ['schema', 'icon'], '');

  let iconName;

  if (iconType === 'components') {
    iconName = 'component';
  } else {
    iconName = iconType;
  }

  return (
    <section>
      <HeaderModalTitle style={{ textTransform: 'none' }}>
        {shouldDisplayComponentCatInfos ? (
          <ComponentIcon isSelected>
            <FontAwesomeIcon icon={currentComponentIcon} />
          </ComponentIcon>
        ) : (
          <AttributeIcon
            type={iconName}
            style={{ margin: 'auto 20px auto 0' }}
          />
        )}
        {headerId && (
          <FormattedMessage id={`${pluginId}.${headerId}`} values={{ name }} />
        )}
        {!headerId && (
          <Header
            category={category}
            name={name}
            target={target}
            targetUid={targetUid}
          />
        )}
      </HeaderModalTitle>
    </section>
  );
};

ModalHeader.defaultProps = {
  category: null,
  headerId: '',
  iconType: 'contentType',
  name: '',
  target: null,
  targetUid: null,
};

ModalHeader.propTypes = {
  category: PropTypes.string,
  headerId: PropTypes.string,
  iconType: PropTypes.string,
  name: PropTypes.string,
  target: PropTypes.string,
  targetUid: PropTypes.string,
};

export default ModalHeader;
