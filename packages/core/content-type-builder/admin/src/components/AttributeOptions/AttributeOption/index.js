/**
 *
 * AttributeOption
 *
 */

import React from 'react';
import PropTypes from 'prop-types';
import { useIntl } from 'react-intl';
import { useHistory } from 'react-router-dom';
import { useTracking, useQueryParams } from '@strapi/helper-plugin';
import { Box } from '@strapi/parts/Box';
import { Row } from '@strapi/parts/Row';
import { Text } from '@strapi/parts/Text';
import getTrad from '../../../utils/getTrad';
import makeSearch from '../../../utils/makeSearch';
import AttributeIcon from '../../AttributeIcon';
import BoxWrapper from './BoxWrapper';

const AttributeOption = ({ type }) => {
  const { push } = useHistory();
  const { trackUsage } = useTracking();
  const { formatMessage } = useIntl();
  const [{ query }] = useQueryParams();

  const handleClick = () => {
    // FIXME refacto
    const forTarget = query.forTarget || null;
    const targetUid = query.targetUid || null;

    const search = makeSearch({
      modalType: 'attribute',
      actionType: 'create',
      settingType: 'base',
      forTarget,
      targetUid,
      attributeType: type,
      step: type === 'component' ? '1' : null,
    });

    if (forTarget === 'contentType') {
      trackUsage('didSelectContentTypeFieldType', { type });
    }

    push({
      search,
    });
  };

  return (
    <BoxWrapper padding={4} as="button" hasRadius type="button" onClick={handleClick}>
      <Row>
        <AttributeIcon type={type} />
        <Box paddingLeft={4}>
          <Row>
            <Text bold>
              {formatMessage({ id: getTrad(`attribute.${type}`), defaultMessage: type })}
            </Text>
          </Row>

          <Row>
            <Text small textColor="neutral600">
              {formatMessage({ id: getTrad(`attribute.${type}.description`) })}
            </Text>
          </Row>
        </Box>
      </Row>
    </BoxWrapper>
  );
};

AttributeOption.defaultProps = {
  type: 'text',
};

AttributeOption.propTypes = {
  type: PropTypes.string,
};

export default AttributeOption;
