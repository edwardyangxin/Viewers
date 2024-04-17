import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { useAppConfig } from '@state';
import { useViewportGrid } from '@ohif/ui';
import MeasurementTable from '../../ui/MeasurementTable';
import { useTrackedMeasurements } from '../../getContextModule';
import { useTranslation } from 'react-i18next';
import { LesionMapping, targetKeyGroup, nonTargetKeyGroup } from '../../utils/mappings';
import PastReportItem from '../../ui/PastReportItem';
import {
  getPastReportDialog,
  getTimepointName,
  getViewportId,
  reportMeasurementToReadonlyMeasurement,
} from '../../utils/utils';
import requestDisplaySetCreationForStudy from '../PanelStudyBrowserTracking/requestDisplaySetCreationForStudy';

function PastReports({ servicesManager, extensionManager }) {
  const { t } = useTranslation();
  const [appConfig] = useAppConfig();
  const [viewportGrid] = useViewportGrid();
  const { measurementService, displaySetService, uiDialogService } = servicesManager.services;
  const [trackedMeasurements, sendTrackedMeasurementsEvent] = useTrackedMeasurements();
  // evibased, successSaveReport is flag after save report
  const { pastTimepoints } = trackedMeasurements.context;
  const [extendedReportItems, setExtentedReportItems] = useState([]);

  async function _handlePastReportClick(StudyInstanceUID, report, reportIndex) {
    // handle extendedReportItems
    const reportItemId = `${StudyInstanceUID}-${reportIndex}`;
    const shouldCollapseStudy = extendedReportItems.includes(reportItemId);
    if (!shouldCollapseStudy) {
      // fetch data for study
      const madeInClient = true;
      await requestDisplaySetCreationForStudy(
        extensionManager.getActiveDataSource()[0],
        displaySetService,
        StudyInstanceUID,
        madeInClient
      );

      // handle report measurements
      // TODO: 重构measurements > rawMeasurements > annotations
      // const reportInfo = reportData.report_info;
      let measurements = report.measurements ? report.measurements : [];

      // loop through all measurements, and create readonly measurements and annotations
      for (let i = 0; i < measurements.length; i++) {
        let measurement = measurements[i];
        const newReadonlyMeasurementUID = reportMeasurementToReadonlyMeasurement(
          extensionManager,
          measurementService,
          appConfig,
          measurement
        );
        measurement.readonlyMeasurementUID = newReadonlyMeasurementUID;
      }
    }

    const updatedextendedReportItems = shouldCollapseStudy
      ? [...extendedReportItems.filter(rId => rId !== reportItemId)]
      : [...extendedReportItems, reportItemId];
    setExtentedReportItems(updatedextendedReportItems);
  }

  function _mapMeasurementToDisplay(measurement, index) {
    const {
      readonlyMeasurementUID,
      Width,
      Length,
      Unit,
      StudyInstanceUID: studyInstanceUid,
      Label: baseLabel,
      AnnotationType: type,
    } = measurement;

    const label = baseLabel || '(empty)';
    let displayText =
      Width && Length ? [`${Width.toFixed(1)} x ${Length.toFixed(1)} ${Unit}`] : ['无法测量'];

    return {
      uid: readonlyMeasurementUID,
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

  const jumpToComparedMeasurement = ({ uid }) => {
    // jump to measurement by readonlyMeasurement uid
    // get viewport with comparedDisplaySetId
    const { viewports } = viewportGrid;
    const comparedViewportId = getViewportId(viewports, 'comparedDisplaySetId');
    if (comparedViewportId) {
      measurementService.jumpToReadonlyMeasurement(comparedViewportId, uid);
    } else {
      console.error("can't find compared viewport id!");
    }
  };

  // past report ui
  function getTabContent() {
    if (!Array.isArray(pastTimepoints) || pastTimepoints.length === 0) {
      return null;
    }
    return pastTimepoints.map(({ studyInstanceUid, trialTimePointId, reports }, timepointIndex) => {
      const trialTimePointInfo = trialTimePointId ? getTimepointName(trialTimePointId) : '';
      // show all reports
      if (!Array.isArray(reports) || reports.length === 0) {
        return (
          <React.Fragment key={`${studyInstanceUid}-pastReport-${timepointIndex}`}></React.Fragment>
        );
      }
      return reports.map((report, reportIndex) => {
        if (!report) {
          return (
            <React.Fragment key={`${studyInstanceUid}-pastReport-${reportIndex}`}></React.Fragment>
          );
        }
        const isExpanded = extendedReportItems.includes(`${studyInstanceUid}-${reportIndex}`);
        const targetFindings = [];
        const nonTargetFindings = [];
        const otherFindings = [];
        const username = report.username;
        const userAlias = report.task?.userAlias;
        const SOD = report.SOD;
        const response = report.response;
        const displayMeasurements = report.measurements.map((m, index) =>
          _mapMeasurementToDisplay(m, index)
        );
        for (const dm of displayMeasurements) {
          // get target info
          const lesionValue = dm.label.split('|')[1];
          if (!(lesionValue in LesionMapping)) {
            // not in LesionMapping, just show and allow edit in other group
            otherFindings.push(dm);
          } else if (targetKeyGroup.includes(lesionValue)) {
            targetFindings.push(dm);
          } else if (nonTargetKeyGroup.includes(lesionValue)) {
            nonTargetFindings.push(dm);
          } else {
            otherFindings.push(dm);
          }
        }
        // sort by index, get index from label, TODO: get index from measurementlabelInfo
        targetFindings.sort(
          (a, b) => parseInt(a.label.split('|')[0]) - parseInt(b.label.split('|')[0])
        );
        nonTargetFindings.sort(
          (a, b) => parseInt(a.label.split('|')[0]) - parseInt(b.label.split('|')[0])
        );
        otherFindings.sort(
          (a, b) => parseInt(a.label.split('|')[0]) - parseInt(b.label.split('|')[0])
        );

        return (
          <React.Fragment key={`${studyInstanceUid}-pastReport-${reportIndex}`}>
            <PastReportItem
              studyInstanceUid={studyInstanceUid}
              trialTimePointInfo={trialTimePointInfo}
              username={userAlias ? userAlias : username}
              SOD={SOD}
              response={response}
              isActive={isExpanded}
              onClick={() => {
                _handlePastReportClick(studyInstanceUid, report, reportIndex);
              }}
              onReportClick={event => {
                event.stopPropagation();
                getPastReportDialog(uiDialogService, trialTimePointInfo, report);
              }}
              data-cy="past-report-list"
            />
            {isExpanded && username && (
              <>
                <MeasurementTable
                  title={t('MeasurementTable:Target Findings')}
                  ifTarget={true}
                  data={targetFindings}
                  servicesManager={servicesManager}
                  onClick={jumpToComparedMeasurement}
                  canEdit={false}
                />
                <MeasurementTable
                  title={t('MeasurementTable:Non-Target Findings')}
                  data={nonTargetFindings}
                  servicesManager={servicesManager}
                  onClick={jumpToComparedMeasurement}
                  canEdit={false}
                />
                <MeasurementTable
                  title={t('MeasurementTable:Other Findings')}
                  data={otherFindings}
                  servicesManager={servicesManager}
                  onClick={jumpToComparedMeasurement}
                  canEdit={false}
                />
              </>
            )}
          </React.Fragment>
        );
      });
    });
  };

  return (
    <>
      <div className="ohif-scrollbar invisible-scrollbar flex flex-1 flex-col overflow-auto">
        { 
          pastTimepoints && pastTimepoints.length > 0 ? getTabContent() : (
            <div className="flex items-center justify-center h-full">
              <div className="text-lg text-gray-500">"无往期报告"</div>
            </div>
          )
        }
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

export default PastReports;
