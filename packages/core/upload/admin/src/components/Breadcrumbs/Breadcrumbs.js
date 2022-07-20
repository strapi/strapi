import React from 'react';
import { NavLink } from 'react-router-dom';

import {
  Crumb,
  CrumbLink,
  CrumbSimpleMenu,
  Breadcrumbs as BaseBreadcrumbs,
} from '@strapi/design-system/v2/Breadcrumbs';

import { BreadcrumbsDefinition } from '../../constants';

export const Breadcrumbs = ({ breadcrumbs, ...props }) => (
  <BaseBreadcrumbs as="nav" {...props}>
    {breadcrumbs.map((crumb, index) => {
      if (Array.isArray(crumb)) {
        return <CrumbSimpleMenu label="..." key={`breadcrumb-${crumb?.id ?? 'root'}`} />;
      }

      if (crumb.href) {
        return (
          <CrumbLink key={`breadcrumb-${crumb?.id ?? 'root'}`} as={NavLink} to={crumb.href}>
            {crumb.label}
          </CrumbLink>
        );
      }

      return (
        <Crumb
          key={`breadcrumb-${crumb?.id ?? 'root'}`}
          isCurrent={index + 1 === breadcrumbs.length}
        >
          {crumb.label}
        </Crumb>
      );
    })}
  </BaseBreadcrumbs>
);

Breadcrumbs.propTypes = {
  breadcrumbs: BreadcrumbsDefinition.isRequired,
};
