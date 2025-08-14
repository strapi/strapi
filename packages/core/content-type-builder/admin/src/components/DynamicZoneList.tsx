import { ComponentType, useState } from 'react';

import { Box, Flex, Typography } from '@strapi/design-system';
import { Plus } from '@strapi/icons';
import { useIntl } from 'react-intl';
import { styled } from 'styled-components';

import { getTrad } from '../utils/getTrad';

import { ComponentCard } from './ComponentCard';
import { ComponentList } from './ComponentList';
import { ComponentRow } from './ComponentRow';
import { useDataManager } from './DataManager/useDataManager';

import type { Internal, Struct } from '@strapi/types';

interface DynamicZoneListProps {
  addComponent: (name?: string) => void;
  components: Array<Internal.UID.Component>;
  customRowComponent?: ComponentType<any>;
  name?: string;
  forTarget: Struct.ModelType;
  targetUid: Internal.UID.Schema;
  disabled?: boolean;
}

const StyledAddIcon = styled(Plus)<{ disabled?: boolean }>`
  width: 3.2rem;
  height: 3.2rem;
  padding: 0.9rem;
  border-radius: 6.4rem;
  background: ${({ theme, disabled }) =>
    disabled ? theme.colors.neutral100 : theme.colors.primary100};
  path {
    fill: ${({ theme, disabled }) =>
      disabled ? theme.colors.neutral600 : theme.colors.primary600};
  }
`;

const ComponentStack = styled(Flex)`
  flex-shrink: 0;
  width: 14rem;
  height: 8rem;
  justify-content: center;
  align-items: center;
`;

export const DynamicZoneList = ({
  components = [],
  addComponent,
  name,
  forTarget,
  targetUid,
  disabled = false,
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
    <ComponentRow className="dynamiczone-row" $isFromDynamicZone>
      <Box>
        <Box padding={2} paddingLeft="104px">
          <Flex role="tablist" gap={2} wrap="wrap">
            {isInDevelopmentMode && (
              <button
                type="button"
                onClick={handleClickAdd}
                disabled={disabled}
                style={{
                  cursor: disabled ? 'not-allowed' : 'pointer',
                }}
              >
                <ComponentStack direction="column" alignItems="stretch" gap={1}>
                  <StyledAddIcon disabled={disabled} />
                  <Typography
                    variant="pi"
                    fontWeight="bold"
                    textColor={disabled ? 'neutral600' : 'primary600'}
                  >
                    {formatMessage({
                      id: getTrad('button.component.add'),
                      defaultMessage: 'Add a component',
                    })}
                  </Typography>
                </ComponentStack>
              </button>
            )}
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
                  forTarget={forTarget}
                  targetUid={targetUid}
                  disabled={disabled}
                />
              );
            })}
          </Flex>
        </Box>
        <Box>
          {components.map((component, index) => {
            return (
              <Box
                id={`dz-${name}-panel-${index}`}
                role="tabpanel"
                aria-labelledby={`dz-${name}-tab-${index}`}
                key={component}
                style={{ display: activeTab === index ? 'block' : 'none' }}
              >
                <ComponentList isFromDynamicZone component={component} key={component} />
              </Box>
            );
          })}
        </Box>
      </Box>
    </ComponentRow>
  );
};
