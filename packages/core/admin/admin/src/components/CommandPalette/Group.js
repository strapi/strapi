import React from 'react';
import PropTypes from 'prop-types';
import { CommandGroup } from 'cmdk';
import { Typography } from '@strapi/design-system';
import { useIntl } from 'react-intl';

const Group = ({ children, heading, ...rest }) => {
  const { formatMessage } = useIntl();

  return (
    <CommandGroup
      heading={
        <Typography as="span" variant="sigma" textColor="neutral600">
          {formatMessage({ id: heading })}
        </Typography>
      }
      {...rest}
    >
      {children}
    </CommandGroup>
  );
};

Group.propTypes = {
  children: PropTypes.node.isRequired,
  heading: PropTypes.node.isRequired,
};

export default Group;
