import React, { useState, createRef, useEffect, useRef } from 'react';
import { get } from 'lodash';
import PropTypes from 'prop-types';
import { Inputs } from '@buffetjs/custom';
import { Button } from '@buffetjs/core';
import { ModalFooter, useGlobalContext } from 'strapi-helper-plugin';
import Cropper from 'cropperjs';
import 'cropperjs/dist/cropper.css';
import CardControl from '../CardControl';
import CardControlsWrapper from '../CardControlsWrapper';
import ModalSection from '../ModalSection';
import FileDetailsBox from './FileDetailsBox';
import FileWrapper from './FileWrapper';
import FormWrapper from './FormWrapper';
import Row from './Row';
import Wrapper from './Wrapper';
import form from './utils/form';
import isImageType from './utils/isImageType';

const EditForm = ({ fileToEdit, onChange, onSubmitEditNewFile, onToggle }) => {
  const { formatMessage } = useGlobalContext();
  const [isCropping, setIsCropping] = useState(false);
  const [cropResultURL, setCropResultURL] = useState(null);
  const [cropResultFile, setCropResultFile] = useState(null);
  const [src, setSrc] = useState(null);

  const mimeType = get(fileToEdit, ['file', 'type'], '');
  const canCrop = isImageType(mimeType);

  const imgRef = createRef();
  let cropper = useRef();

  useEffect(() => {
    if (canCrop) {
      // TODO: update when editing existing file

      const reader = new FileReader();

      reader.onloadend = () => {
        setSrc(reader.result);
      };

      reader.readAsDataURL(fileToEdit.file);
    }
  }, [canCrop, fileToEdit]);

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
      canvas.toBlob(blob => {
        const {
          file: { lastModifiedDate, lastModified, name },
        } = fileToEdit;

        blob.lastModified = lastModified;
        blob.lastModifiedDate = lastModifiedDate;
        blob.name = name;

        setCropResultFile(blob);
      }, mimeType);

      setCropResultURL(canvas.toDataURL());
    }

    setIsCropping(false);
  };

  const handleSubmit = e => {
    e.preventDefault();

    onSubmitEditNewFile({ file: cropResultFile || fileToEdit.file });
  };

  return (
    <form onSubmit={handleSubmit}>
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
                    src={cropResultURL || src}
                    alt=""
                    ref={isCropping ? imgRef : null}
                  />
                ) : null}
              </FileWrapper>
            </div>
            <div className="col-6">
              <FileDetailsBox />
              <FormWrapper>
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
              </FormWrapper>
            </div>
          </div>
        </Wrapper>
      </ModalSection>
      <ModalFooter>
        <section>
          <Button type="button" color="cancel" onClick={onToggle}>
            {formatMessage({ id: 'app.components.Button.cancel' })}
          </Button>
          <Button color="success" type="submit">
            {formatMessage({ id: 'form.button.finish' })}
          </Button>
        </section>
      </ModalFooter>
    </form>
  );
};

EditForm.defaultProps = {
  fileToEdit: null,
  onChange: () => {},
  onSubmitEditNewFile: e => e.preventDefault(),
  onToggle: () => {},
};

EditForm.propTypes = {
  fileToEdit: PropTypes.object,
  onChange: PropTypes.func,
  onSubmitEditNewFile: PropTypes.func,
  onToggle: PropTypes.func,
};

export default EditForm;
