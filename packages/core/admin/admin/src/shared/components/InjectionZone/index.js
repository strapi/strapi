import React from 'react';

import PropTypes from 'prop-types';

import { useInjectionZone } from '../../hooks';

const InjectionZone = ({ area, ...props }) => {
  const compos = useInjectionZone(area);

  return compos.map((compo) => <compo.Component key={compo.name} {...props} />);
};

InjectionZone.propTypes = {
  area: PropTypes.string.isRequired,
};

export default InjectionZone;
