import PropTypes from 'prop-types';
import React from 'react';

import { BreadcrumbsDefinition, CrumbMenuDefinition, CrumbDefinition } from '../../constants';

const CrumbSwitch = ({ crumb }) => {
  if (Array.isArray(crumb)) {
    // <CrumbSimpleMenu />
    return <button type="button">...</button>;
  }

  if (crumb.href) {
    // <CrumbLink />
    return <a href={crumb.href}>{crumb.label}</a>;
  }

  // <CrumbLink isCurrent />
  return <em aria-current>{crumb.label}</em>;
};

CrumbSwitch.propTypes = {
  crumb: PropTypes.oneOfType([CrumbMenuDefinition, CrumbDefinition]).isRequired,
};

export const Breadcrumbs = ({ breadcrumbs, ...props }) => (
  <ol {...props}>
    {breadcrumbs.map(crumb => (
      <li key={`breadcrumb-${crumb?.id ?? 'root'}`}>
        <CrumbSwitch crumb={crumb} />
      </li>
    ))}
  </ol>
);

Breadcrumbs.propTypes = {
  breadcrumbs: PropTypes.arrayOf(BreadcrumbsDefinition).isRequired,
};
