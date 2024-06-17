import React, { useEffect, useState } from 'react';
import PropTypes from 'prop-types';

import ThumbnailTracked from '../ThumbnailTracked';
import ThumbnailNoImage from '../ThumbnailNoImage';
import { Thumbnail, Types } from '@ohif/ui';

const ThumbnailList = ({
  thumbnails,
  onThumbnailClick,
  onThumbnailDoubleClick,
  onClickUntrack,
  activeDisplaySetInstanceUIDs = [],
  canStar, // evibased
  onClickStar = (StudyInstanceUID: string, SeriesInstanceUID: string, star: boolean) => {
    console.log('onClickStar', StudyInstanceUID, SeriesInstanceUID, star);
  },
}) => {
  const [starList, setStarList] = useState([]);
  const [nonStarList, setNonStarList] = useState([]);

  // update starList and nonStarList when thumbnails change
  useEffect(() => {
    const initialStarList = [];
    const initialNonStarList = [];
    thumbnails.forEach(thumbnail => {
      if (thumbnail.star || thumbnail.isTracked) {
        initialStarList.push(thumbnail);
      } else {
        initialNonStarList.push(thumbnail);
      }
    });
    setStarList(initialStarList);
    setNonStarList(initialNonStarList);
  }, [thumbnails]);

  const onClickStarList = (StudyInstanceUID, SeriesInstanceUID, index) => {
    const tn = starList[index];
    starList.splice(index, 1);
    setStarList([...starList]);
    nonStarList.push(tn);
    // sort for the inserted thumbnail
    nonStarList.sort((a, b) => {
      const seriesTimestampA = a.seriesTimestamp;
      const seriesTimestampB = b.seriesTimestamp;

      return seriesTimestampA - seriesTimestampB;
    });
    setNonStarList([...nonStarList]);
    onClickStar(StudyInstanceUID, SeriesInstanceUID, false);
  };
  const onClickNonStarList = (StudyInstanceUID, SeriesInstanceUID, index) => {
    const tn = nonStarList[index];
    nonStarList.splice(index, 1);
    setNonStarList([...nonStarList]);
    starList.push(tn);
    starList.sort((a, b) => {
      const seriesTimestampA = a.seriesTimestamp;
      const seriesTimestampB = b.seriesTimestamp;

      return seriesTimestampA - seriesTimestampB;
    });
    setStarList([...starList]);
    onClickStar(StudyInstanceUID, SeriesInstanceUID, true);
  };
  return (
    <div
      id="ohif-thumbnail-list"
      className="ohif-scrollbar study-min-height overflow-y-hidden bg-black py-3"
    >
      {starList.map(
        (
          {
            displaySetInstanceUID,
            description,
            dragData,
            seriesNumber,
            numInstances,
            modality,
            componentType,
            seriesDate,
            countIcon,
            isTracked,
            canReject,
            onReject,
            imageSrc,
            messages,
            imageAltText,
            isHydratedForDerivedDisplaySet,
            star, // evibased, star status
            bodyPart, // evibased, body part examined
            studyDescription, // evibased, study description
            StudyInstanceUID, // evibased
            SeriesInstanceUID, // evibased
          },
          index
        ) => {
          const isActive = activeDisplaySetInstanceUIDs.includes(displaySetInstanceUID);
          switch (componentType) {
            case 'thumbnail':
              return (
                <Thumbnail
                  key={displaySetInstanceUID}
                  displaySetInstanceUID={displaySetInstanceUID}
                  dragData={dragData}
                  description={description}
                  seriesNumber={seriesNumber}
                  numInstances={numInstances}
                  countIcon={countIcon}
                  imageSrc={imageSrc}
                  imageAltText={imageAltText}
                  messages={messages}
                  isActive={isActive}
                  onClick={() => onThumbnailClick(displaySetInstanceUID)}
                  onDoubleClick={() => onThumbnailDoubleClick(displaySetInstanceUID)}
                  studyDescription={studyDescription}
                />
              );
            case 'thumbnailTracked':
              return (
                <ThumbnailTracked
                  key={displaySetInstanceUID}
                  displaySetInstanceUID={displaySetInstanceUID}
                  dragData={dragData}
                  description={description}
                  seriesNumber={seriesNumber}
                  numInstances={numInstances}
                  countIcon={countIcon}
                  imageSrc={imageSrc}
                  imageAltText={imageAltText}
                  messages={messages}
                  isTracked={isTracked}
                  isActive={isActive}
                  onClick={() => onThumbnailClick(displaySetInstanceUID)}
                  onDoubleClick={() => onThumbnailDoubleClick(displaySetInstanceUID)}
                  onClickUntrack={() => onClickUntrack(displaySetInstanceUID)}
                  studyDescription={studyDescription}
                  canStar={isTracked ? false : canStar} // evibased, disable star button if tracked
                  star={true}
                  onClickStar={() => onClickStarList(StudyInstanceUID, SeriesInstanceUID, index)}
                />
              );
            case 'thumbnailNoImage':
              return (
                <ThumbnailNoImage
                  isActive={isActive}
                  key={displaySetInstanceUID}
                  displaySetInstanceUID={displaySetInstanceUID}
                  dragData={dragData}
                  modality={modality}
                  modalityTooltip={_getModalityTooltip(modality)}
                  messages={messages}
                  seriesDate={seriesDate}
                  description={description}
                  canReject={canReject}
                  onReject={onReject}
                  onClick={() => onThumbnailClick(displaySetInstanceUID)}
                  onDoubleClick={() => onThumbnailDoubleClick(displaySetInstanceUID)}
                  isHydratedForDerivedDisplaySet={isHydratedForDerivedDisplaySet}
                  studyDescription={studyDescription}
                />
              );
            default:
              return <></>;
          }
        }
      )}
      {nonStarList.map(
        (
          {
            displaySetInstanceUID,
            description,
            dragData,
            seriesNumber,
            numInstances,
            modality,
            componentType,
            seriesDate,
            countIcon,
            isTracked,
            canReject,
            onReject,
            imageSrc,
            messages,
            imageAltText,
            isHydratedForDerivedDisplaySet,
            bodyPart, // evibased, body part examined
            studyDescription, // evibased, study description
            StudyInstanceUID, // evibased
            SeriesInstanceUID, // evibased
          },
          index
        ) => {
          const isActive = activeDisplaySetInstanceUIDs.includes(displaySetInstanceUID);
          switch (componentType) {
            case 'thumbnail':
              return (
                <Thumbnail
                  key={displaySetInstanceUID}
                  displaySetInstanceUID={displaySetInstanceUID}
                  dragData={dragData}
                  description={description}
                  seriesNumber={seriesNumber}
                  numInstances={numInstances}
                  countIcon={countIcon}
                  imageSrc={imageSrc}
                  imageAltText={imageAltText}
                  messages={messages}
                  isActive={isActive}
                  onClick={() => onThumbnailClick(displaySetInstanceUID)}
                  onDoubleClick={() => onThumbnailDoubleClick(displaySetInstanceUID)}
                  studyDescription={studyDescription}
                />
              );
            case 'thumbnailTracked':
              return (
                <ThumbnailTracked
                  key={displaySetInstanceUID}
                  displaySetInstanceUID={displaySetInstanceUID}
                  dragData={dragData}
                  description={description}
                  seriesNumber={seriesNumber}
                  numInstances={numInstances}
                  countIcon={countIcon}
                  imageSrc={imageSrc}
                  imageAltText={imageAltText}
                  messages={messages}
                  isTracked={isTracked}
                  isActive={isActive}
                  onClick={() => onThumbnailClick(displaySetInstanceUID)}
                  onDoubleClick={() => onThumbnailDoubleClick(displaySetInstanceUID)}
                  onClickUntrack={() => onClickUntrack(displaySetInstanceUID)}
                  studyDescription={studyDescription}
                  canStar={isTracked ? false : canStar} // evibased, disable star button if tracked
                  star={false}
                  onClickStar={() => onClickNonStarList(StudyInstanceUID, SeriesInstanceUID, index)}
                />
              );
            case 'thumbnailNoImage':
              return (
                <ThumbnailNoImage
                  isActive={isActive}
                  key={displaySetInstanceUID}
                  displaySetInstanceUID={displaySetInstanceUID}
                  dragData={dragData}
                  modality={modality}
                  modalityTooltip={_getModalityTooltip(modality)}
                  messages={messages}
                  seriesDate={seriesDate}
                  description={description}
                  canReject={canReject}
                  onReject={onReject}
                  onClick={() => onThumbnailClick(displaySetInstanceUID)}
                  onDoubleClick={() => onThumbnailDoubleClick(displaySetInstanceUID)}
                  isHydratedForDerivedDisplaySet={isHydratedForDerivedDisplaySet}
                  studyDescription={studyDescription}
                />
              );
            default:
              return <></>;
          }
        }
      )}
    </div>
  );
};

