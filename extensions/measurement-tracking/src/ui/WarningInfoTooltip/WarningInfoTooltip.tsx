import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { PortalTooltip, Icon } from '@ohif/ui';

/**
 * Displays a tooltip with a list of messages
 *   warningInfo = [
      'warning1',
      'warning2',
    ],
 * @param param0
 * @returns
 */
const WarningInfoTooltip = ({
  warningInfo,
  id,
  position = 'left',
  arrow = 'center',
  // align = 'center',
}): React.ReactNode => {
  const [isOpen, setIsOpen] = useState(false);

  if (warningInfo && warningInfo.length > 0) {
    return (
      <>
        <Icon
          id={id}
          onMouseOver={() => setIsOpen(true)}
          onFocus={() => setIsOpen(true)}
          onMouseOut={() => setIsOpen(false)}
          onBlur={() => setIsOpen(false)}
          name="status-alert-warning"
        />
        <PortalTooltip
          active={isOpen}
          position={position}
          arrow={arrow}
          // align={align}
          parent={`#${id}`}
        >
          <div className="bg-primary-dark border-secondary-light rounded border text-left text-base text-white">
            <div
              className="break-normal text-base font-bold text-blue-300"
              style={{
                marginLeft: '12px',
                marginTop: '12px',
              }}
            >
              {'提示信息'}
            </div>
            <ol
              style={{
                marginLeft: '12px',
                marginRight: '12px',
              }}
            >
              {warningInfo.map((message, index) => (
                <li
                  style={{
                    marginTop: '6px',
                    marginBottom: '6px',
                  }}
                  key={index}
                >
                  {index + 1}. {message}
                </li>
              ))}
            </ol>
          </div>
        </PortalTooltip>
      </>
    );
  }
  return <></>;
};

WarningInfoTooltip.propTypes = {
  warningInfo: PropTypes.array,
};

export default WarningInfoTooltip;
