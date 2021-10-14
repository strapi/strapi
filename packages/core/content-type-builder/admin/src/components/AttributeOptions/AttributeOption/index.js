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
    const header_label_1 = query.header_label_1 || null;
    const header_info_category_1 = query.header_info_category_1 || null;
    const header_info_name_1 = query.header_info_name_1 || null;
    const header_label_2 = query.header_label_2 || null;
    const header_info_category_2 = query.header_info_category_2 || null;
    const header_info_name_2 = query.header_info_name_2 || null;
    const header_label_3 = query.header_label_3 || null;
    const header_info_category_3 = query.header_info_category_3 || null;
    const header_info_name_3 = query.header_info_name_3 || null;
    const header_label_4 = query.header_label_4 || null;
    const header_info_category_4 = query.header_info_category_4 || null;
    const header_info_name_4 = query.header_info_name_4 || null;

    const search = makeSearch({
      modalType: 'attribute',
      actionType: 'create',
      settingType: 'base',
      forTarget,
      targetUid,
      attributeType: type,
      step: type === 'component' ? '1' : null,

      header_label_1,
      header_info_name_1,
      header_info_category_1,
      header_label_2,
      header_info_name_2,
      header_info_category_2,
      header_label_3,
      header_info_name_3,
      header_info_category_3,
      header_label_4,
      header_info_name_4,
      header_info_category_4,
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
