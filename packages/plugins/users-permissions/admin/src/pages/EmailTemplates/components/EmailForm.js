import React from 'react';
import PropTypes from 'prop-types';
import { useIntl } from 'react-intl';
import { Form, GenericInput } from '@strapi/helper-plugin';
import { Formik } from 'formik';
import {
  ModalLayout,
  ModalHeader,
  ModalFooter,
  ModalBody,
  Grid,
  GridItem,
  Button,
  Breadcrumbs,
  Crumb,
  Textarea,
} from '@strapi/design-system';
import { getTrad } from '../../../utils';
import schema from '../utils/schema';

const EmailForm = ({ template, onToggle, onSubmit }) => {
  const { formatMessage } = useIntl();

  return (
    <ModalLayout
      onClose={onToggle}
      labelledBy={`${formatMessage({
        id: getTrad('PopUpForm.header.edit.email-templates'),
        defaultMessage: 'Edit email template',
      })}, ${formatMessage({ id: getTrad(template.display), defaultMessage: template.display })}`}
    >
      <ModalHeader>
        <Breadcrumbs
          label={`${formatMessage({
            id: getTrad('PopUpForm.header.edit.email-templates'),
            defaultMessage: 'Edit email template',
          })}, ${formatMessage({
            id: getTrad(template.display),
            defaultMessage: template.display,
          })}`}
        >
          <Crumb>
            {formatMessage({
              id: getTrad('PopUpForm.header.edit.email-templates'),
              defaultMessage: 'Edit email template',
            })}
          </Crumb>
          <Crumb>
            {formatMessage({ id: getTrad(template.display), defaultMessage: template.display })}
          </Crumb>
        </Breadcrumbs>
      </ModalHeader>
      <Formik
        onSubmit={onSubmit}
        initialValues={template}
        validateOnChange={false}
        validationSchema={schema}
        enableReinitialize
      >
        {({ errors, values, handleChange, isSubmitting }) => {
          return (
            <Form>
              <ModalBody>
                <Grid gap={5}>
                  <GridItem col={6} s={12}>
                    <GenericInput
                      intlLabel={{
                        id: getTrad('PopUpForm.Email.options.from.name.label'),
                        defaultMessage: 'Shipper name',
                      }}
                      name="options.from.name"
                      onChange={handleChange}
                      value={values.options.from.name}
                      error={errors?.options?.from?.name}
                      type="text"
                    />
                  </GridItem>
                  <GridItem col={6} s={12}>
                    <GenericInput
                      intlLabel={{
                        id: getTrad('PopUpForm.Email.options.from.email.label'),
                        defaultMessage: 'Shipper email',
                      }}
                      name="options.from.email"
                      onChange={handleChange}
                      value={values.options.from.email}
                      error={errors?.options?.from?.email}
                      type="text"
                    />
                  </GridItem>
                  <GridItem col={6} s={12}>
                    <GenericInput
                      intlLabel={{
                        id: getTrad('PopUpForm.Email.options.response_email.label'),
                        defaultMessage: 'Response email',
                      }}
                      name="options.response_email"
                      onChange={handleChange}
                      value={values.options.response_email}
                      error={errors?.options?.response_email}
                      type="text"
                    />
                  </GridItem>
                  <GridItem col={6} s={12}>
                    <GenericInput
                      intlLabel={{
                        id: getTrad('PopUpForm.Email.options.object.label'),
                        defaultMessage: 'Subject',
                      }}
                      name="options.object"
                      onChange={handleChange}
                      value={values.options.object}
                      error={errors?.options?.object}
                      type="text"
                    />
                  </GridItem>
                  <GridItem col={12} s={12}>
                    <Textarea
                      label={formatMessage({
                        id: getTrad('PopUpForm.Email.options.message.label'),
                        defaultMessage: 'Message',
                      })}
                      name="options.message"
                      onChange={handleChange}
                      value={values.options.message}
                      error={
                        errors?.options?.message &&
                        formatMessage({
                          id: errors.options.message,
                          defaultMessage: errors.options.message,
                        })
                      }
                    />
                  </GridItem>
                </Grid>
              </ModalBody>
              <ModalFooter
                startActions={
                  <Button onClick={onToggle} variant="tertiary">
                    Cancel
                  </Button>
                }
                endActions={
                  <Button loading={isSubmitting} type="submit">
                    Finish
                  </Button>
                }
              />
            </Form>
          );
        }}
      </Formik>
    </ModalLayout>
  );
};

EmailForm.propTypes = {
  template: PropTypes.shape({
    display: PropTypes.string,
    icon: PropTypes.string,
    options: PropTypes.shape({
      from: PropTypes.shape({
        name: PropTypes.string,
        email: PropTypes.string,
      }),
      message: PropTypes.string,
      object: PropTypes.string,
      response_email: PropTypes.string,
    }),
  }).isRequired,
  onSubmit: PropTypes.func.isRequired,
  onToggle: PropTypes.func.isRequired,
};

export default EmailForm;
