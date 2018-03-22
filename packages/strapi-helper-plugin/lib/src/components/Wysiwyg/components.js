/**
 *
 * Utils components for the WYSIWYG
 * It includes decorators toggle buttons...
 *
 */

import React from "react";
import { FormattedMessage } from "react-intl";
import PropTypes from "prop-types";
import styles from "./styles.scss";

const Image = props => {
  const { alt, height, src, width } = props.contentState
    .getEntity(props.entityKey)
    .getData();

  return (
    <img
      alt={alt}
      src={src}
      height={height}
      width={width}
      style={{ maxWidth: "100%" }}
    />
  );
};

Image.propTypes = {
  contentState: PropTypes.object.isRequired,
  entityKey: PropTypes.string.isRequired
};

const Link = props => {
  const { url } = props.contentState.getEntity(props.entityKey).getData();

  return (
    <a href={url} style={styles.link}>
      {props.children}
    </a>
  );
};

Link.defaultProps = {
  children: ""
};

Link.propTypes = {
  children: PropTypes.node,
  contentState: PropTypes.object.isRequired,
  entityKey: PropTypes.string.isRequired
};

const ToggleMode = props => {
  const label = props.isPreviewMode
    ? "components.Wysiwyg.ToggleMode.markdown"
    : "components.Wysiwyg.ToggleMode.preview";

  return (
    <button
      type="button"
      className={styles.toggleModeButton}
      onClick={props.onClick}
    >
      <FormattedMessage id={label} />
    </button>
  );
};

ToggleMode.defaultProps = {
  isPreviewMode: false,
  onClick: () => {}
};

ToggleMode.propTypes = {
  isPreviewMode: PropTypes.bool,
  onClick: PropTypes.func
};

export { Image, Link, ToggleMode };
