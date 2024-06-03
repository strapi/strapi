import * as React from 'react';

import { Accordion, Box, Flex, FlexComponent, Typography } from '@strapi/design-system';
import { useIntl } from 'react-intl';
import { styled } from 'styled-components';

import { ComponentIcon } from '../../../../../components/ComponentIcon';

interface ComponentCategoryProps {
  category: string;
  components?: Array<{
    uid: string;
    displayName: string;
    icon?: string;
  }>;
  onAddComponent: (
    componentUid: string
  ) => React.MouseEventHandler<HTMLButtonElement> & React.MouseEventHandler<HTMLDivElement>;
  variant?: Accordion.Variant;
}

const ComponentCategory = ({
  category,
  components = [],
  variant = 'primary',
  onAddComponent,
}: ComponentCategoryProps) => {
  const { formatMessage } = useIntl();

  return (
    <Accordion.Item value={category}>
      <Accordion.Header variant={variant}>
        <Accordion.Trigger>
          {formatMessage({ id: category, defaultMessage: category })}
        </Accordion.Trigger>
      </Accordion.Header>
      <Accordion.Content>
        <Grid paddingTop={4} paddingBottom={4} paddingLeft={3} paddingRight={3}>
          {components.map(({ uid, displayName, icon }) => (
            <ComponentBox
              key={uid}
              tag="button"
              type="button"
              background="neutral100"
              justifyContent="center"
              onClick={onAddComponent(uid)}
              hasRadius
              height="8.4rem"
              shrink={0}
              borderColor="neutral200"
            >
              <Flex direction="column" gap={1} alignItems="center" justifyContent="center">
                <ComponentIcon color="currentColor" background="primary200" icon={icon} />

                <Typography variant="pi" fontWeight="bold">
                  {displayName}
                </Typography>
              </Flex>
            </ComponentBox>
          ))}
        </Grid>
      </Accordion.Content>
    </Accordion.Item>
  );
};

const Grid = styled(Box)`
  display: grid;
  grid-template-columns: repeat(auto-fit, 14rem);
  grid-gap: ${({ theme }) => theme.spaces[1]};
`;

const ComponentBox = styled<FlexComponent<'button'>>(Flex)`
  color: ${({ theme }) => theme.colors.neutral600};
  cursor: pointer;

  @media (prefers-reduced-motion: no-preference) {
    transition: color 120ms ${(props) => props.theme.motion.easings.easeOutQuad};
  }

  &:focus,
  &:hover {
    border: 1px solid ${({ theme }) => theme.colors.primary200};
    background: ${({ theme }) => theme.colors.primary100};
    color: ${({ theme }) => theme.colors.primary600};
  }
`;

export { ComponentCategory };
export type { ComponentCategoryProps };
