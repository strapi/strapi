import React, { Fragment } from 'react';
import PropTypes from 'prop-types';
import { HeaderModalTitle } from 'strapi-helper-plugin';
import { get } from 'lodash';
import { FormattedMessage } from 'react-intl';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import UpperFirst from '../UpperFirst';
import ComponentIcon from './ComponentIcon';
import ComponentInfos from './ComponentInfos';
import Icon from './Icon';
import IconWrapper from './IconWrapper';
import DropdownInfos from './DropdownInfos';

/* eslint-disable react/no-array-index-key */

const ModalHeader = ({ headerId, headers }) => {
  const shouldDisplayDropDown = headers.length > 3;

  return (
    <section>
      <HeaderModalTitle style={{ textTransform: 'none' }}>
        {headerId && (
          <>
            <Icon type={get(headers, [0, 'icon', 'name'], '')} />
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
              <Icon type={iconType} />
            );

            if (shouldDisplayDropDown && index === 1) {
              return (
                <Fragment key={index}>
                  <IconWrapper>
                    <FontAwesomeIcon icon="chevron-right" />
                  </IconWrapper>
                  <DropdownInfos
                    headers={[headers[1], headers[2]]}
                    shouldDisplaySecondHeader={headers.length > 4}
                  />
                </Fragment>
              );
            }

            if (shouldDisplayDropDown && index === 2 && headers.length > 4) {
              return null;
            }

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
  headerId: '',
  headers: [],
};

ModalHeader.propTypes = {
  headerId: PropTypes.string,
  headers: PropTypes.array,
};

export default ModalHeader;
