import React from 'react';
import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';

import StudyItem from '../StudyItem';
import { LegacyButtonGroup, LegacyButton, Types } from '@ohif/ui';
import ThumbnailList from '../ThumbnailList';
import ReportThumbnailList from '../ReportThumbnailList';
import { getTimepointName } from '../../utils/utils';

const { StringNumber } = Types;

const getTrackedSeries = displaySets => {
  let trackedSeries = 0;
  displaySets.forEach(displaySet => {
    if (displaySet.isTracked) {
      trackedSeries++;
    }
  });

  return trackedSeries;
};

const StudyBrowser = ({
  ifCompareMode,
  currentStudyInstanceUID,
  comparedStudyInstanceUID,
  tabs,
  activeTabName,
  expandedStudyInstanceUIDs,
  onClickTab,
  onClickStudy,
  onCompareStudy,
  onClickThumbnail,
  onDoubleClickThumbnail,
  onDoubleClickReportThumbnail,
  onClickUntrack,
  activeDisplaySetInstanceUIDs,
  servicesManager,
}) => {
  const { t } = useTranslation('StudyBrowser');
  const { customizationService } = servicesManager?.services || {};

  const getTabContent = () => {
    const tabData = tabs.find(tab => tab.name === activeTabName);
    return tabData.studies.map(
      ({
        studyInstanceUid,
        date,
        description,
        numInstances,
        modalities,
        displaySets,
        trialTimePointId,
        reports,
        ifPrimary,
      }) => {
        const isExpanded = expandedStudyInstanceUIDs.includes(studyInstanceUid);
        const ifCurrentTimePoint = studyInstanceUid === currentStudyInstanceUID;
        const ifComparedTimePoint = studyInstanceUid === comparedStudyInstanceUID;
        const trialTimePointInfo = trialTimePointId
          ? ` ${getTimepointName(trialTimePointId.slice(1))}` + (ifCurrentTimePoint ? '(当前)' : '') + (ifComparedTimePoint ? '(对比)' : '') 
          : date;
        return (
          <React.Fragment key={studyInstanceUid}>
            <StudyItem
              studyInstanceUid={studyInstanceUid}
              ifPrimary={ifCurrentTimePoint}
              canCompare={!ifCurrentTimePoint && ifCompareMode && !ifComparedTimePoint}
              date={trialTimePointInfo}
              description={description}
              numInstances={numInstances}
              modalities={modalities}
              trackedSeries={getTrackedSeries(displaySets)}
              isActive={isExpanded}
              onClick={() => {
                onClickStudy(studyInstanceUid);
              }}
              onCompareClick={() => {
                onCompareStudy(studyInstanceUid);
              }}
              data-cy="thumbnail-list"
            />
            {/* evibased, not showing report if not primary */}
            {ifPrimary && isExpanded && Array.isArray(reports) && reports.length > 0 && (
              <ReportThumbnailList
                reportThumbnails={reports}
                onReportThumbnailClick={onClickThumbnail} // no use
                onReportThumbnailDoubleClick={onDoubleClickReportThumbnail}
              />
            )}
            {isExpanded && displaySets && (
              <ThumbnailList
                thumbnails={displaySets}
                activeDisplaySetInstanceUIDs={activeDisplaySetInstanceUIDs}
                onThumbnailClick={onClickThumbnail}
                onThumbnailDoubleClick={onDoubleClickThumbnail}
                onClickUntrack={onClickUntrack}
              />
            )}
          </React.Fragment>
        );
      }
    );
  };

  return (
    <React.Fragment>
      <div
        className="w-100 border-secondary-light bg-primary-dark flex flex-row items-center justify-center border-b pb-1"
        data-cy={'studyBrowser-panel'}
      >
        {/* TODO Revisit design of LegacyButtonGroup later - for now use LegacyButton for its children.*/}
        <LegacyButtonGroup
          variant="outlined"
          color="secondary"
          splitBorder={false}
        >
          {tabs.map(tab => {
            const { name, label, studies } = tab;
            const isActive = activeTabName === name;
            const isDisabled = !studies.length;
            // Apply the contrasting color for brighter button color visibility
            const classStudyBrowser = customizationService?.getModeCustomization(
              'class:StudyBrowser'
            ) || {
              true: 'default',
              false: 'default',
            };
            const color = classStudyBrowser[`${isActive}`];
            return (
              <LegacyButton
                key={name}
                className={'min-w-18 p-2 text-base text-white'}
                size="initial"
                color={color}
                bgColor={isActive ? 'bg-primary-main' : 'bg-black'}
                onClick={() => {
                  onClickTab(name);
                }}
                disabled={isDisabled}
              >
                {t(label)}
              </LegacyButton>
            );
          })}
        </LegacyButtonGroup>
      </div>
      {tabs.length > 0 && (
        <div className="ohif-scrollbar invisible-scrollbar flex flex-1 flex-col overflow-auto">
          {getTabContent()}
        </div>
      )}
    </React.Fragment>
  );
};

StudyBrowser.propTypes = {
  onClickTab: PropTypes.func.isRequired,
  onClickStudy: PropTypes.func,
  onClickThumbnail: PropTypes.func,
  onDoubleClickThumbnail: PropTypes.func,
  onDoubleClickReportThumbnail: PropTypes.func,
  onClickUntrack: PropTypes.func,
  activeTabName: PropTypes.string.isRequired,
  expandedStudyInstanceUIDs: PropTypes.arrayOf(PropTypes.string).isRequired,
  activeDisplaySetInstanceUIDs: PropTypes.arrayOf(PropTypes.string),
  tabs: PropTypes.arrayOf(
    PropTypes.shape({
      name: PropTypes.string.isRequired,
      label: PropTypes.string.isRequired,
      studies: PropTypes.arrayOf(
        PropTypes.shape({
          studyInstanceUid: PropTypes.string.isRequired,
          date: PropTypes.string,
          numInstances: PropTypes.number,
          modalities: PropTypes.string,
          description: PropTypes.string,
          displaySets: PropTypes.arrayOf(
            PropTypes.shape({
              displaySetInstanceUID: PropTypes.string.isRequired,
              imageSrc: PropTypes.string,
              imageAltText: PropTypes.string,
              seriesDate: PropTypes.string,
              seriesNumber: StringNumber,
              numInstances: PropTypes.number,
              description: PropTypes.string,
              componentType: PropTypes.oneOf(['thumbnail', 'thumbnailTracked', 'thumbnailNoImage'])
                .isRequired,
              isTracked: PropTypes.bool,
              viewportIdentificator: PropTypes.arrayOf(PropTypes.string),
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
        })
      ).isRequired,
    })
  ),
};

const noop = () => {};

StudyBrowser.defaultProps = {
  onClickTab: noop,
  onClickStudy: noop,
  onClickThumbnail: noop,
  onDoubleClickThumbnail: noop,
  onDoubleClickReportThumbnail: noop,
  onClickUntrack: noop,
};

export default StudyBrowser;
