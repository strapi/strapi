import React, { useMemo } from 'react';
import PropTypes from 'prop-types';
import { Accordion, AccordionContent, AccordionToggle, Box } from '@strapi/design-system';
import upperFirst from 'lodash/upperFirst';
import { useIntl } from 'react-intl';
import SubCategory from '../SubCategory';

const PermissionRow = ({
  childrenForm,
  kind,
  name,
  isOpen,
  isFormDisabled,
  isWhite,
  onOpenCategory,
  pathToData,
}) => {
  const { formatMessage } = useIntl();
  const handleClick = () => {
    onOpenCategory(name);
  };

  const categoryName = useMemo(() => {
    const split = name.split('::');

    return split.pop();
  }, [name]);

  return (
    <Accordion
      expanded={isOpen}
      onToggle={handleClick}
      id={`accordion-${name}`}
      variant={isWhite ? 'primary' : 'secondary'}
    >
      <AccordionToggle
        title={upperFirst(categoryName)}
        description={`${formatMessage(
          { id: 'Settings.permissions.category' },
          { category: categoryName }
        )} ${kind === 'plugins' ? 'plugin' : kind}`}
      />

      <AccordionContent>
        <Box padding={6}>
          {childrenForm.map(({ actions, subCategoryName, subCategoryId }) => (
            <SubCategory
              key={subCategoryName}
              actions={actions}
              categoryName={categoryName}
              isFormDisabled={isFormDisabled}
              subCategoryName={subCategoryName}
              pathToData={[...pathToData, subCategoryId]}
            />
          ))}
        </Box>
      </AccordionContent>
    </Accordion>
  );
};

PermissionRow.defaultProps = {};

PermissionRow.propTypes = {
  childrenForm: PropTypes.array.isRequired,
  isOpen: PropTypes.bool.isRequired,
  isFormDisabled: PropTypes.bool.isRequired,
  isWhite: PropTypes.bool.isRequired,
  kind: PropTypes.string.isRequired,
  name: PropTypes.string.isRequired,
  onOpenCategory: PropTypes.func.isRequired,
  pathToData: PropTypes.array.isRequired,
};

export default PermissionRow;
