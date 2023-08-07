import React from 'react';

import { Link as DSLink } from '@strapi/design-system/v2';
import { NavLink } from 'react-router-dom';

const Link = (props) => <DSLink {...props} as={NavLink} />;

export { Link };
