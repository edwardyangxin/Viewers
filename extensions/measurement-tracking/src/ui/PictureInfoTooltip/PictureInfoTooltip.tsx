import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { PortalTooltip, Icon } from '@ohif/ui';

/**
 * Displays a tooltip with a list of messages
 * @param 
 * @returns
 */
const PictureInfoTooltip = ({
  pictureLink,
  id,
  position = 'left',
  arrow = 'center',
  // align = 'center',
}): React.ReactNode => {
  const [isOpen, setIsOpen] = useState(false);

  if (pictureLink && pictureLink.length > 0) {
    return (
      <>
        <Icon
          id={id}
          onMouseOver={() => setIsOpen(true)}
          onFocus={() => setIsOpen(true)}
          onMouseOut={() => setIsOpen(false)}
          onBlur={() => setIsOpen(false)}
          name="info"
          width="20px"
          height="20px"
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
              {
                <li
                  style={{
                    marginTop: '6px',
                    marginBottom: '6px',
                  }}
                  key={'0'}
                >
                  <img
                    src={pictureLink}
                    crossOrigin="anonymous"
                    alt="TabelLink"
                    style={{ width: '500px', height: '300px' }}
                  />
                </li>
              }
            </ol>
          </div>
        </PortalTooltip>
      </>
    );
  }
  return <></>;
};

PictureInfoTooltip.propTypes = {
  infos: PropTypes.array,
};

export default PictureInfoTooltip;
