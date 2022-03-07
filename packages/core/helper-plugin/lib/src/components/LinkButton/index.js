import React from 'react';
import { NavLink } from 'react-router-dom';
import { LinkButton as DSLinkButton } from '@strapi/design-system/LinkButton';

const LinkButton = props => <DSLinkButton {...props} as={NavLink} />;

export default LinkButton;