ThumbnailList.propTypes = {
  thumbnails: PropTypes.arrayOf(
    PropTypes.shape({
      displaySetInstanceUID: PropTypes.string.isRequired,
      imageSrc: PropTypes.string,
      imageAltText: PropTypes.string,
      seriesDate: PropTypes.string,
      seriesNumber: Types.StringNumber,
      numInstances: PropTypes.number,
      description: PropTypes.string,
      componentType: Types.ThumbnailType.isRequired,
      isTracked: PropTypes.bool,
      /**
       * Data the thumbnail should expose to a receiving drop target. Use a matching
       * `dragData.type` to identify which targets can receive this draggable item.
       * If this is not set, drag-n-drop will be disabled for this thumbnail.
       *
       * Ref: https://react-dnd.github.io/react-dnd/docs/api/use-drag#specification-object-members
       */
      dragData: PropTypes.shape({
        /** Must match the "type" a dropTarget expects */
        type: PropTypes.string.isRequired,
      }),
    })
  ),
  activeDisplaySetInstanceUIDs: PropTypes.arrayOf(PropTypes.string),
  onThumbnailClick: PropTypes.func.isRequired,
  onThumbnailDoubleClick: PropTypes.func.isRequired,
  onClickUntrack: PropTypes.func.isRequired,
  onClickStar: PropTypes.func,
};

// TODO: Support "Viewport Identificator"?
function _getModalityTooltip(modality) {
  if (_modalityTooltips.hasOwnProperty(modality)) {
    return _modalityTooltips[modality];
  }

  return 'Unknown';
}

const _modalityTooltips = {
  SR: 'Structured Report',
  SEG: 'Segmentation',
  RTSTRUCT: 'RT Structure Set',
};

export default ThumbnailList;
