import React from 'react';
import classnames from 'classnames';
import PropTypes from 'prop-types';
import { useDrag } from 'react-dnd';
import { Icon, Tooltip, Typography } from '@ohif/ui';

// based on platform/ui/src/components/ThumbnailNoImage/ThumbnailNoImage.tsx
const ReportThumbnail = ({
  displaySetInstanceUID,
  description,
  seriesDate,
  modality,
  modalityTooltip,
  onClick,
  onDoubleClick,
  canReject,
  onReject,
  dragData,
  isActive,
}) => {
  const [collectedProps, drag, dragPreview] = useDrag({
    type: 'displayset',
    item: { ...dragData },
    canDrag: function (monitor) {
      return Object.keys(dragData).length !== 0;
    },
  });

  return (
    <div
      className={classnames(
        'flex flex-1 cursor-pointer select-none flex-row rounded outline-none hover:border-blue-300 focus:border-blue-300',
        isActive ? 'border-primary-light border-2' : 'border border-transparent'
      )}
      style={{
        padding: isActive ? '5px' : '6px',
      }}
      id={`thumbnail-${displaySetInstanceUID}`}
      onClick={onClick}
      onDoubleClick={onDoubleClick}
      role="button"
      tabIndex="0"
      data-cy={`study-browser-thumbnail-no-image`}
    >
      <div ref={drag}>
        <div className="flex flex-1 flex-col">
          <div className="mb-1 flex flex-1 flex-row items-center">
            <Icon
              name="list-bullets"
              className={classnames(
                'w-12',
                isActive ? 'text-primary-light' : 'text-secondary-light'
              )}
            />
            <Tooltip
              position="bottom"
              content={<Typography>{modalityTooltip}</Typography>}
            >
              <div
                className={classnames(
                  'rounded-sm px-3  text-lg',
                  isActive
                    ? 'bg-primary-light text-black'
                    : 'bg-primary-main text-white'
                )}
              >
                {modality}
              </div>
            </Tooltip>
            <span className="ml-4 text-base text-blue-300">{seriesDate}</span>
          </div>
          <div className="flex flex-row">
            {canReject && (
              <Icon
                name="old-trash"
                style={{ minWidth: '12px' }}
                className="ml-4 w-3 text-red-500"
                onClick={onReject}
              />
            )}
            <div className="ml-4 break-all text-base text-white">{description}</div>
          </div>
        </div>
      </div>
    </div>
  );
};

ReportThumbnail.propTypes = {
  displaySetInstanceUID: PropTypes.string,
  /**
   * Data the thumbnail should expose to a receiving drop target. Use a matching
   * `dragData.type` to identify which targets can receive this draggable item.
   * If this is not set, drag-n-drop will be disabled for this thumbnail.
   *
   * Ref: https://react-dnd.github.io/react-dnd/docs/api/use-drag#specification-object-members
   */
  dragData: PropTypes.shape({
    /** Must match the "type" a dropTarget expects */
    type: PropTypes.string,
  }),
  description: PropTypes.string,
  modality: PropTypes.string,
  /* Tooltip message to display when modality text is hovered */
  modalityTooltip: PropTypes.string,
  seriesDate: PropTypes.string,
  onClick: PropTypes.func,
  onDoubleClick: PropTypes.func,
  isActive: PropTypes.bool,
};

export default ReportThumbnail;
