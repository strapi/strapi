import React from 'react';
import PropTypes from 'prop-types';
import { CommandGroup } from 'cmdk';
import { Typography } from '@strapi/design-system';

const Group = ({ children, heading, ...rest }) => {
  return (
    <CommandGroup
      heading={
        <Typography as="span" variant="sigma" textColor="neutral600">
          {heading}
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
