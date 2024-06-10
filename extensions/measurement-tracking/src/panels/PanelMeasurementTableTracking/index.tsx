import React, { useEffect, useState, useRef } from 'react';
import PropTypes from 'prop-types';
import { useImageViewer, Select, useViewportGrid, Input } from '@ohif/ui';
import TimePointSummary from '../../ui/TimePointSummary';
import MeasurementTable from '../../ui/MeasurementTable';
import ActionButtons from './ActionButtons';
import { DicomMetadataStore, utils } from '@ohif/core';
import { useDebounce } from '@hooks';
import { useAppConfig } from '@state';
import { useTrackedMeasurements } from '../../getContextModule';
import debounce from 'lodash.debounce';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  LesionMapping,
  targetKeyGroup,
  nonTargetKeyGroup,
  imageQualityOptions,
  imageQualityMapping,
  NonMeasurementTools,
  newLesionKeyGroup,
} from '../../utils/mappings';
import PastReportItem from '../../ui/PastReportItem';
import { getPastReportDialog, getTimepointName, getViewportId, mapMeasurementToDisplay } from '../../utils/utils';
import callInputDialog from '../../utils/callInputDialog';
import { RecistV11Validator } from '../../utils/RecistV11Validator';

const { downloadCSVReport } = utils;

// evibased, 右边栏上部显示的信息
const DISPLAY_STUDY_SUMMARY_INITIAL_VALUE = {
  key: undefined, // deprecated
  timepoint: undefined,
  modality: '', // deprecated
  description: '', // deprecated
  currentTask: undefined,
  taskInfo: undefined, // task info
};

