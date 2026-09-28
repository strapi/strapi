/**
 *
 * FormModal
 *
 */

import * as React from 'react';

import { Button, Flex, Grid, Modal, Breadcrumbs, Crumb } from '@strapi/design-system';
import { Form, Formik } from 'formik';
import { useIntl } from 'react-intl';

import Input from './Input';

/**
 * @param {{
 *   headerBreadcrumbs: string[],
 *   initialData?: object | null,
 *   isSubmiting: boolean,
 *   layout: { form?: unknown[][], schema?: object },
 *   isOpen: boolean,
 *   onSubmit: Function,
 *   onToggle: Function,
 *   providerToEditName?: string | null,
 * }} props
 */
const FormModal = ({
  headerBreadcrumbs,
  initialData = null,
  isSubmiting,
  layout,
  isOpen,
  onSubmit,
  onToggle,
  providerToEditName = null,
}) => {
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
                                error={errors[input.name]}
                                onChange={handleChange}
                                value={values[input.name]}
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
                  <Button type="submit" loading={isSubmiting}>
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

export default FormModal;
