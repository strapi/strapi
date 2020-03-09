/*
 * NOTE:
 * This component should be put in the strapi-helper-plugin
 * at some point so the other packages can benefits from the updates
 *
 *
 */

import React, { Fragment } from 'react';
import PropTypes from 'prop-types';
import { FormattedMessage } from 'react-intl';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { HeaderModalTitle } from 'strapi-helper-plugin';
import ModalSection from '../ModalSection';
import Text from '../Text';
import BackButton from './BackButton';
import Wrapper from './Wrapper';

const ModalHeader = ({ goBack, headerBreadcrumbs, withBackButton, HeaderComponent }) => {
  const translatedHeaders = headerBreadcrumbs
    ? headerBreadcrumbs.map(headerTrad => ({
      key: headerTrad,
      element: <FormattedMessage id={headerTrad} />,
    }))
    : null;

  return (
    <Wrapper>
      <ModalSection>
        <HeaderModalTitle>
          {withBackButton && <BackButton onClick={goBack} type="button" />}
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
  goBack: () => {},
  headerBreadcrumbs: [],
  withBackButton: false,
  HeaderComponent: null,
};

ModalHeader.propTypes = {
  goBack: PropTypes.func,
  headerBreadcrumbs: PropTypes.array,
  withBackButton: PropTypes.bool,
  HeaderComponent: PropTypes.elementType,
};

export default ModalHeader;
