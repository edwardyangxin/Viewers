import React, { useEffect, useState, useRef } from 'react';
import PropTypes from 'prop-types';
import {
  useImageViewer,
  Select,
  useViewportGrid,
  Input,
} from '@ohif/ui';
import TimePointSummary from '../../ui/TimePointSummary';
import MeasurementTable from '../../ui/MeasurementTable';
import { DicomMetadataStore, utils } from '@ohif/core';
import { useDebounce } from '@hooks';
import { useAppConfig } from '@state';
import ActionButtons from './ActionButtons';
import { useTrackedMeasurements } from '../../getContextModule';
import debounce from 'lodash.debounce';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { LesionMapping, targetKeyGroup, nonTargetKeyGroup} from '../../utils/mappings';
import PastReportItem from '../../ui/PastReportItem';
import {
  getEditMeasurementLabelDialog,
  getPastReportDialog,
  getTimepointName,
  getViewportId,
  parseMeasurementLabelInfo,
} from '../../utils/utils';

const { downloadCSVReport } = utils;

// evibased, 右边栏上部显示的信息
const DISPLAY_STUDY_SUMMARY_INITIAL_VALUE = {
  key: undefined,
  timepoint: undefined,
  modality: '', // 'deprecated',
  description: '', // 'deprecated',
  currentTask: undefined,
  taskInfo: undefined, // task info
};

