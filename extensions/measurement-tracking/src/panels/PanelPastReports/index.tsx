import React, { useEffect, useState, useRef } from 'react';
import PropTypes from 'prop-types';
import {
  useImageViewer,
  Dialog,
  Select,
  useViewportGrid,
  ButtonEnums,
  Input,
} from '@ohif/ui';
import TimePointSummary from '../../ui/TimePointSummary';
import MeasurementTable from '../../ui/MeasurementTable';
import { DicomMetadataStore, utils } from '@ohif/core';
import { useDebounce } from '@hooks';
import ActionButtons from './ActionButtons';
import { useTrackedMeasurements } from '../../getContextModule';
import debounce from 'lodash.debounce';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { targetIndexMapping, targetInfoMapping, locationInfoMapping, 
  targetKeyGroup, nontargetKeyGroup, otherKeyGroup, responseOptions } from '../../utils/mappings';
import PastReportItem from '../../ui/PastReportItem';
import { getTimepointName } from '../../utils/utils';


// evibased, 右边栏上部显示的信息
const DISPLAY_STUDY_SUMMARY_INITIAL_VALUE = {
  key: undefined,
  timepoint: undefined,
  modality: '', // 'deprecated',
  description: '', // 'deprecated',
  taskInfo: undefined, // task info
};


function PastReports({ servicesManager, extensionManager, commandsManager }) {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { StudyInstanceUIDs } = useImageViewer();
  const [viewportGrid] = useViewportGrid();
  const [measurementChangeTimestamp, setMeasurementsUpdated] = useState(
    Date.now().toString()
  );
  const debouncedMeasurementChangeTimestamp = useDebounce(
    measurementChangeTimestamp,
    200
  );
  const {
    measurementService,
    uiDialogService,
    displaySetService,
    userAuthenticationService,
  } = servicesManager.services;
  const { _appConfig } = extensionManager;
  const [
    trackedMeasurements,
    sendTrackedMeasurementsEvent,
  ] = useTrackedMeasurements();
  // evibased, successSaveReport is flag after save report
  const { trackedStudy, trackedSeries, 
    taskInfo, successSaveReport, currentReportInfo, currentTimepoint, lastTimepoint, pastTimepoints } = trackedMeasurements.context;
  const [displayStudySummary, setDisplayStudySummary] = useState(
    DISPLAY_STUDY_SUMMARY_INITIAL_VALUE
  );
  const [displayMeasurements, setDisplayMeasurements] = useState([]);
  const measurementsPanelRef = useRef(null);
  const [inputSOD, setInputSOD] = useState('0.0');
  const [timepointResponse, setTimepointResponse] = useState('Baseline');
  const [extendedReportItems, setExtentedReportItems] = useState([]);

  function _handlePastReportClick(StudyInstanceUID) {
    const shouldCollapseStudy = extendedReportItems.includes(StudyInstanceUID);
    const updatedextendedReportItems = shouldCollapseStudy
      ? [...extendedReportItems.filter(stdyUid => stdyUid !== StudyInstanceUID)]
      : [...extendedReportItems, StudyInstanceUID];

    setExtentedReportItems(updatedextendedReportItems);
  }

  function _mapMeasurementToDisplay(measurement, index) {
    const {
      Width,
      Length,
      Unit,
      StudyInstanceUID: studyInstanceUid,
      Label: baseLabel,
      AnnotationType: type,
    } = measurement;
  
    const label = baseLabel || '(empty)';
    let displayText = Width && Length ? [`${Width.toFixed(2)} x ${Length.toFixed(2)} ${Unit}`] : ['无法测量'];
  
    return {
      uid: studyInstanceUid + '-' + index,
      label,
      baseLabel,
      measurementType: type.split(':')[1],
      displayText,
      baseDisplayText: displayText,
      isActive: false,
      finding: undefined,
      findingSites: undefined,
    };
  }

  // past report ui
  const getTabContent = () => {
    return pastTimepoints.map(
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
        // TODO: isExpanded dynamic
        const isExpanded = extendedReportItems.includes(studyInstanceUid);
        const trialTimePointInfo = trialTimePointId ? getTimepointName(trialTimePointId.slice(1)) : '';
        // TODO: 现在只取第一个report，后续看是否需要针对展现所有人的report
        const report = reports?.[0];
        
        const targetFindings = [];
        const nonTargetFindings = [];
        const otherFindings = [];
        let SOD = undefined;
        let response = undefined;
        let username = undefined;
        if (report) {
          username = report.username;
          SOD = report.SOD;
          response = report.response;
          const displayMeasurements = report.measurements.map((m, index) => _mapMeasurementToDisplay(m, index));
          for (const dm of displayMeasurements) {
            // get target info
            const targetInfo = dm.label.split('|')[1];
            if (!(targetInfo in targetInfoMapping)) {
              // not in targetInfoMapping, just show and allow edit in other group
              otherFindings.push(dm);
            } else if (targetKeyGroup.includes(targetInfo)) {
              targetFindings.push(dm);
            } else if (nontargetKeyGroup.includes(targetInfo)) {
              nonTargetFindings.push(dm);
            } else {
              otherFindings.push(dm);
            }
          }
        }
        // sort by index, get index from label, TODO: get index from measurementlabelInfo
        targetFindings.sort((a, b) => parseInt(a.label.split('|')[0]) - parseInt(b.label.split('|')[0]));
        nonTargetFindings.sort((a, b) => parseInt(a.label.split('|')[0]) - parseInt(b.label.split('|')[0]));
        otherFindings.sort((a, b) => parseInt(a.label.split('|')[0]) - parseInt(b.label.split('|')[0]));      

        return (
          <React.Fragment key={studyInstanceUid + '-pastReport'}>
            <PastReportItem
              studyInstanceUid={studyInstanceUid}
              trialTimePointInfo={trialTimePointInfo}
              username={username}
              SOD={SOD}
              response={response}
              isActive={isExpanded}
              onClick={() => {
                _handlePastReportClick(studyInstanceUid);
              }}
              data-cy="past-report-list"
            />
            {isExpanded && username && (
              <>
                <MeasurementTable
                  title={t('MeasurementTabel:Target Findings')}
                  data={targetFindings}
                  servicesManager={servicesManager}
                  onClick={() => {}}
                  onEdit={() => {}}
                />
                <MeasurementTable
                  title={t('MeasurementTabel:Non-Target Findings')}
                  data={nonTargetFindings}
                  servicesManager={servicesManager}
                  onClick={() => {}}
                  onEdit={() => {}}
                />
                <MeasurementTable
                  title={t('MeasurementTabel:Other Findings')}
                  data={otherFindings}
                  servicesManager={servicesManager}
                  onClick={() => {}}
                  onEdit={() => {}}
                />
              </>
            )}
          </React.Fragment>
        );
      }
    );
  };

  return (
    <>
      {/* <div
        className="invisible-scrollbar overflow-y-visible overflow-x-visible"
        ref={measurementsPanelRef}
        data-cy={'pastReports-panel'}
      >

        {displayStudySummary.taskInfo && (
          <TimePointSummary
            // evibased
            taskInfo={displayStudySummary.taskInfo}
            timepoint={displayStudySummary.timepoint ? displayStudySummary.timepoint.slice(1) : undefined}
            lastTimepointInfo={lastTimepoint}
            modality={displayStudySummary.modality}
            description={displayStudySummary.description}
          />
        )}
        <MeasurementTable
          title={t('MeasurementTabel:Target Findings')}
          data={targetFindings}
          servicesManager={servicesManager}
          onClick={jumpToImage}
          onEdit={onMeasurementItemEditHandler}
        />
        <MeasurementTable
          title={t('MeasurementTabel:Non-Target Findings')}
          data={nonTargetFindings}
          servicesManager={servicesManager}
          onClick={jumpToImage}
          onEdit={onMeasurementItemEditHandler}
        />
        {otherFindings.length > 0 && (
          <MeasurementTable
            title={t('MeasurementTabel:Other Findings')}
            data={otherFindings}
            servicesManager={servicesManager}
            onClick={jumpToImage}
            onEdit={onMeasurementItemEditHandler}
          />
        )}
        <div className="mt-3">
          <Input
            label="总测量值SOD(回车计算公式,单位mm)"
            labelClassName="text-white text-[14px] leading-[1.2]"
            className="border-primary-main bg-black"
            type="text"
            value={inputSOD}
            onChange={onInputChangeHandler}
            onKeyUp={onInputKeyUpHandler}
          />
        </div>
        <div>
          <label className="text-[14px] leading-[1.2] text-white">结论(Response)</label>
          <Select
            id="response"
            placeholder="选择结论(Response)"
            value={[timepointResponse]}
            onChange={(newSelection, action) => {
              // console.info('newSelection:', newSelection, 'action:', action);
              setTimepointResponse(newSelection.value);
            }}
            options={responseOptions}
          />
        </div>
      </div> */}

      <div className="ohif-scrollbar invisible-scrollbar flex flex-1 flex-col overflow-auto">
        {getTabContent()}
      </div>
    </>
  );
}

