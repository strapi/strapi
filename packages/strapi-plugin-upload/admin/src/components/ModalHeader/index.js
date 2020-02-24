/*
 * NOTE:
 * This component should be put in the strapi-helper-plugin
 * at some point so the other packages can benefits from the updates
 *
 *
 */

import React, { Fragment } from 'react';
import PropTypes from 'prop-types';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { HeaderModalTitle } from 'strapi-helper-plugin';
import ModalSection from '../ModalSection';
import Text from '../Text';
import BackButton from './BackButton';
import Wrapper from './Wrapper';

const ModalHeader = ({ goBack, headers, withBackButton }) => {
  return (
    <Wrapper>
      <ModalSection>
        <HeaderModalTitle>
          {withBackButton && <BackButton onClick={goBack} type="button" />}
          {headers.map(({ key, element }, index) => {
            const shouldDisplayChevron = index < headers.length - 1;

            return (
              <Fragment key={key}>
                {element}
                {shouldDisplayChevron && (
                  <Text as="span" fontSize="xs" color="#919bae">
                    <FontAwesomeIcon
                      icon="chevron-right"
                      style={{ margin: '0 10px' }}
                    />
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
  headers: [],
  withBackButton: false,
};

ModalHeader.propTypes = {
  goBack: PropTypes.func,
  headers: PropTypes.array,
  withBackButton: PropTypes.bool,
};

export default ModalHeader;