function PanelMeasurementTableTracking({ servicesManager, extensionManager, commandsManager }) {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const dataSources = extensionManager.getDataSources();
  const dataSource = dataSources[0];
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
  const [
    trackedMeasurements,
    sendTrackedMeasurementsEvent,
  ] = useTrackedMeasurements();
  // evibased, successSaveReport is flag after save report
  const { trackedStudy, trackedSeries, taskInfo, successSaveReport, currentReportInfo,
    currentTimepoint, lastTimepoint, comparedTimepoint, username, userRoles, currentTask } = trackedMeasurements.context;
  const [displayStudySummary, setDisplayStudySummary] = useState(
    DISPLAY_STUDY_SUMMARY_INITIAL_VALUE
  );
  const [displayMeasurements, setDisplayMeasurements] = useState([]);
  const measurementsPanelRef = useRef(null);
  const [appConfig] = useAppConfig();
  const [extendedComparedReport, setExtentedComparedReport] = useState(true);

  useEffect(() => {
    const measurements = measurementService.getMeasurements();
    const filteredMeasurements = measurements.filter(
      m =>
        trackedStudy === m.referenceStudyUID &&
        trackedSeries.includes(m.referenceSeriesUID)
    );

    const mappedMeasurements = filteredMeasurements.map(m =>
      _mapMeasurementToDisplay(
        m,
        measurementService.VALUE_TYPES,
        displaySetService
      )
    );
    setDisplayMeasurements(mappedMeasurements);
    // eslint-ignore-next-line
  }, [
    measurementService,
    trackedStudy,
    trackedSeries,
    debouncedMeasurementChangeTimestamp,
  ]);

  const updateDisplayStudySummary = async () => {
    if (trackedMeasurements.matches('tracking')) {
      const StudyInstanceUID = trackedStudy;
      const studyMeta = DicomMetadataStore.getStudy(StudyInstanceUID);
      const instanceMeta = studyMeta.series[0].instances[0];
      const { StudyDate, StudyDescription, ClinicalTrialTimePointID } = instanceMeta;

      const modalities = new Set();
      studyMeta.series.forEach(series => {
        if (trackedSeries.includes(series.SeriesInstanceUID)) {
          modalities.add(series.instances[0].Modality);
        }
      });
      const modality = Array.from(modalities).join('/');

      if (displayStudySummary.key !== StudyInstanceUID) {
        setDisplayStudySummary({
          key: StudyInstanceUID,
          timepoint: currentTimepoint?.trialTimePointId,
          modality,
          description: StudyDescription,
          currentTask: currentTask,
          taskInfo: taskInfo,
        });
      }
    } else if (trackedStudy === '' || trackedStudy === undefined) {
      setDisplayStudySummary({
        key: undefined, //
        timepoint: currentTimepoint?.trialTimePointId,
        modality: '', // 'CT',
        description: '', // 'CHEST/ABD/PELVIS W CONTRAST',
        currentTask: currentTask,
        taskInfo: taskInfo,
      });
    }
  };

  // ~~ DisplayStudySummary
  // evibased, remove dependency on updateDisplayStudySummary function, it will cause infinite loop
  useEffect(() => {
    updateDisplayStudySummary();
  }, [
    displayStudySummary.key,
    trackedMeasurements,
    trackedStudy,
    currentTimepoint,
    currentTask,
  ]);

  // TODO: Better way to consolidated, debounce, check on change?
  // Are we exposing the right API for measurementService?
  // This watches for ALL measurementService changes. It updates a timestamp,
  // which is debounced. After a brief period of inactivity, this triggers
  // a re-render where we grab up-to-date measurements
  useEffect(() => {
    const added = measurementService.EVENTS.MEASUREMENT_ADDED;
    const addedRaw = measurementService.EVENTS.RAW_MEASUREMENT_ADDED;
    const updated = measurementService.EVENTS.MEASUREMENT_UPDATED;
    const removed = measurementService.EVENTS.MEASUREMENT_REMOVED;
    const cleared = measurementService.EVENTS.MEASUREMENTS_CLEARED;
    const subscriptions = [];

    [added, addedRaw, updated, removed, cleared].forEach(evt => {
      subscriptions.push(
        measurementService.subscribe(evt, data => {
          setMeasurementsUpdated(Date.now().toString());
          if (evt === added) {
            debounce(() => {
              measurementsPanelRef.current.scrollTop = measurementsPanelRef.current.scrollHeight;
            }, 300)();

            // evibased, 4种测量工具, call command setMeasurementLabel for newly added measurement(label is '' or 'no label')
            if (['Length', 'Bidirectional', 'ArrowAnnotate', 'RectangleROI'].includes(data.measurement.toolName)) {
              if (data.measurement.label === '' || data.measurement.label === 'no label') {
                commandsManager.runCommand('setIRCMeasurementLabel', {
                  uid: data.measurement.uid,
                });
              }
            }
          }
        }).unsubscribe
      );
    });

    return () => {
      subscriptions.forEach(unsub => {
        unsub();
      });
    };
  }, [measurementService, sendTrackedMeasurementsEvent]);

  async function exportReport() {
    const measurements = measurementService.getMeasurements();
    const trackedMeasurements = measurements.filter(
      m =>
        trackedStudy === m.referenceStudyUID &&
        trackedSeries.includes(m.referenceSeriesUID)
    );

    downloadCSVReport(trackedMeasurements, measurementService);
  }

  // function handle measurement item click
  const jumpToImage = ({ uid, isActive }) => {
    // jump to measurement
    measurementService.jumpToMeasurement(viewportGrid.activeViewportId, uid);

    // set measurement active
    onMeasurementItemClickHandler({ uid, isActive });
  };

  // evibased, jump to compared measurement
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

  // TODO: evibased, 重构，和extension cornerstone callInputDialog统一代码
  const onMeasurementItemEditHandler = ({ uid, isActive }) => {
    const measurement = measurementService.getMeasurement(uid);
    // if readonly mode, not editable
    if (commandsManager.getContext('CORNERSTONE').ifReadonlyMode) {
      measurement.readonly = true;
      return;
    }

    const dialogId = 'enter-annotation';
    jumpToImage({ uid, isActive });
    const dialogTitle = t('Dialog:Annotation');
    const isArrowAnnotateTool = measurement && measurement.toolName.toLowerCase().includes('arrow');
    const valueDialog = parseMeasurementLabelInfo(measurement);

    // for dialog sumbit button
    const onSubmitHandler = ({ action, value }) => {
      switch (action.id) {
        case 'save': {
          // copy measurement
          const updatedMeasurement = { ...measurement };
          updatedMeasurement['measurementLabelInfo'] = value['measurementLabelInfo'];
          updatedMeasurement['label'] = value['label'].join('|');

          measurementService.update(uid, updatedMeasurement, true);
        }
      }
      uiDialogService.dismiss({ id: dialogId });
    };

    uiDialogService.create(
      getEditMeasurementLabelDialog(
        dialogId,
        dialogTitle,
        valueDialog,
        isArrowAnnotateTool,
        uiDialogService,
        onSubmitHandler
    ));
  };

  const onMeasurementItemClickHandler = ({ uid, isActive }) => {
    if (!isActive) {
      const measurements = [...displayMeasurements];
      const measurement = measurements.find(m => m.uid === uid);

      measurements.forEach(m => (m.isActive = m.uid !== uid ? false : true));
      measurement.isActive = true;
      setDisplayMeasurements(measurements);
    }
  };

  // evibased, initial flag, get taskInfo
  useEffect(() => {
    console.log('successSaveReport:', successSaveReport);
    _refreshTaskInfo(successSaveReport);
  }, [ successSaveReport ]);

  async function _refreshTaskInfo(navigateToNextTask = false) {
    // get taskInfo
    const userTasks = await _getUserTaskInfo();
    let nextTask = undefined;
    let taskInfo = {
      nextTask: nextTask,
      totalTask: undefined,
      userTasks: [],
    };
    if (userTasks.length > 0) {
      // get next task study
      for (const task of userTasks) {
        if (task.timepoint.UID !== StudyInstanceUIDs[0]) {
          nextTask = task;
          break;
        }
      }
      taskInfo = {
        nextTask: nextTask,
        totalTask: userTasks.length,
        userTasks: userTasks,
      };
    }

    if (navigateToNextTask) {
      // auto go to next task
      _navigateToNextTask(nextTask);
    } else {
      // update taskInfo
      sendTrackedMeasurementsEvent('UPDATE_TASK_INFO', {
        taskInfo: taskInfo,
      });
    }

    return taskInfo;
  }

  async function _navigateToNextTask(nextTask) {
    if (!nextTask) {
      navigate('/');
      return;
    }
    const studyUID = nextTask?.timepoint?.UID;
    const trialId = nextTask?.timepoint?.cycle;
    const ifBaseline = trialId === 0;
    if (ifBaseline) {
      navigate(`/viewer?StudyInstanceUIDs=${studyUID}`);
    } else {
      const qidoForStudyUID = await dataSource.query.studies.search({
        studyInstanceUid: studyUID,
      });
      if (!qidoForStudyUID?.length) {
        // no data for study go back to task list
        navigate('/');
      }
      const studyInfo = qidoForStudyUID[0];
      const comparedStudy = await getStudyInfoByTrialId(dataSource, studyInfo?.mrn, `T${trialId - 1}`);
      navigate(`/viewer?StudyInstanceUIDs=${studyUID},${comparedStudy?.studyInstanceUid}&hangingprotocolId=@ohif/timepointCompare`);
    }
  }

  async function getStudyInfoByTrialId(dataSource, mrn, trialId) {
    const studies = await dataSource.query.studies.search({
      patientId: mrn,
    });
    const comparedStudy = studies.find(s => s.trialTimePointId === trialId);
    return comparedStudy;
  }

  // evibased, get next tsak study
  async function _getUserTaskInfo() {
    try {
      const authHeader = userAuthenticationService.getAuthorizationHeader();
      const username = userAuthenticationService.getUser().profile.preferred_username;
      const getTaskUrl = appConfig['evibased']['task_get_url'];
      const taskStatus = 'create';

      const getTaskResponse = await fetch(`${getTaskUrl}?username=${username}&status=${taskStatus}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: authHeader?.Authorization,
        },
      });
      if (!getTaskResponse.ok) {
        const body = await getTaskResponse.text();
        throw new Error(`HTTP error! status: ${getTaskResponse.status} body: ${body}`);
      }

      let tasks = [];
      if (getTaskResponse.status === 204) {
        // no content
      } else {
        const body = await getTaskResponse.json();
        tasks = Array.isArray(body) ? body : [body];
      }

      // loop tasks and filter
      const filteredTasks = [];
      for (const task of tasks) {
        if (['reading', 'arbitration'].includes(task.type) && ['create'].includes(task.status)) {
          filteredTasks.push(task);
        }
      }
      return filteredTasks;
    } catch (error) {
      console.log(error);
      return [];
    }
  }

  // default 分组显示
  // const displayMeasurementsWithoutFindings = displayMeasurements.filter(
  //   dm => dm.measurementType !== measurementService.VALUE_TYPES.POINT
  // );
  // const additionalFindings = displayMeasurements.filter(
  //   dm => dm.measurementType === measurementService.VALUE_TYPES.POINT
  // );

  // evibased 按照target&nonTarget分组显示
  const targetFindings = [];
  const nonTargetFindings = [];
  const otherFindings = [];
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
  // sort by index, get index from label, TODO: get index from measurementLabelInfo
  targetFindings.sort((a, b) => parseInt(a.label.split('|')[0]) - parseInt(b.label.split('|')[0]));
  nonTargetFindings.sort((a, b) => parseInt(a.label.split('|')[0]) - parseInt(b.label.split('|')[0]));
  otherFindings.sort((a, b) => parseInt(a.label.split('|')[0]) - parseInt(b.label.split('|')[0]));

  function _mapComparedMeasurementToDisplay(measurement, index) {
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
    // only bidirectional shows displayText for now
    const displayText = Width && Length ? [`${Length.toFixed(2)} x ${Width.toFixed(2)} ${Unit}`] : ['无测量信息'];

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

  // evibased, get compared timepoint report
  const getComparedTimepointReport = () => {
    const {
      studyInstanceUid,
      date,
      description,
      numInstances,
      modalities,
      displaySets,
      trialTimePointId,
      reports,
    } = comparedTimepoint;
    const trialTimePointInfo = trialTimePointId ? getTimepointName(trialTimePointId.slice(1)) : '';
    // TODO: 现在只取第一个report，后续看是否需要针对展现所有人的report
    const report = reports?.[0];

    const targetFindings = [];
    const nonTargetFindings = [];
    const otherFindings = [];
    let SOD = undefined;
    let response = undefined;
    let username = null;
    let userAlias = null;
    if (report) {
      username = report.username;
      userAlias = report.task?.userAlias;
      SOD = report.SOD;
      response = report.response;
      const displayMeasurements = report.measurements.map((m, index) => _mapComparedMeasurementToDisplay(m, index));
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
          // username={userAlias ? userAlias : username}
          username={username} // only for reading task now, show username instead of userAlias
          SOD={SOD}
          response={response}
          isActive={extendedComparedReport}
          onClick={() => {
            setExtentedComparedReport(!extendedComparedReport);
          }}
          onReportClick={() => {
            getPastReportDialog(uiDialogService, report);
          }}
          data-cy="compared-report-list"
        />
        {extendedComparedReport && username && (
          <>
            <MeasurementTable
              title={`${t('MeasurementTable:Target Findings')}(最多5个)`}
              ifTarget={true}
              data={targetFindings}
              servicesManager={servicesManager}
              onClick={jumpToComparedMeasurement}
              canEdit={false}
            />
            {nonTargetFindings.length > 0 && (
              <MeasurementTable
                title={t('MeasurementTable:Non-Target Findings')}
                data={nonTargetFindings}
                servicesManager={servicesManager}
                onClick={jumpToComparedMeasurement}
                canEdit={false}
              />
            )}
            {otherFindings.length > 0 && (
              <MeasurementTable
                title={t('MeasurementTable:Other Findings')}
                data={otherFindings}
                servicesManager={servicesManager}
                onClick={jumpToComparedMeasurement}
                canEdit={false}
              />
            )}
          </>
        )}
      </React.Fragment>
    );
  };

  return (
    <>
      <div className="ohif-scrollbar invisible-scrollbar flex flex-1 flex-col overflow-auto">
        <div
          className="invisible-scrollbar overflow-y-visible overflow-x-visible"
          ref={measurementsPanelRef}
          data-cy={'trackedMeasurements-panel'}
        >
          {displayStudySummary.taskInfo && (
            <TimePointSummary
              // evibased
              extensionManager={extensionManager}
              currentTask={displayStudySummary.currentTask}
              taskInfo={displayStudySummary.taskInfo}
              timepoint={displayStudySummary.timepoint ? displayStudySummary.timepoint.slice(1) : undefined}
              lastTimepointInfo={lastTimepoint}
              currentLabels={targetFindings.length + nonTargetFindings.length}
            />
          )}
          <MeasurementTable
            title={`${t('MeasurementTable:Target Findings')}(最多5个)`}
            ifTarget={true}
            data={targetFindings}
            servicesManager={servicesManager}
            onClick={jumpToImage}
            onEdit={onMeasurementItemEditHandler}
          />
          <MeasurementTable
            title={t('MeasurementTable:Non-Target Findings')}
            data={nonTargetFindings}
            servicesManager={servicesManager}
            onClick={jumpToImage}
            onEdit={onMeasurementItemEditHandler}
          />
          {otherFindings.length > 0 && (
            <MeasurementTable
              title={t('MeasurementTable:Other Findings')}
              data={otherFindings}
              servicesManager={servicesManager}
              onClick={jumpToImage}
              onEdit={onMeasurementItemEditHandler}
            />
          )}
        </div>
        {!appConfig?.disableEditing && (
          <div className="flex justify-center p-4">
            <ActionButtons
              userRoles={userRoles}
              onExportClick={exportReport}
              onCreateReportClick={() => {
                sendTrackedMeasurementsEvent('SAVE_REPORT', {
                  viewportId: viewportGrid.activeViewportId,
                  isBackupSave: true,
                });
              }}
              // can create report when no measurement
            // disabled={
              //   (targetFindings.length === 0 &&
            //   nonTargetFindings.length === 0) || successSaveReport
              // }
            />
          </div>
        )}
        {(currentTask?.type === 'reading' && comparedTimepoint) && (
          getComparedTimepointReport()
        )}
      </div>
    </>
  );
}

PanelMeasurementTableTracking.propTypes = {
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

// evibased, convert measurements, based on core>utils>dowanloadCSVReport.js
function _convertToReportMeasurements(measurementData) {
  const columns = [
    'Patient ID',
    'Patient Name',
    'StudyInstanceUID',
    'SeriesInstanceUID',
    'SOPInstanceUID',
    'Label',
  ];

  const reportMap = {};
  measurementData.forEach(measurement => {
    const { referenceStudyUID, referenceSeriesUID, getReport, uid } = measurement;

    if (!getReport) {
      console.warn('Measurement does not have a getReport function');
      return;
    }

    const seriesMetadata = DicomMetadataStore.getSeries(referenceStudyUID, referenceSeriesUID);

    const commonRowItems = _getCommonRowItems(measurement, seriesMetadata);
    const report = getReport(measurement);

    reportMap[uid] = {
      report,
      commonRowItems,
    };
  });

  // get columns names inside the report from each measurement and
  // add them to the rows array (this way we can add columns for any custom
  // measurements that may be added in the future)
  Object.keys(reportMap).forEach(id => {
    const { report } = reportMap[id];
    report.columns.forEach(column => {
      if (!columns.includes(column)) {
        columns.push(column);
      }
    });
  });

  const results = _mapReportsToMeasurements(reportMap, columns);
  return results;
}

function _getCommonRowItems(measurement, seriesMetadata) {
  const firstInstance = seriesMetadata.instances[0];

  return {
    'Patient ID': firstInstance.PatientID, // Patient ID
    'Patient Name': firstInstance.PatientName?.Alphabetic || '', // Patient Name
    StudyInstanceUID: measurement.referenceStudyUID, // StudyInstanceUID
    SeriesInstanceUID: measurement.referenceSeriesUID, // SeriesInstanceUID
    SOPInstanceUID: measurement.SOPInstanceUID, // SOPInstanceUID
    Label: measurement.label || '', // Label
  };
}

function _mapReportsToMeasurements(reportMap, columns) {
  const results = [];
  Object.keys(reportMap).forEach(id => {
    const { report, commonRowItems } = reportMap[id];
    const item = {};
    // For commonRowItems, find the correct index and add the value to the
    // correct row in the results array
    Object.keys(commonRowItems).forEach(key => {
      // const index = columns.indexOf(key);
      const value = commonRowItems[key];
      item[key] = value;
    });

    // For each annotation data, find the correct index and add the value to the
    // correct row in the results array
    report.columns.forEach((column, index) => {
      // const colIndex = columns.indexOf(column);
      const value = report.values[index];
      item[column] = value;
    });

    results.push(item);
  });

  return results;
}

export default PanelMeasurementTableTracking;
