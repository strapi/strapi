import React from 'react';
import PropTypes from 'prop-types';

function Group({ isRepeatable, label /*layout, name*/ }) {
  return (
    <>
      <div className="row">
        <div className="col-12" style={{ paddingTop: 16, paddingBottom: 15 }}>
          <span
            style={{
              fontSize: 13,
              fontWeight: 500,
            }}
          >
            {isRepeatable && label}
          </span>
        </div>
      </div>
      <div
        className="row"
        style={{
          marginLeft: '-10px',
          marginRight: '-10px',
          backgroundColor: '#f5f5f5',
        }}
      >
        <div className="col-12">COMING SOON</div>
      </div>
    </>
  );
}

Group.defaultProps = {
  label: '',
  // layout: {},
};

Group.propTypes = {
  isRepeatable: PropTypes.bool.isRequired,
  label: PropTypes.string,
  // layout: PropTypes.object,
};

export default Group;
