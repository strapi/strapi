import React from 'react';
import PropTypes from 'prop-types';
import styled from 'styled-components';
import { useInjectionZone } from '../../../shared/hooks';

const List = styled.ul`
  list-style-type: none;
  margin: 0;
  padding: 0;
`;

const ListItem = styled.li`
  font-size: ${p => p.theme.main.sizes.fonts.md};

  &:before {
    background: ${p => p.theme.main.colors.grey};
    width: 4px;
    height: 4px;
    content: '';
    position: absolute;
    border-radius: 50%;
    margin-left: -${p => p.theme.main.sizes.margins.sm};
    margin-top: 8px;
  }
`;

const InjectionZoneList = ({ area, ...props }) => {
  const compos = useInjectionZone(area);

  if (!compos) {
    return null;
  }

  return (
    <List>
      {compos.map(compo => {
        const component = compo.Component(props);

        if (component) {
          return (
            <ListItem key={compo.name}>
              <compo.Component {...props} />
            </ListItem>
          );
        }

        return null;
      })}
    </List>
  );
};

InjectionZoneList.propTypes = {
  area: PropTypes.string.isRequired,
};

export default InjectionZoneList;
