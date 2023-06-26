import React from 'react';

import { Box, Flex, Typography } from '@strapi/design-system';
import { pxToRem } from '@strapi/helper-plugin';
import { Dot } from '@strapi/icons';
import PropTypes from 'prop-types';
import { useIntl } from 'react-intl';
import styled from 'styled-components';

import { getTrad } from '../../../utils';

import { connect, select } from './utils';

const CustomBullet = styled(Dot)`
  width: ${pxToRem(6)};
  height: ${pxToRem(6)};
  * {
    fill: ${({ theme, $bulletColor }) => theme.colors[$bulletColor]};
  }
`;

const DraftAndPublishBadge = ({ hasDraftAndPublish, isPublished }) => {
  const { formatMessage } = useIntl();

  if (!hasDraftAndPublish) {
    return null;
  }

  const colors = {
    draft: {
      textColor: 'secondary700',
      bulletColor: 'secondary600',
      box: {
        background: 'secondary100',
        borderColor: 'secondary200',
      },
    },
    published: {
      textColor: 'success700',
      bulletColor: 'success600',
      box: {
        background: 'success100',
        borderColor: 'success200',
      },
    },
  };
  const colorProps = isPublished ? colors.published : colors.draft;

  return (
    <Box
      hasRadius
      as="aside"
      paddingTop={4}
      paddingBottom={4}
      paddingLeft={5}
      paddingRight={5}
      {...colorProps.box}
    >
      <Box as={Flex}>
        <CustomBullet $bulletColor={colorProps.bulletColor} />
        <Box paddingLeft={3}>
          <Typography textColor={colorProps.textColor}>
            {formatMessage({
              id: getTrad('containers.Edit.information.editing'),
              defaultMessage: 'Editing',
            })}
            &nbsp;
          </Typography>
          <Typography fontWeight="bold" textColor={colorProps.textColor}>
            {isPublished &&
              formatMessage({
                id: getTrad('containers.Edit.information.publishedVersion'),
                defaultMessage: 'published version',
              })}
            {!isPublished &&
              formatMessage({
                id: getTrad('containers.Edit.information.draftVersion'),
                defaultMessage: 'draft version',
              })}
          </Typography>
        </Box>
      </Box>
    </Box>
  );
};

DraftAndPublishBadge.propTypes = {
  hasDraftAndPublish: PropTypes.bool.isRequired,
  isPublished: PropTypes.bool.isRequired,
};

export default connect(DraftAndPublishBadge, select);
export { DraftAndPublishBadge };
