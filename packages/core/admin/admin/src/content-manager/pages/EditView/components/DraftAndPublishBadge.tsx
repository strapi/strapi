import { Box, Flex, Typography } from '@strapi/design-system';
import { pxToRem, useCMEditViewDataManager } from '@strapi/helper-plugin';
import { Dot } from '@strapi/icons';
import { useIntl } from 'react-intl';
import styled, { DefaultTheme } from 'styled-components';

import { getTranslation } from '../../../utils/translations';

const DraftAndPublishBadge = () => {
  const { initialData, hasDraftAndPublish } = useCMEditViewDataManager();
  const { formatMessage } = useIntl();

  if (!hasDraftAndPublish) {
    return null;
  }

  const isPublished = typeof initialData.publishedAt === 'string';

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
  } as const;

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
              id: getTranslation('containers.Edit.information.editing'),
              defaultMessage: 'Editing',
            })}
            &nbsp;
          </Typography>
          <Typography fontWeight="bold" textColor={colorProps.textColor}>
            {isPublished &&
              formatMessage({
                id: getTranslation('containers.Edit.information.publishedVersion'),
                defaultMessage: 'published version',
              })}
            {!isPublished &&
              formatMessage({
                id: getTranslation('containers.Edit.information.draftVersion'),
                defaultMessage: 'draft version',
              })}
          </Typography>
        </Box>
      </Box>
    </Box>
  );
};

const CustomBullet = styled(Dot)<{ $bulletColor: keyof DefaultTheme['colors'] }>`
  width: ${pxToRem(6)};
  height: ${pxToRem(6)};
  * {
    fill: ${({ theme, $bulletColor }) => theme.colors[$bulletColor]};
  }
`;

export { DraftAndPublishBadge };
