import React from 'react';
import { useIntl } from 'react-intl';
import { Form } from '@strapi/helper-plugin';
import { Formik } from 'formik';
import { ModalLayout, ModalHeader, ModalFooter, ModalBody } from '@strapi/parts/ModalLayout';
import { Grid, GridItem } from '@strapi/parts/Grid';
import { Button } from '@strapi/parts/Button';
import { Breadcrumbs, Crumb } from '@strapi/parts/Breadcrumbs';
import { TextInput } from '@strapi/parts/TextInput';
import { Textarea } from '@strapi/parts/Textarea';
import { getTrad } from '../../../utils';
import schema from './../utils/schema';

const EmailForm = ({ template, onToggle, onSubmit }) => {
  const { formatMessage } = useIntl();
  const { display, options } = template;

  // console.log(options);

  return (
    <Formik
      onSubmit={() => console.log('kikou')}
      initialValues={template}
      // validateOnChange={false}
      validationSchema={schema}
      enableReinitialize
    >
      {({ errors, values, handleChange, isSubmitting }) => {
        console.log(errors);
        console.log(values)
        return (
          <Form>
            <ModalLayout onClose={onToggle} labelledBy="title">
              <ModalHeader>
                <Breadcrumbs label='Category model, name field'>
                  <Crumb>
                    {formatMessage({id: getTrad('PopUpForm.header.edit.email-templates'), defaultMessage: 'Edit email template'})}
                  </Crumb>
                  <Crumb>
                    {formatMessage({id: getTrad(display), defaultMessage: 'Edit email template'})}
                  </Crumb>
                </Breadcrumbs>
              </ModalHeader>
              <ModalBody>
                <Grid gap={5}>
                  <GridItem col={6} s={12}>
                    <TextInput 
                      label='Shipper name' 
                      name='options.from.name'
                      onChange={handleChange}
                      value={values.options.from.name}
                      // error={errors[input.name]}
                    />
                  </GridItem>
                  <GridItem col={6} s={12}>
                    <TextInput 
                      label='Shipper email' 
                      name='options.from.email'
                      onChange={handleChange}
                      value={values.options.from.email}
                    />
                  </GridItem>
                  <GridItem col={6} s={12}>
                    <TextInput 
                      label='Response email' 
                      name='options.response_email'
                      onChange={handleChange}
                      value={values.options.response_email}
                    />
                  </GridItem>
                  <GridItem col={6} s={12}>
                    <TextInput 
                      label='Subject' 
                      name='options.object'
                      onChange={handleChange}
                      value={values.options.object}
                    />
                  </GridItem>
                  <GridItem col={12} s={12}>
                    <Textarea 
                      label='Message' 
                      name='options.message'
                      onChange={handleChange}
                      value={values.options.message}
                    />
                  </GridItem>
                </Grid>
              </ModalBody>
              <ModalFooter 
                startActions={<Button onClick={onToggle} variant="tertiary">Cancel</Button>} 
                endActions={<Button type="submit">Finish</Button>} 
              />
            </ModalLayout>
          </Form>
        )
      }}
    </Formik>
  )
}

export default EmailForm