PastReports.propTypes = {
  servicesManager: PropTypes.shape({
    services: PropTypes.shape({
      measurementService: PropTypes.shape({
        getMeasurements: PropTypes.func.isRequired,
        VALUE_TYPES: PropTypes.object.isRequired,
      }).isRequired,
    }).isRequired,
  }).isRequired,
};

// TODO: This could be a measurementService mapper
function _mapMeasurementToDisplay(measurement, types, displaySetService) {
  const { referenceStudyUID, referenceSeriesUID, SOPInstanceUID } = measurement;

  // TODO: We don't deal with multiframe well yet, would need to update
  // This in OHIF-312 when we add FrameIndex to measurements.

  const instance = DicomMetadataStore.getInstance(
    referenceStudyUID,
    referenceSeriesUID,
    SOPInstanceUID
  );

  const displaySets = displaySetService.getDisplaySetsForSeries(
    referenceSeriesUID
  );

  if (!displaySets[0] || !displaySets[0].images) {
    throw new Error(
      'The tracked measurements panel should only be tracking "stack" displaySets.'
    );
  }

  const {
    displayText: baseDisplayText,
    uid,
    label: baseLabel,
    type,
    selected,
    findingSites,
    finding,
  } = measurement;

  const firstSite = findingSites?.[0];
  const label = baseLabel || finding?.text || firstSite?.text || '(empty)';
  let displayText = baseDisplayText || [];
  if (findingSites) {
    const siteText = [];
    findingSites.forEach(site => {
      if (site?.text !== label) {
        siteText.push(site.text);
      }
    });
    displayText = [...siteText, ...displayText];
  }
  if (finding && finding?.text !== label) {
    displayText = [finding.text, ...displayText];
  }

  return {
    uid,
    label,
    baseLabel,
    measurementType: type,
    displayText,
    baseDisplayText,
    isActive: selected,
    finding,
    findingSites,
  };
}

export default PastReports;
