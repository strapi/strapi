/**
 *
 * FormModal
 *
 */

import * as React from 'react';

import { Button, Flex, Grid, Modal, Breadcrumbs, Crumb } from '@strapi/design-system';
import { Form, Formik } from 'formik';
import { useIntl } from 'react-intl';

import { Input } from './Input/Input';

import type { ProviderFormValues, ProviderFormLayout } from '../../types';

export type FormModalProps = {
  headerBreadcrumbs: string[];
  initialData?: ProviderFormValues;
  isSubmitting: boolean;
  layout: ProviderFormLayout;
  isOpen: boolean;
  onSubmit: (values: ProviderFormValues) => void;
  onToggle: () => void;
  providerToEditName?: string;
};

/** Edits one authentication provider with its provider-specific form. */
const FormModal = ({
  headerBreadcrumbs,
  initialData = { enabled: false },
  isSubmitting,
  layout,
  isOpen,
  onSubmit,
  onToggle,
  providerToEditName = '',
}: FormModalProps) => {
  const { formatMessage } = useIntl();

  return (
    <Modal.Root open={isOpen} onOpenChange={onToggle}>
      <Modal.Content>
        <Modal.Header>
          <Breadcrumbs label={headerBreadcrumbs.join(', ')}>
            {headerBreadcrumbs.map((crumb, index, arr) => (
              <Crumb isCurrent={index === arr.length - 1} key={crumb}>
                {crumb}
              </Crumb>
            ))}
          </Breadcrumbs>
        </Modal.Header>
        <Formik
          onSubmit={(values) => onSubmit(values)}
          initialValues={initialData}
          validationSchema={layout.schema}
          validateOnChange={false}
        >
          {({ errors, handleChange, values }) => {
            return (
              <Form>
                <Modal.Body>
                  <Flex direction="column" alignItems="stretch" gap={1}>
                    <Grid.Root gap={5}>
                      {layout.form.map((row) => {
                        return row.map((input) => {
                          return (
                            <Grid.Item
                              key={input.name}
                              col={input.size}
                              xs={12}
                              direction="column"
                              alignItems="stretch"
                            >
                              <Input
                                {...input}
                                error={input.name === 'noName' ? undefined : errors[input.name]}
                                onChange={handleChange}
                                value={input.name === 'noName' ? undefined : values[input.name]}
                                providerToEditName={providerToEditName}
                              />
                            </Grid.Item>
                          );
                        });
                      })}
                    </Grid.Root>
                  </Flex>
                </Modal.Body>
                <Modal.Footer>
                  <Button variant="tertiary" onClick={onToggle} type="button">
                    {formatMessage({
                      id: 'app.components.Button.cancel',
                      defaultMessage: 'Cancel',
                    })}
                  </Button>
                  <Button type="submit" loading={isSubmitting}>
                    {formatMessage({ id: 'global.save', defaultMessage: 'Save' })}
                  </Button>
                </Modal.Footer>
              </Form>
            );
          }}
        </Formik>
      </Modal.Content>
    </Modal.Root>
  );
};

export { FormModal };
