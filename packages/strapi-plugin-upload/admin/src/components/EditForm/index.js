import React, { useState, createRef, useEffect, useRef } from 'react';
import { get } from 'lodash';
import PropTypes from 'prop-types';
import { Inputs } from '@buffetjs/custom';
import { useGlobalContext } from 'strapi-helper-plugin';
import Cropper from 'cropperjs';
import 'cropperjs/dist/cropper.css';
import CardControl from '../CardControl';
import CardControlsWrapper from '../CardControlsWrapper';
import ModalSection from '../ModalSection';
import FileDetailsBox from './FileDetailsBox';
import FileWrapper from './FileWrapper';
import Form from './Form';
import Row from './Row';
import Wrapper from './Wrapper';
import form from './utils/form';
import isImageType from './utils/isImageType';

const EditForm = ({ fileToEdit, onChange, onSubmit, ...rest }) => {
  const { formatMessage } = useGlobalContext();
  const [isCropping, setIsCropping] = useState(false);
  const [cropResult, setCropResult] = useState(null);
  const canCrop = isImageType(get(fileToEdit, 'file', null));
  console.log(rest);

  const imgRef = createRef();
  let cropper = useRef();

  useEffect(() => {
    if (isCropping) {
      cropper.current = new Cropper(imgRef.current, {
        modal: false,
        initialAspectRatio: 16 / 9,
        movable: true,
        zoomable: false,
        cropBoxResizable: true,
        background: false,
      });
    } else if (cropper.current) {
      cropper.current.destroy();
    }

    return () => {
      if (cropper.current) {
        cropper.current.destroy();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cropper, isCropping]);

  const handleToggleCropMode = () => {
    setIsCropping(prev => !prev);
  };

  const handleClick = () => {
    if (cropper) {
      const canvas = cropper.current.getCroppedCanvas();

      setCropResult(canvas.toDataURL());
    }

    setIsCropping(false);
  };

  return (
    <ModalSection>
      <Wrapper>
        <div className="row">
          <div className="col-6">
            <FileWrapper>
              <CardControlsWrapper className="card-control-wrapper">
                {!isCropping ? (
                  <>
                    <CardControl color="#9EA7B8" type="trash" />
                    {canCrop && (
                      <CardControl
                        type="crop"
                        color="#9EA7B8"
                        onClick={handleToggleCropMode}
                      />
                    )}
                  </>
                ) : (
                  <>
                    <CardControl
                      type="clear"
                      color="#F64D0A"
                      onClick={handleToggleCropMode}
                    />
                    <CardControl
                      type="check"
                      color="#6DBB1A"
                      onClick={handleClick}
                    />
                  </>
                )}
              </CardControlsWrapper>

              {canCrop ? (
                <img
                  src={
                    cropResult ||
                    'https://images.unsplash.com/photo-1558980664-ce6960be307d?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=crop&w=750&q=80'
                  }
                  alt=""
                  ref={isCropping ? imgRef : null}
                />
              ) : null}
            </FileWrapper>
          </div>
          <div className="col-6">
            <FileDetailsBox />
            <Form onSubmit={onSubmit}>
              {form.map(({ key, inputs }) => {
                return (
                  <Row key={key}>
                    {inputs.map(input => {
                      return (
                        <div className="col-12" key={input.name}>
                          <Inputs
                            type="text"
                            onChange={onChange}
                            {...input}
                            label={formatMessage(input.label)}
                            description={
                              input.description
                                ? formatMessage(input.description)
                                : null
                            }
                          />
                        </div>
                      );
                    })}
                  </Row>
                );
              })}
            </Form>
          </div>
        </div>
      </Wrapper>
    </ModalSection>
  );
};

EditForm.defaultProps = {
  fileToEdit: null,
  onChange: () => {},
  onSubmit: e => e.preventDefault(),
};

EditForm.propTypes = {
  fileToEdit: PropTypes.object,
  onChange: PropTypes.func,
  onSubmit: PropTypes.func,
};

export default EditForm;
