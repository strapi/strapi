import { Box, Flex, Typography } from '@strapi/design-system';
import { WarningCircle } from '@strapi/icons';

interface AlertProps {
  title: string;
  variant?: 'danger';
}

const COLORS = {
  danger: {
    background: 'danger100',
    borderColor: 'danger200',
    textColor: 'danger700',
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
        <WarningCircle fill={COLORS[variant].textColor} />
        <Typography variant="omega" textColor={COLORS[variant].textColor}>
          {title}
        </Typography>
      </Flex>
    </Box>
  );
};
