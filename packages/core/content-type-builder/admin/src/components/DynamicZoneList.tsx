import { useState } from 'react';

import { Box, Flex, Typography } from '@strapi/design-system';
import { Plus } from '@strapi/icons';
import { useIntl } from 'react-intl';
import { styled } from 'styled-components';

import { useDataManager } from '../hooks/useDataManager';
import { getTrad } from '../utils/getTrad';

import { ComponentCard } from './ComponentCard';
import { ComponentList } from './ComponentList';
import { Tr } from './Tr';

import type { Internal } from '@strapi/types';

interface DynamicZoneListProps {
  addComponent: (name?: string) => void;
  components: Array<string>;
  customRowComponent?: () => void;
  name?: string;
  targetUid: Internal.UID.Component;
}

const StyledAddIcon = styled(Plus)`
  width: 3.2rem;
  height: 3.2rem;
  padding: 0.9rem;
  border-radius: 6.4rem;
  background: ${({ theme }) => theme.colors.primary100};
  path {
    fill: ${({ theme }) => theme.colors.primary600};
  }
`;

const FixedBox = styled(Box)`
  height: 9rem;
  position: absolute;
  width: 100%;
  top: 0;
  left: 0;
`;

const ScrollableStack = styled(Flex)`
  width: 100%;
  overflow-x: auto;
`;

const ComponentContentBox = styled(Box)`
  padding-top: 9rem;
`;

const ComponentStack = styled(Flex)`
  flex-shrink: 0;
  width: 14rem;
  height: 8rem;
  justify-content: center;
  align-items: center;
`;

export const DynamicZoneList = ({
  customRowComponent,
  components = [],
  addComponent,
  name,
  targetUid,
}: DynamicZoneListProps) => {
  const { isInDevelopmentMode } = useDataManager();
  const [activeTab, setActiveTab] = useState(0);
  const { formatMessage } = useIntl();

  const toggle = (tab: number) => {
    if (activeTab !== tab) {
      setActiveTab(tab);
    }
  };

  const handleClickAdd = () => {
    addComponent(name);
  };

  return (
    <Tr className="dynamiczone-row" $isFromDynamicZone>
      <td colSpan={12}>
        <FixedBox paddingLeft={8}>
          <ScrollableStack gap={2}>
            {isInDevelopmentMode && (
              <button type="button" onClick={handleClickAdd}>
                <ComponentStack direction="column" alignItems="stretch" gap={1}>
                  <StyledAddIcon />
                  <Typography variant="pi" fontWeight="bold" textColor="primary600">
                    {formatMessage({
                      id: getTrad('button.component.add'),
                      defaultMessage: 'Add a component',
                    })}
                  </Typography>
                </ComponentStack>
              </button>
            )}
            <Flex role="tablist" gap={2}>
              {components.map((component, index) => {
                return (
                  <ComponentCard
                    key={component}
                    dzName={name || ''}
                    index={index}
                    component={component}
                    isActive={activeTab === index}
                    isInDevelopmentMode={isInDevelopmentMode}
                    onClick={() => toggle(index)}
                  />
                );
              })}
            </Flex>
          </ScrollableStack>
        </FixedBox>
        <ComponentContentBox>
          {components.map((component, index) => {
            const props = {
              customRowComponent,
              component,
            };

            return (
              <Box
                id={`dz-${name}-panel-${index}`}
                role="tabpanel"
                aria-labelledby={`dz-${name}-tab-${index}`}
                key={component}
                style={{ display: activeTab === index ? 'block' : 'none' }}
              >
                <table>
                  <tbody>
                    <ComponentList
                      {...props}
                      isFromDynamicZone
                      component={targetUid}
                      key={component}
                    />
                  </tbody>
                </table>
              </Box>
            );
          })}
        </ComponentContentBox>
      </td>
    </Tr>
  );
};
