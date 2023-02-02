import React from 'react';
import PropTypes from 'prop-types';
import { Box } from '@strapi/design-system/Box';
import { useInjectionZone } from '../../../shared/hooks';

const InjectionZoneList = ({ area, ...props }) => {
  const compos = useInjectionZone(area);

  if (!compos) {
    return null;
  }

  // TODO
  return (
    <ul>
      {compos.map((compo) => {
        const component = compo.Component(props);

        if (component) {
          return (
            <Box key={compo.name} padding={3} style={{ textAlign: 'center' }}>
              <compo.Component {...props} />
            </Box>
          );
        }

        return null;
      })}
    </ul>
  );
};

InjectionZoneList.propTypes = {
  area: PropTypes.string.isRequired,
};

export default InjectionZoneList;
