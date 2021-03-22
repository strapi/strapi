import React from 'react';
import PropTypes from 'prop-types';
import styled from 'styled-components';
import useInjectionZone from './useInjectionZone';

const ListItem = styled.li`
  font-size: ${p => p.theme.main.sizes.fonts.md};

  &::marker {
    color: ${p => p.theme.main.colors.grey};
  }
`;

const InjectionZoneList = ({ area, ...props }) => {
  const compos = useInjectionZone(area);

  if (!compos) {
    return null;
  }

  return (
    <ul>
      {compos.map(compo => (
        <ListItem key={compo.name}>
          <compo.Component {...props} />
        </ListItem>
      ))}
    </ul>
  );
};

InjectionZoneList.propTypes = {
  area: PropTypes.string.isRequired,
};

export default InjectionZoneList;
