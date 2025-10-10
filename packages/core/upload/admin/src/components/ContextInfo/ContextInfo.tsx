import { Box, Flex, Grid, Typography } from '@strapi/design-system';

interface ContextInfoProps {
  blocks: { label: string; value: string | number | null }[];
}

export const ContextInfo = ({ blocks }: ContextInfoProps) => {
  return (
    <Box
      hasRadius
      paddingLeft={6}
      paddingRight={6}
      paddingTop={4}
      paddingBottom={4}
      background="neutral100"
    >
      <Grid.Root gap={4}>
        {blocks.map(({ label, value }) => (
          <Grid.Item col={6} xs={12} key={label} direction="column" alignItems="stretch">
            <Flex direction="column" alignItems="stretch" gap={1}>
              <Typography variant="sigma" textColor="neutral600">
                {label}
              </Typography>
              <Typography variant="pi" textColor="neutral700">
                {value}
              </Typography>
            </Flex>
          </Grid.Item>
        ))}
      </Grid.Root>
    </Box>
  );
};
