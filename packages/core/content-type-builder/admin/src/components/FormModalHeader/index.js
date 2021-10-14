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
import useDataManager from '../../hooks/useDataManager';
import getTrad from '../../utils/getTrad';
import AttributeIcon from '../AttributeIcon';

const IconBox = styled(Box)`
  svg {
    color: ${({ theme }) => theme.colors.primary600};
  }
`;

const FormModalHeader = ({
  actionType,
  attributeType,
  contentTypeKind,
  forTarget,
  headers,
  modalType,
  targetUid,
}) => {
  const { formatMessage } = useIntl();
  const { modifiedData } = useDataManager();

  let icon;
  let isFontAwesomeIcon = false;

  if (modalType === 'chooseAttribute') {
    const schema = modifiedData[forTarget][targetUid] || modifiedData[forTarget];

    if (forTarget === 'components') {
      icon = schema.schema.icon;
      isFontAwesomeIcon = true;
    } else if (forTarget === 'component') {
      icon = 'component';
    } else {
      icon = schema.schema.kind;
    }
  }

  if (modalType === 'contentType') {
    icon = contentTypeKind;
  }

  if (['component', 'editCategory'].includes(modalType)) {
    icon = 'component';
  }

  if (modalType === 'addComponentToDynamicZone') {
    icon = 'dynamiczone';
  }

  if (modalType === 'attribute') {
    icon = attributeType;
  }

  const isCreatingMainSchema = ['component', 'contentType'].includes(modalType);

  if (isCreatingMainSchema) {
    let headerId = getTrad(`modalForm.component.header-${actionType}`);

    if (modalType === 'contentType') {
      headerId = getTrad(`modalForm.${contentTypeKind}.header-create`);
    }

    if (actionType === 'edit') {
      headerId = getTrad(`modalForm.header-edit`);
    }

    return (
      <ModalHeader>
        <Row>
          <Box>
            <AttributeIcon type={icon} />
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

  return (
    <ModalHeader>
      <Stack horizontal size={3}>
        {!isFontAwesomeIcon && <AttributeIcon type={icon} />}
        {isFontAwesomeIcon && (
          <IconBox>
            <FontAwesomeIcon icon={icon} />
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
  actionType: null,
  attributeType: null,
  contentTypeKind: null,
  targetUid: null,
};

FormModalHeader.propTypes = {
  actionType: PropTypes.string,
  attributeType: PropTypes.string,
  contentTypeKind: PropTypes.string,
  forTarget: PropTypes.oneOf(['contentType', 'component', 'components']).isRequired,
  headers: PropTypes.arrayOf(
    PropTypes.shape({
      icon: PropTypes.shape({ name: PropTypes.string, isCustom: PropTypes.bool }),
      label: PropTypes.string.isRequired,
    })
  ).isRequired,
  modalType: PropTypes.string.isRequired,
  targetUid: PropTypes.string,
};

export default FormModalHeader;
