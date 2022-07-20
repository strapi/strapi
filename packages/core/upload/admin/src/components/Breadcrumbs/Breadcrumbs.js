import PropTypes from 'prop-types';
import React from 'react';

import { Crumb, CrumbLink, CrumbSimpleMenu } from '@strapi/design-system/v2/Breadcrumbs';

import { BreadcrumbsDefinition, CrumbMenuDefinition, CrumbDefinition } from '../../constants';

// eslint-disable-next-line react/prop-types
const CrumbSwitch = ({ crumb, isLast }) => {
  if (Array.isArray(crumb)) {
    return <CrumbSimpleMenu />;
  }

  if (crumb.href) {
    return <CrumbLink href={crumb.href}>{crumb.label}</CrumbLink>;
  }

  return <Crumb isCurrent={isLast}>{crumb.label}</Crumb>;
};

CrumbSwitch.propTypes = {
  crumb: PropTypes.oneOfType([CrumbMenuDefinition, CrumbDefinition]).isRequired,
};

export const Breadcrumbs = ({ breadcrumbs, ...props }) => (
  <nav>
    <ol {...props}>
      {breadcrumbs.map((crumb, index) => (
        <li key={`breadcrumb-${crumb?.id ?? 'root'}`}>
          <CrumbSwitch crumb={crumb} isLast={index + 1 === breadcrumbs.length} />
        </li>
      ))}
    </ol>
  </nav>
);

Breadcrumbs.propTypes = {
  breadcrumbs: BreadcrumbsDefinition.isRequired,
};