function PanelMeasurementTableTracking({ servicesManager, extensionManager, commandsManager }) {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const dataSources = extensionManager.getDataSources();
  const dataSource = dataSources[0]; // evibased, datasource never changed
  const { StudyInstanceUIDs } = useImageViewer();
  const [viewportGrid] = useViewportGrid();
  const [measurementChangeTimestamp, setMeasurementsUpdated] = useState(Date.now().toString());
  const debouncedMeasurementChangeTimestamp = useDebounce(measurementChangeTimestamp, 200);
  const {
    measurementService,
    uiDialogService,
    displaySetService,
    customizationService,
    userAuthenticationService, // evibased, get username and roles
    logSinkService, // evibased, audit log service to backend
  } = servicesManager.services;
  const [trackedMeasurements, sendTrackedMeasurementsEvent] = useTrackedMeasurements();
  // evibased, successSaveReport is flag after save report
  const {
    trackedStudy,
    trackedSeries,
    taskInfo,
    successSaveReport,
    currentReportInfo,
    currentTimepoint,
    lastTimepoint,
    comparedTimepoint,
    comparedReportInfo,
    readonlyMode,
    username,
    userRoles,
    currentTask,
  } = trackedMeasurements.context;
  const [displayStudySummary, setDisplayStudySummary] = useState(
    DISPLAY_STUDY_SUMMARY_INITIAL_VALUE
  );
  const [displayMeasurements, setDisplayMeasurements] = useState([]);
  const measurementsPanelRef = useRef(null);
  const [appConfig] = useAppConfig();
  const [extendedComparedReport, setExtentedComparedReport] = useState(true);
  // evibased, value for imageQuality, default is image_qualified
  const [imageQuality, setImageQuality] = useState({
    value: 'image_qualified',
    label: imageQualityMapping['image_qualified'],
  });
  const [imageQualityDescription, setImageQualityDescription] = useState('');

  // measuremnts updated, update displayMeasurements
  useEffect(() => {
    const measurements = measurementService.getMeasurements();
    const filteredMeasurements = measurements.filter(
      m => trackedStudy === m.referenceStudyUID && trackedSeries.includes(m.referenceSeriesUID)
    );
    const mappedMeasurements = filteredMeasurements.map(m =>
      mapMeasurementToDisplay(m, displaySetService)
    );
    setDisplayMeasurements(mappedMeasurements);
    // eslint-ignore-next-line
  }, [measurementService, trackedStudy, trackedSeries, debouncedMeasurementChangeTimestamp]);

  const updateDisplayStudySummary = () => {
    // old study summary info, tracked study and series info
    // const StudyInstanceUID = trackedStudy;
    // const studyMeta = DicomMetadataStore.getStudy(StudyInstanceUID);
    // const instanceMeta = studyMeta.series[0].instances[0];
    // const { StudyDate, StudyDescription, ClinicalTrialTimePointID } = instanceMeta;

    // const modalities = new Set();
    // studyMeta.series.forEach(series => {
    //   if (trackedSeries.includes(series.SeriesInstanceUID)) {
    //     modalities.add(series.instances[0].Modality);
    //   }
    // });
    // const modality = Array.from(modalities).join('/');

    // evibased, study summary info at top right corner
    setDisplayStudySummary({
      key: null,
      timepoint: currentTimepoint?.trialTimePointId,
      modality: null,
      description: null,
      currentTask: currentTask,
      taskInfo: taskInfo,
    });
  };

  // update DisplayStudySummary
  // evibased, remove dependency on updateDisplayStudySummary function, it will cause infinite loop
  useEffect(() => {
    updateDisplayStudySummary();
  }, [trackedMeasurements, currentTimepoint, currentTask, taskInfo]);

  // subscribe to measurementService changes
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
            if (
              ['Length', 'Bidirectional', 'ArrowAnnotate', 'RectangleROI'].includes(
                data.measurement.toolName
              )
            ) {
              if (data.measurement.label === '' || data.measurement.label === 'no label') {
                _editMeasurementLabel(
                  commandsManager,
                  readonlyMode,
                  userAuthenticationService,
                  uiDialogService,
                  measurementService,
                  logSinkService,
                  data.measurement.uid,
                  comparedReportInfo
                );
              }
            }
          }
        }).unsubscribe
      );
    });

    const edit = measurementService.EVENTS.TRACKED_MEASUREMENT_EDIT;
    const editSub = measurementService.subscribe(edit, data => {
      _editMeasurementLabel(
        commandsManager,
        readonlyMode,
        userAuthenticationService,
        uiDialogService,
        measurementService,
        logSinkService,
        data.uid,
        comparedReportInfo
      );
    });
    subscriptions.push(editSub.unsubscribe);

    return () => {
      subscriptions.forEach(unsub => {
        unsub();
      });
    };
  }, [measurementService, sendTrackedMeasurementsEvent, comparedReportInfo, readonlyMode]);

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
    jumpToImage({ uid, isActive });
    // evibased, edit label
    _editMeasurementLabel(
      commandsManager,
      readonlyMode,
      userAuthenticationService,
      uiDialogService,
      measurementService,
      logSinkService,
      uid,
      comparedReportInfo
    );

    // 参考auto label completion
    // const labelConfig = customizationService.get('measurementLabels');
    // const measurement = measurementService.getMeasurement(uid);
    // const utilityModule = extensionManager.getModuleEntry(
    //   '@ohif/extension-cornerstone.utilityModule.common'
    // );
    // const { showLabelAnnotationPopup } = utilityModule.exports;
    // showLabelAnnotationPopup(measurement, uiDialogService, labelConfig).then(
    //   (val: Map<any, any>) => {
    //     measurementService.update(
    //       uid,
    //       {
    //         ...val,
    //       },
    //       true
    //     );
    //   }
    // );
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
  }, [successSaveReport, currentTask]);

  // update compared report info based on comparedTimepoint
  useEffect(() => {
    if (!comparedTimepoint) {
      return;
    }
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
    // const trialTimePointInfo = trialTimePointId ? getTimepointName(trialTimePointId) : '';
    // 现在只取第一个report，作为阅片任务的对比报告
    const report = reports?.[0];

    const targetFindings = [];
    const newLesionFindings = [];
    const nonTargetFindings = [];
    const otherFindings = [];
    if (report) {
      const displayMeasurements = report.measurements.map((m, index) =>
        _mapComparedMeasurementToDisplay(m, index, displaySetService)
      );
      for (const dm of displayMeasurements) {
        // get target info
        const lesionValue = dm.label.split('|')[1];
        if (!(lesionValue in LesionMapping)) {
          // not in LesionMapping, just show and allow edit in other group
          otherFindings.push(dm);
        } else if (targetKeyGroup.includes(lesionValue)) {
          targetFindings.push(dm);
        } else if (newLesionKeyGroup.includes(lesionValue)) {
          // new lesion group check before non target group, non target group includes new lesion keys
          newLesionFindings.push(dm);
        } else if (nonTargetKeyGroup.includes(lesionValue)) {
          nonTargetFindings.push(dm);
        } else {
          otherFindings.push(dm);
        }
      }
    }
    // sort by index, get index from label, TODO: get index from measurementlabelInfo
    targetFindings.sort(
      (a, b) => parseInt(a.label.split('|')[0]) - parseInt(b.label.split('|')[0])
    );
    newLesionFindings.sort(
      (a, b) => parseInt(a.label.split('|')[0]) - parseInt(b.label.split('|')[0])
    );
    nonTargetFindings.sort(
      (a, b) => parseInt(a.label.split('|')[0]) - parseInt(b.label.split('|')[0])
    );
    otherFindings.sort((a, b) => parseInt(a.label.split('|')[0]) - parseInt(b.label.split('|')[0]));

    // update compared report
    sendTrackedMeasurementsEvent('UPDATE_COMPARED_REPORT', {
      comparedReportInfo: {
        report: report,
        targetFindings: targetFindings,
        newLesionFindings: newLesionFindings,
        nonTargetFindings: nonTargetFindings,
        otherFindings: otherFindings,
      },
    });
  }, [comparedTimepoint]);

  // report loaded, update data on this page
  useEffect(() => {
    if (currentReportInfo) {
      // update imageQuality and imageQualityDescription
      if (currentReportInfo?.imageQuality) {
        setImageQuality(currentReportInfo.imageQuality?.selection);
        setImageQualityDescription(currentReportInfo.imageQuality?.description);
      } else {
        // report imageQuality is empty, set default value
        setImageQuality({
          value: null,
          label: null,
        });
        setImageQualityDescription('');
      }
    }
  }, [currentReportInfo]);

  async function _refreshTaskInfo(navigateToNextTask = false) {
    // get taskInfo
    const userTasks = await _getUserTaskInfo();
    let nextTask = undefined;
    if (userTasks && userTasks.length > 0) {
      // get next task info,
      for (const task of userTasks) {
        if (task.timepoint.UID !== StudyInstanceUIDs[0]) {
          // the next task that is not current task
          nextTask = task;
          break;
        }
      }
    }

    if (navigateToNextTask) {
      // auto go to next task
      _navigateToNextTask(nextTask);
    } else {
      // update taskInfo
      sendTrackedMeasurementsEvent('UPDATE_TASK_INFO', {
        taskInfo: {
          nextTask: nextTask,
          totalTask: userTasks ? userTasks.length : 0,
          userTasks: userTasks ? userTasks : [],
        },
      });
    }

    return taskInfo;
  }

  // evibased, deprecated, call downloadCSVReport function
  // async function exportReport() {
  //   const measurements = measurementService.getMeasurements();
  //   const trackedMeasurements = measurements.filter(
  //     m => trackedStudy === m.referenceStudyUID && trackedSeries.includes(m.referenceSeriesUID)
  //   );

  //   downloadCSVReport(trackedMeasurements, measurementService);
  // }

  // evibased, edit report button
  function createReport() {
    // audit log, create report
    logSinkService._broadcastEvent(logSinkService.EVENTS.LOG_ACTION, {
      msg: 'enter edit report page',
      action: 'VIEWER_EDIT_REPORT',
      username: userAuthenticationService.getUser().profile.preferred_username,
      authHeader: userAuthenticationService.getAuthorizationHeader(),
      data: {
        action_result: 'success',
        imageQuality: {
          selection: imageQuality,
          description: imageQualityDescription,
        },
      },
    });

    sendTrackedMeasurementsEvent('SAVE_REPORT', {
      taskType: currentTask?.type,
      imageQuality: {
        selection: imageQuality,
        description: imageQualityDescription,
      },
      viewportId: viewportGrid.activeViewportId,
      isBackupSave: true,
    });
  }

  // evibased, get next tsak study
  async function _getUserTaskInfo() {
    try {
      // const authHeader = userAuthenticationService.getAuthorizationHeader();
      const username = userAuthenticationService.getUser().profile.preferred_username;
      // taskType
      const taskType = currentTask?.type;
      if (!taskType) {
        return [];
      }
      let taskTypeFilterList = [];
      if (['review', 'reading', 'arbitration'].includes(taskType)) {
        taskTypeFilterList = ['review', 'reading', 'arbitration'];
      } else if (['QC-data', 'QC-report', 'QC'].includes(taskType)) {
        taskTypeFilterList = ['QC-data', 'QC-report', 'QC'];
      }
      if (taskTypeFilterList.length === 0) {
        return [];
      }
      const taskStatusFilter = 'create';
      // build graphql query
      const url = new URL(appConfig['evibased']['graphqlDR']);
      const headers = new Headers();
      headers.append('Content-Type', 'application/json');
      const graphql = JSON.stringify({
        query: `query GetUserTaskInfo {
          tasks(search: "username:${username},type:${taskTypeFilterList.join('+')},status:${taskStatusFilter}") {
            username
            type
            timepoint {
              UID
              status
              cycle
              subject {
                id
                subjectId
                timepoints {
                  UID
                }
              }
            }
            status
            userAlias
            id
          }
        }`,
        variables: {},
      });
      const requestOptions = {
        method: 'POST',
        headers: headers,
        body: graphql,
      };
      const response = await fetch(url, requestOptions);
      if (!response.ok) {
        const body = await response.text();
        throw new Error(`HTTP error! status: ${response.status} body: ${body}`);
      }

      let userTasks = [];
      const body = await response.json();
      if (response.status >= 200 && response.status < 300) {
        userTasks = body.data.tasks;
      } else {
        console.error(`HTTP error! status: ${response.status} body: ${body}`);
      }

      return userTasks;
    } catch (error) {
      console.log(error);
      return [];
    }
  }

  // evibased, after save report, go to next task
  async function _navigateToNextTask(nextTask) {
    if (!nextTask || !nextTask.timepoint) {
      navigate('/');
      return;
    }
    const timepoint = nextTask.timepoint;
    const studyUID = timepoint.UID;
    const trialId = timepoint.cycle;
    const ifBaseline = trialId === 0 || trialId === '0' || trialId === '00'; // now '00' is baseline, other form are deprecated
    if (ifBaseline) {
      navigate(`/viewer?StudyInstanceUIDs=${studyUID}`);
    } else {
      // get compared timepoint UID
      const timepoints = timepoint.subject.timepoints;
      // UID in timepoints is in descending order, "00", "01", "02", ...
      // get index of studyUID in timepoints
      const index = timepoints.findIndex(tp => tp.UID === studyUID);
      if (index === -1) {
        // no studyUID in timepoints, data error, go back to task list
        navigate('/');
      } else if (index === 0) {
        // first timepoint?? should not happen
        navigate(`/viewer?StudyInstanceUIDs=${studyUID}`);
      }
      const comparedUID = timepoints[index - 1].UID;
      navigate(
        `/viewer?StudyInstanceUIDs=${studyUID},${comparedUID}&hangingprotocolId=@ohif/timepointCompare`
      );
    }
  }

  // evibased, default 分组显示, deprecated
  // const displayMeasurementsWithoutFindings = displayMeasurements.filter(
  //   dm => dm.measurementType !== measurementService.VALUE_TYPES.POINT
  // );
  // const additionalFindings = displayMeasurements.filter(
  //   dm => dm.measurementType === measurementService.VALUE_TYPES.POINT
  // );

  // evibased 按照target&nonTarget分组显示
  // TODO: put these in a useEffect to avoid re-rendering?
  const targetFindings = [];
  const newLesionFindings = [];
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
    } else if (newLesionKeyGroup.includes(lesionValue)) {
      // new lesion group check before non target group, non target group includes new lesion keys
      newLesionFindings.push(dm);
    } else if (nonTargetKeyGroup.includes(lesionValue)) {
      nonTargetFindings.push(dm);
    } else {
      otherFindings.push(dm);
    }
  }
  // sort by index, get index from label, TODO: get index from measurementLabelInfo
  targetFindings.sort((a, b) => parseInt(a.label.split('|')[0]) - parseInt(b.label.split('|')[0]));
  newLesionFindings.sort(
    (a, b) => parseInt(a.label.split('|')[0]) - parseInt(b.label.split('|')[0])
  );
  nonTargetFindings.sort(
    (a, b) => parseInt(a.label.split('|')[0]) - parseInt(b.label.split('|')[0])
  );
  otherFindings.sort((a, b) => parseInt(a.label.split('|')[0]) - parseInt(b.label.split('|')[0]));

  // validate target and non-target findings
  let validationInfo = undefined;
  try {
    const recistValidator = new RecistV11Validator();
    recistValidator.setBaseline(currentTimepoint?.ifBaseline);
    recistValidator.setTargetMeasurements(targetFindings);
    recistValidator.setNewLesionMeasurements(newLesionFindings);
    recistValidator.setNonTargetMeasurements(nonTargetFindings);
    if (comparedTimepoint && comparedReportInfo) {
      const { targetFindings, newLesionFindings, nonTargetFindings } = comparedReportInfo;
      recistValidator.setLastTargetMeasurements(targetFindings);
      recistValidator.setLastNewLesionMeasurements(newLesionFindings);
      recistValidator.setLastNonTargetMeasurements(nonTargetFindings);
    }
    recistValidator.validate();
    validationInfo = recistValidator.getValidationInfo();
  } catch (error) {
    console.error('validation error:', error);
  }

  // evibased, get compared timepoint report
  // TODO: put these in a useEffect to avoid re-rendering?
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
    const { report, targetFindings, newLesionFindings, nonTargetFindings, otherFindings } =
      comparedReportInfo;
    const trialTimePointName = trialTimePointId ? getTimepointName(trialTimePointId) : '';
    let SOD = undefined;
    let response = undefined;
    let username = null;
    let userAlias = null;
    if (report) {
      username = report.username;
      userAlias = report.task?.userAlias;
      SOD = report.SOD;
      response = report.response;
    }

    return (
      <React.Fragment key={studyInstanceUid + '-pastReport'}>
        <PastReportItem
          studyInstanceUid={studyInstanceUid}
          trialTimePointInfo={trialTimePointName}
          // username={userAlias ? userAlias : username}
          username={username} // only for review task now, show username instead of userAlias
          SOD={SOD}
          response={response}
          isActive={extendedComparedReport}
          onClick={() => {
            setExtentedComparedReport(!extendedComparedReport);
          }}
          onReportClick={event => {
            event.stopPropagation();
            getPastReportDialog(uiDialogService, trialTimePointName, report);
          }}
          data-cy="compared-report-list"
        />
        {extendedComparedReport && username && (
          <>
            <MeasurementTable
              title={`${t('MeasurementTable:Target Findings')}`}
              ifTarget={true}
              data={targetFindings}
              tableID="comp-target-findings"
              servicesManager={servicesManager}
              onClick={jumpToComparedMeasurement}
              canEdit={false}
            />
            {newLesionFindings.length > 0 && (
              <MeasurementTable
                title={t('MeasurementTable:Non-Target Findings')}
                data={newLesionFindings}
                ifNewLesion={true}
                tableID="comp-new-lesion-findings"
                servicesManager={servicesManager}
                onClick={jumpToComparedMeasurement}
                canEdit={false}
              />
            )}
            {nonTargetFindings.length > 0 && (
              <MeasurementTable
                title={t('MeasurementTable:Non-Target Findings')}
                data={nonTargetFindings}
                tableID="comp-non-target-findings"
                servicesManager={servicesManager}
                onClick={jumpToComparedMeasurement}
                canEdit={false}
              />
            )}
            {otherFindings.length > 0 && (
              <MeasurementTable
                title={t('MeasurementTable:Other Findings')}
                data={otherFindings}
                tableID="comp-other-findings"
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
          className="invisible-scrollbar overflow-x-visible overflow-y-visible"
          ref={measurementsPanelRef}
          data-cy={'trackedMeasurements-panel'}
        >
          {displayStudySummary.taskInfo && (
            <TimePointSummary
              // evibased
              extensionManager={extensionManager}
              currentTask={displayStudySummary.currentTask}
              taskInfo={displayStudySummary.taskInfo}
              timepoint={displayStudySummary.timepoint}
              lastTimepointInfo={lastTimepoint}
              currentLabels={targetFindings.length + nonTargetFindings.length}
            />
          )}
          {/* image quality */}
          <div className="">
            <label className="text-[14px] leading-[1.2] text-white">影像质量评估</label>
            <Select
              id="imageQuality"
              isClearable={false}
              placeholder="影像质量评估"
              value={[imageQuality ? imageQuality.value : 'image_qualified']}
              onChange={(newSelection, action) => {
                console.info('newSelection:', newSelection, 'action:', action);
                setImageQuality(newSelection);
              }}
              options={imageQualityOptions}
              // isDisabled={true}
            />
            <Input
              className="border-primary-main bg-black"
              type="text"
              id="image-quality-description"
              labelClassName="hidden text-white text-[10px] leading-[1.2]"
              smallInput={true}
              placeholder="影像质量描述"
              value={imageQualityDescription}
              onChange={event => {
                event.persist();
                setImageQualityDescription(event.target.value);
              }}
              onKeyUp={event => {
                event.persist();
                if (event.key === 'Enter') {
                  setImageQualityDescription(event.target.value);
                }
              }}
            />
          </div>
          {/* target lesions */}
          <MeasurementTable
            title={`${t('MeasurementTable:Target Findings')}`}
            ifTarget={true}
            data={targetFindings}
            servicesManager={servicesManager}
            onClick={jumpToImage}
            onEdit={onMeasurementItemEditHandler}
            tableID="target-findings" //evibased, add tableID when ID is needed
            tableWarningInfo={validationInfo?.targetGroupWarningMessages}
          />
          {/* new lesions */}
          {newLesionFindings.length > 0 && (
            <MeasurementTable
              title={'新发病灶'}
              ifNewLesion={true}
              data={newLesionFindings}
              servicesManager={servicesManager}
              onClick={jumpToImage}
              onEdit={onMeasurementItemEditHandler}
              tableID="new-lesion-findings" //evibased, add tableID when ID is needed
              tableWarningInfo={validationInfo?.newLesionGroupWarningMessages}
            />
          )}
          {/* non target lesions */}
          <MeasurementTable
            title={t('MeasurementTable:Non-Target Findings')}
            data={nonTargetFindings}
            servicesManager={servicesManager}
            onClick={jumpToImage}
            onEdit={onMeasurementItemEditHandler}
            tableID="non-target-findings" //evibased, add tableID when ID is needed
            tableWarningInfo={validationInfo?.nonTargetGroupWarningMessages}
          />
          {/* other lesions */}
          {otherFindings.length > 0 && (
            <MeasurementTable
              title={t('MeasurementTable:Other Findings')}
              data={otherFindings}
              servicesManager={servicesManager}
              onClick={jumpToImage}
              onEdit={onMeasurementItemEditHandler}
              tableID="other-findings" //evibased, add tableID when ID is needed
            />
          )}
        </div>
        {/* report button */}
        {!appConfig?.disableEditing && (
          <div className="flex justify-center p-4">
            <ActionButtons
              userRoles={userRoles}
              readonlyMode={readonlyMode}
              // onExportClick={exportReport}
              onCreateReportClick={createReport}
              // todo: 对于查看报告的情况分类disable button：
              // 1. 阅片任务，未选择影像质量，disable
              // 2. 其他任务，不做disable？
              // disabled={!imageQuality?.value}
            />
          </div>
        )}
        {/* evibased, only review has compared report section? */}
        {['review', 'reading'].includes(currentTask?.type) &&
          comparedTimepoint &&
          comparedReportInfo &&
          getComparedTimepointReport()}
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

// evibased, edit measurement info dialog
function _editMeasurementLabel(
  commandsManager,
  readonlyMode,
  userAuthenticationService,
  uiDialogService,
  measurementService,
  logSinkService,
  uid,
  comparedReportInfo
) {
  const measurement = measurementService.getMeasurement(uid);
  const isNonMeasurementTool = measurement && NonMeasurementTools.includes(measurement.toolName);

  // if readonly mode, no editing
  if (readonlyMode) {
    return;
  }
  // deprecated, readonly mode
  // if (commandsManager.getContext('CORNERSTONE').measurementReadonly) {
  //   measurement.readonly = true;
  //   return;
  // }

  callInputDialog(
    uiDialogService,
    measurement,
    comparedReportInfo,
    (label, actionId) => {
      if (actionId === 'cancel') {
        return;
      }

      // copy measurement, get measurement again in case it has been updated。
      // 在创建annotation时，会不断更新长度。会导致update measurement为旧的长度错误。
      const currentMeasurement = measurementService.getMeasurement(uid);
      const updatedMeasurement = { ...currentMeasurement };
      // update label data
      updatedMeasurement['measurementLabelInfo'] = label['measurementLabelInfo'];
      updatedMeasurement['label'] = label['label'];
      // update displayText for non target lesions (ArrowAnnotate and Square tool)
      if (label['measurementLabelInfo'].lesion?.value?.startsWith('Non_Target')) {
        if (['ArrowAnnotate', 'RectangleROI'].includes(currentMeasurement.toolName)) {
          // default displayText is ['(太小:5mm,消失:0mm)'], 不适合非靶病灶
          updatedMeasurement['displayText'] = ['不可测量-非靶'];
        }
      }

      // measurementService in platform core service module
      measurementService.update(updatedMeasurement.uid, updatedMeasurement, true); // notYetUpdatedAtSource = true

      // audit log, full measurement info
      logSinkService._broadcastEvent(logSinkService.EVENTS.LOG_ACTION, {
        msg: 'edit measurement label',
        action: 'VIEWER_EDIT_MEASUREMENT',
        username: userAuthenticationService.getUser().profile.preferred_username,
        authHeader: userAuthenticationService.getAuthorizationHeader(),
        data: {
          action_result: 'success',
          measurement: measurement,
        },
      });
    },
    isNonMeasurementTool // isArrowAnnotateInputDialog = false
  );
}

// evibased
function _mapComparedMeasurementToDisplay(measurement, index, displaySetService) {
  const {
    readonlyMeasurementUID,
    Width,
    Length,
    Unit,
    StudyInstanceUID: studyInstanceUid,
    SeriesInstanceUID: seriesInstanceUid,
    Label: baseLabel,
    AnnotationType: type,
    label_info,
  } = measurement;

  const displaySets = displaySetService.getDisplaySetsForSeries(seriesInstanceUid);

  const measurementType = type.split(':')[1];
  const label = baseLabel || '(empty)';
  // only bidirectional shows displayText for now
  let displayText = ['无测量信息'];
  if (measurementType === 'Length' && Length) {
    displayText = [`${Length.toFixed(1)} mm`];
  } else if (measurementType === 'Bidirectional' && Width && Length) {
    displayText = [`${Length.toFixed(1)} x ${Width.toFixed(1)} mm`];
  }
  // const displayText = Width && Length ? [`${Length.toFixed(1)} x ${Width.toFixed(1)} mm`] : ['无测量信息'];

  return {
    uid: readonlyMeasurementUID,
    modality: displaySets[0]?.Modality,
    measurementLabelInfo: label_info,
    label,
    baseLabel,
    measurementType: measurementType,
    displayText,
    baseDisplayText: displayText,
    isActive: false,
    finding: undefined,
    findingSites: undefined,
  };
}

export default PanelMeasurementTableTracking;
