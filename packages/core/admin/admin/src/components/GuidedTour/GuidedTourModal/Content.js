import React from 'react';
import PropTypes from 'prop-types';
import { Stack } from '@strapi/design-system/Stack';
import { Typography } from '@strapi/design-system/Typography';
import { useIntl } from 'react-intl';

const Content = ({ id, defaultMessage }) => {
  const { formatMessage } = useIntl();

  return (
    <Stack size={5}>
      {formatMessage(
        { id, defaultMessage },
        {
          b: children => <Typography fontWeight="semiBold">{children}</Typography>,
          p: children => <Typography>{children}</Typography>,
        }
      )}
    </Stack>
  );
};

Content.propTypes = {
  id: PropTypes.string.isRequired,
  defaultMessage: PropTypes.string.isRequired,
};

export default Content;
