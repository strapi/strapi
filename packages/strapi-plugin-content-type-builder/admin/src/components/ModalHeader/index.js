import React, { Fragment } from 'react';
import PropTypes from 'prop-types';
import { HeaderModalTitle } from 'strapi-helper-plugin';
import { get } from 'lodash';
import { AttributeIcon } from '@buffetjs/core';
import { FormattedMessage } from 'react-intl';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import ComponentIcon from './ComponentIcon';
import ComponentInfos from './ComponentInfos';
import IconWrapper from './IconWrapper';
import UpperFirst from '../UpperFirst';

const ModalHeader = ({ headerId, headers }) => {
  console.log({ headers });
  return (
    <section>
      <HeaderModalTitle style={{ textTransform: 'none' }}>
        {headerId && (
          <>
            <AttributeIcon
              type={get(headers, [0, 'icon', 'name'], '')}
              style={{ margin: 'auto 20px auto 0' }}
            />
            <FormattedMessage
              id={headerId}
              values={{ name: get(headers, [0, 'label'], '') }}
            />
          </>
        )}
        {!headerId &&
          headers.map((header, index) => {
            const iconName = get(header, ['icon', 'name'], '');
            const iconType = iconName === null ? '' : iconName;
            const icon = get(header, ['icon', 'isCustom'], false) ? (
              <ComponentIcon isSelected>
                <FontAwesomeIcon icon={iconType} />
              </ComponentIcon>
            ) : (
              <AttributeIcon
                type={iconType}
                style={{ margin: 'auto 20px auto 0' }}
              />
            );

            if (index === 0) {
              return (
                <Fragment key={index}>
                  {icon}
                  <span>
                    <UpperFirst content={get(header, ['label'], '')} />
                  </span>
                </Fragment>
              );
            }

            return (
              <Fragment key={index}>
                <IconWrapper>
                  <FontAwesomeIcon icon="chevron-right" />
                </IconWrapper>
                {icon}
                <span>
                  <UpperFirst content={get(header, ['label'], '')} />
                </span>
                {header.info.category && (
                  <ComponentInfos
                    category={header.info.category}
                    name={header.info.name}
                  />
                )}
              </Fragment>
            );
          })}
      </HeaderModalTitle>
    </section>
  );
};

ModalHeader.defaultProps = {
  category: null,
  headerId: '',
  headers: [],
  iconType: 'contentType',
  name: '',
  target: null,
  targetUid: null,
  subCategory: null,
  subTargetUid: null,
};

ModalHeader.propTypes = {
  category: PropTypes.string,
  headerId: PropTypes.string,
  headers: PropTypes.array,
  iconType: PropTypes.string,
  name: PropTypes.string,
  target: PropTypes.string,
  targetUid: PropTypes.string,
  subCategory: PropTypes.string,
  subTargetUid: PropTypes.string,
};

export default ModalHeader;
