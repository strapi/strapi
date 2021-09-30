import React, { Fragment } from 'react';
import PropTypes from 'prop-types';
import { FormattedMessage } from 'react-intl';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { Text } from '@buffetjs/core';
import HeaderModalTitle from '../HeaderModalTitle';
import ModalSection from '../ModalSection';
import BackButton from './BackButton';
import Wrapper from './Wrapper';

const ModalHeader = ({ headerBreadcrumbs, onClickGoBack, withBackButton, HeaderComponent }) => {
  /* eslint-disable indent */
  const translatedHeaders = headerBreadcrumbs
    ? headerBreadcrumbs.map(headerTrad => ({
        key: headerTrad,
        element: <FormattedMessage id={headerTrad} defaultMessage={headerTrad} />,
      }))
    : null;
  /* eslint-enable indent */

  return (
    <Wrapper>
      <ModalSection>
        <HeaderModalTitle>
          {withBackButton && <BackButton onClick={onClickGoBack} type="button" />}
          {HeaderComponent && <HeaderComponent />}
          {translatedHeaders &&
            translatedHeaders.map(({ key, element }, index) => {
              const shouldDisplayChevron = index < translatedHeaders.length - 1;

              return (
                <Fragment key={key}>
                  {element}
                  {shouldDisplayChevron && (
                    <Text as="span" fontSize="xs" color="#919bae">
                      <FontAwesomeIcon icon="chevron-right" style={{ margin: '0 10px' }} />
                    </Text>
                  )}
                </Fragment>
              );
            })}
        </HeaderModalTitle>
      </ModalSection>
    </Wrapper>
  );
};

ModalHeader.defaultProps = {
  headerBreadcrumbs: [],
  onClickGoBack: () => {},
  withBackButton: false,
  HeaderComponent: null,
};

ModalHeader.propTypes = {
  headerBreadcrumbs: PropTypes.array,
  onClickGoBack: PropTypes.func,
  withBackButton: PropTypes.bool,
  HeaderComponent: PropTypes.elementType,
};

export default ModalHeader;
