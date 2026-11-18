import { Box, Flex, SingleSelectOption, SingleSelect, Typography } from '@strapi/design-system';
import { useIntl } from 'react-intl';

interface PageSizeProps {
  onChangePageSize: (value: number) => void;
  pageSize: number;
}

export const PageSize = ({ onChangePageSize, pageSize }: PageSizeProps) => {
  const { formatMessage } = useIntl();

  const handleChange = (value: string | number) => {
    onChangePageSize(Number(value));
  };

  return (
    <Flex>
      <SingleSelect
        size="S"
        aria-label={formatMessage({
          id: 'components.PageFooter.select',
          defaultMessage: 'Entries per page',
        })}
        onChange={handleChange}
        value={pageSize.toString()}
      >
        <SingleSelectOption value="10">10</SingleSelectOption>
        <SingleSelectOption value="20">20</SingleSelectOption>
        <SingleSelectOption value="50">50</SingleSelectOption>
        <SingleSelectOption value="100">100</SingleSelectOption>
      </SingleSelect>
      <Box paddingLeft={2}>
        <Typography textColor="neutral600" tag="label" htmlFor="page-size">
          {formatMessage({
            id: 'components.PageFooter.select',
            defaultMessage: 'Entries per page',
          })}
        </Typography>
      </Box>
    </Flex>
  );
};
