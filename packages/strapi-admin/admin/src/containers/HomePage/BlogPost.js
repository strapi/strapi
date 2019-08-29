import React, { memo } from 'react';
import PropTypes from 'prop-types';
import { LoadingBar } from 'strapi-helper-plugin';

const BlogPost = ({ error, isFirst, isLoading, title, content, link }) => {
  if (isLoading) {
    return (
      <>
        <LoadingBar style={{ marginBottom: 13 }} />
        <LoadingBar style={{ width: '40%', marginBottom: 31 }} />
      </>
    );
  }

  if (error) {
    return null;
  }

  return (
    <a
      rel="noopener noreferrer"
      target="_blank"
      href={`https://blog.strapi.io/${link}`}
      style={{ color: '#333740' }}
    >
      <h2>{title}</h2>
      <p style={{ marginTop: 17, marginBottom: isFirst ? 32 : 10 }}>
        {content}
      </p>
    </a>
  );
};

BlogPost.defaultProps = {
  content: null,
  isFirst: false,
  link: null,
  title: null,
};

BlogPost.propTypes = {
  content: PropTypes.string,
  error: PropTypes.bool.isRequired,
  isFirst: PropTypes.bool,
  isLoading: PropTypes.bool.isRequired,
  link: PropTypes.string,
  title: PropTypes.string,
};

export default memo(BlogPost);
