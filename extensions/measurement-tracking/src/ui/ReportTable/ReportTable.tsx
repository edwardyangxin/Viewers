import React from 'react';
import PropTypes from 'prop-types';
import classnames from 'classnames';

const ReportTable = ({ children, className, fullWidth, style }) => {
  const classes = {
    base: 'text-lg text-black',
    fullWidth: {
      true: 'w-full',
      false: '',
    },
  };

  return (
    <div
      className={classnames(classes.base, classes.fullWidth[fullWidth], className)}
      style={style}
    >
      {children}
    </div>
  );
};

ReportTable.defaultProps = {
  className: '',
  fullWidth: true,
  style: {},
};

ReportTable.propTypes = {
  fullWidth: PropTypes.bool,
  children: PropTypes.node.isRequired,
  className: PropTypes.string,
  style: PropTypes.object,
};

export default ReportTable;
