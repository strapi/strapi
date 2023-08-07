import React from 'react';

import { LinkButton as DSLinkButton } from '@strapi/design-system/v2';
import { NavLink } from 'react-router-dom';

const LinkButton = (props) => <DSLinkButton {...props} as={NavLink} />;

export { LinkButton };
