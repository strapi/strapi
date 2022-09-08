import React from 'react';
import { NavLink } from 'react-router-dom';
import { Link as DSLink } from '@strapi/design-system/v2/Link';

const Link = (props) => <DSLink {...props} as={NavLink} />;

export default Link;
