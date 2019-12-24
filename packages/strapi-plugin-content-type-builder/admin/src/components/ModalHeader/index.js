import React, { Fragment } from 'react';
import PropTypes from 'prop-types';
import { HeaderModalTitle } from 'strapi-helper-plugin';
import { get } from 'lodash';
import { AttributeIcon } from '@buffetjs/core';
import { FormattedMessage } from 'react-intl';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
// import useDataManager from '../../hooks/useDataManager';
// import ComponentIcon from './ComponentIcon';
// import Header from './Header';
import IconWrapper from './IconWrapper';
import UpperFirst from '../UpperFirst';

const ModalHeader = ({
  // category,
  headerId,
  headers,
  // iconType,
  // name,
  // target,
  // targetUid,
  // subCategory,
  // subTargetUid,
}) => {
  // const { modifiedData } = useDataManager();
  // const currentComponent = get(modifiedData, ['components', targetUid], {});
  // const shouldDisplayComponentCatInfos = target === 'components';
  // const currentComponentIcon = get(currentComponent, ['schema', 'icon'], '');
  console.log({ headers });
  // let iconName;

  // if (iconType === 'components') {
  //   iconName = 'component';
  // } else {
  //   iconName = iconType;
  // }

  return (
    <section>
      <HeaderModalTitle style={{ textTransform: 'none' }}>
        {/* {shouldDisplayComponentCatInfos ? (
          <ComponentIcon isSelected>
            <FontAwesomeIcon icon={currentComponentIcon} />
          </ComponentIcon>
        ) : (
          <AttributeIcon
            type={iconName}
            style={{ margin: 'auto 20px auto 0' }}
          />
        )} */}
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
            if (index === 0) {
              return (
                <Fragment key={index}>
                  <AttributeIcon
                    type={get(header, ['icon', 'name'], '')}
                    style={{ margin: 'auto 20px auto 0' }}
                  />
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
                <AttributeIcon
                  type={get(header, ['icon', 'name'], '')}
                  style={{ margin: 'auto 20px auto 0' }}
                />
                <span>
                  <UpperFirst content={get(header, ['label'], '')} />
                </span>
              </Fragment>
            );
          })}
        {/* {!headerId && (
          <Header
            category={category}
            name={name}
            target={target}
            targetUid={targetUid}
            subCategory={subCategory}
            subTargetUid={subTargetUid}
          />
        )} */}
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
