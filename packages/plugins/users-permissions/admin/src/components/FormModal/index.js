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
import Input from './Input';
// import { getTrad } from '../../../utils';

const FormModal = ({ headerBreadcrumbs, layout, isOpen, onToggle, providerToEditName }) => {
  const { formatMessage } = useIntl();

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
        <form onSubmit={e => e.preventDefault()}>
          <Stack size={1}>
            <Grid gap={5}>
              {layout.form.map(row => {
                return row.map(input => {
                  return (
                    <GridItem key={input.name} col={input.size} xs={12}>
                      <Input {...input} providerToEditName={providerToEditName} />
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
        </form>
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

FormModal.defaultProps = {
  providerToEditName: null,
};

FormModal.propTypes = {
  headerBreadcrumbs: PropTypes.arrayOf(PropTypes.string).isRequired,
  layout: PropTypes.shape({
    form: PropTypes.arrayOf(PropTypes.array),
    schema: PropTypes.object,
  }).isRequired,
  isOpen: PropTypes.bool.isRequired,
  onToggle: PropTypes.func.isRequired,
  providerToEditName: PropTypes.string,
};

export default FormModal;
