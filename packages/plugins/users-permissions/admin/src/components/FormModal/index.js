/**
 *
 * FormModal
 *
 */

import React from 'react';
import { useIntl } from 'react-intl';
import {
  Stack,
  Grid,
  GridItem,
  ModalLayout,
  ModalHeader,
  ModalFooter,
  ModalBody,
  Button,
  Breadcrumbs,
  Crumb,
} from '@strapi/parts';
import PropTypes from 'prop-types';
// import { getTrad } from '../../../utils';

const FormModal = ({ headerBreadcrumbs, layout, isOpen, onToggle }) => {
  const { formatMessage } = useIntl();

  console.log({ fo: layout.form });

  if (!isOpen) {
    return null;
  }

  return (
    <ModalLayout onClose={onToggle} labelledBy="title">
      <ModalHeader>
        <Breadcrumbs label={headerBreadcrumbs.join(', ')}>
          {headerBreadcrumbs.map(crumb => (
            <Crumb key={crumb}>{crumb}</Crumb>
          ))}
        </Breadcrumbs>
      </ModalHeader>
      <ModalBody>
        <Stack size={1}>
          <Grid gap={5}>
            {layout.form.map(row => {
              return row.map(input => {
                console.log({ input });

                return (
                  <GridItem key={input.name} col={input.size} xs={12}>
                    {input.intlLabel.id}
                    {/* <Inputs
                      {...input}
                      // customInputs={{ string: () => "TEXT CUSTOM" }}
                      error={formErrors?.[input.name]}
                      onChange={handleChange}
                      value={modifiedData[input.name]}
                    /> */}
                  </GridItem>
                );
              });
            })}
          </Grid>
        </Stack>
      </ModalBody>
      <ModalFooter
        startActions={
          <Button variant="tertiary" onClick={onToggle} type="button">
            {formatMessage({ id: 'app.components.Button.cancel', defaultMessage: 'Cancel' })}
          </Button>
        }
        endActions={
          <>
            <Button>
              {formatMessage({ id: 'app.components.Button.save', defaultMessage: 'Save' })}
            </Button>
          </>
        }
      />
    </ModalLayout>
  );
};

FormModal.propTypes = {
  headerBreadcrumbs: PropTypes.arrayOf(PropTypes.string).isRequired,
  layout: PropTypes.shape({
    form: PropTypes.arrayOf(PropTypes.array),
    schema: PropTypes.object,
  }).isRequired,
  isOpen: PropTypes.bool.isRequired,
  onToggle: PropTypes.func.isRequired,
};

export default FormModal;
