import React from 'react';
import classNames from 'classnames';
import PropTypes from 'prop-types';
import { Icon, Typography } from '@ohif/ui';

const CloseButton = ({ onClick }) => {
  return (
    <Icon
      data-cy="close-button"
      onClick={onClick}
      name="close"
      className="text-primary-active cursor-pointer"
    />
  );
};

CloseButton.propTypes = {
  onClick: PropTypes.func,
};

const Header = ({ title, noCloseButton, onClose }) => {
  const theme = 'bg-slate-300';
  const flex = 'flex items-center justify-between';
  const padding = 'pb-[20px]';

  return (
    <div className={classNames(theme, flex, padding)}>
      <h6 className="m-0 leading-tight text-xl text-black !leading-[1.2]">{title}</h6>
      {!noCloseButton && <CloseButton onClick={onClose} />}
    </div>
  );
};

Header.propTypes = {
  className: PropTypes.string,
  title: PropTypes.string,
  noCloseButton: PropTypes.bool,
  onClose: PropTypes.func,
};

Header.defaultProps = {
  noCloseButton: false,
};

export default Header;
