import { Box, Flex, Typography } from '@strapi/design-system';
import { WarningCircle } from '@strapi/icons';

interface AlertProps {
  title: string;
  variant?: 'danger' | 'warning';
}

const COLORS = {
  danger: {
    background: 'danger100',
    borderColor: 'danger200',
    textColor: 'danger700',
  },
  warning: {
    background: 'warning100',
    borderColor: 'warning200',
    textColor: 'warning600',
  },
};

export const Alert = ({ title, variant = 'danger' }: AlertProps) => {
  return (
    <Box
      padding={3}
      background={COLORS[variant].background}
      borderColor={COLORS[variant].borderColor}
      hasRadius
      width="100%"
    >
      <Flex gap={2}>
        <WarningCircle style={{ minWidth: '16px' }} fill={COLORS[variant].textColor} />
        <Typography variant="omega" textColor={COLORS[variant].textColor}>
          {title}
        </Typography>
      </Flex>
    </Box>
  );
};
