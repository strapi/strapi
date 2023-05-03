import React from 'react';
import PropTypes from 'prop-types';
import useInjectionZone from './useInjectionZone';

const InjectionZone = ({ area, ...props }) => {
  const compos = useInjectionZone(area);

  if (!compos) {
    return null;
  }

  return compos.map((compo) => <compo.Component key={compo.name} {...props} />);
};

InjectionZone.propTypes = {
  area: PropTypes.string.isRequired,
};

export default InjectionZone;
