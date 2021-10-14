/**
 *
 * FormModalHeader
 *
 */

import React from 'react';
import PropTypes from 'prop-types';
import { useIntl } from 'react-intl';
import upperFirst from 'lodash/upperFirst';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { Breadcrumbs, Crumb } from '@strapi/parts/Breadcrumbs';
import { ModalHeader } from '@strapi/parts/ModalLayout';
import { Box } from '@strapi/parts/Box';
import { Row } from '@strapi/parts/Row';
import { Stack } from '@strapi/parts/Stack';
import { ButtonText } from '@strapi/parts/Text';
import styled from 'styled-components';
import AttributeIcon from '../AttributeIcon';

const IconBox = styled(Box)`
  svg {
    color: ${({ theme }) => theme.colors.primary600};
  }
`;

const FormModalHeader = ({ headerId, headers }) => {
  const { formatMessage } = useIntl();

  // TODO refacto
  // Editing a content type or component
  if (headerId) {
    return (
      <ModalHeader>
        <Row>
          <Box>
            <AttributeIcon type={headers[0].icon.name} />
          </Box>
          <Box paddingLeft={3}>
            <ButtonText textColor="neutral800" as="h2" id="title">
              {formatMessage({ id: headerId }, { name: headers[0].label })}
            </ButtonText>
          </Box>
        </Row>
      </ModalHeader>
    );
  }

  const breadcrumbsLabel = headers.map(({ label }) => label).join(',');
  const { name, isCustom } = headers[0].icon;

  return (
    <ModalHeader>
      <Stack horizontal size={3}>
        {!isCustom && <AttributeIcon type={name} />}
        {isCustom && (
          <IconBox>
            <FontAwesomeIcon icon={name} />
          </IconBox>
        )}

        <Breadcrumbs label={breadcrumbsLabel}>
          {headers.map((header, index) => {
            const label = upperFirst(header.label);

            const key = `${header.label}.${index}`;

            if (header.info.category) {
              const content = `${label} (${upperFirst(header.info.category)} - ${upperFirst(
                header.info.name
              )})`;

              return <Crumb key={key}>{content}</Crumb>;
            }

            return <Crumb key={key}>{label}</Crumb>;
          })}
        </Breadcrumbs>
      </Stack>
    </ModalHeader>
  );
};

FormModalHeader.defaultProps = {
  headerId: null,
};

FormModalHeader.propTypes = {
  headerId: PropTypes.string,
  headers: PropTypes.arrayOf(
    PropTypes.shape({
      icon: PropTypes.shape({ name: PropTypes.string, isCustom: PropTypes.bool }),
      label: PropTypes.string.isRequired,
    })
  ).isRequired,
};

export default FormModalHeader;
