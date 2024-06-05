import React, { useEffect, useState, useRef } from 'react';
import PropTypes from 'prop-types';
import { useImageViewer, Select, useViewportGrid, Input } from '@ohif/ui';
import TimePointSummary from '../../ui/TimePointSummary';
import QCDataProblemTable from '../../ui/QCDataProblemTable';
import ActionButtons from '../PanelMeasurementTableTracking/ActionButtons';
import { useDebounce } from '@hooks';
import { useAppConfig } from '@state';
import { useTrackedMeasurements } from '../../getContextModule';
import debounce from 'lodash.debounce';
import { useNavigate } from 'react-router-dom';
import { imageQualityOptions, imageQualityMapping } from '../../utils/mappings';
import QCDataInputDialog from '../../utils/QCDataInputDialog';

// evibased, 右边栏上部显示的信息
const DISPLAY_STUDY_SUMMARY_INITIAL_VALUE = {
  key: undefined, // deprecated
  timepoint: undefined,
  modality: '', // deprecated
  description: '', // deprecated
  currentTask: undefined,
  taskInfo: undefined, // task info
};

function PanelQCData({ servicesManager, extensionManager, commandsManager }) {
  const navigate = useNavigate();
  const { StudyInstanceUIDs } = useImageViewer();
  const [viewportGrid] = useViewportGrid();
  const [measurementChangeTimestamp, setMeasurementsUpdated] = useState(Date.now().toString());
  const debouncedMeasurementChangeTimestamp = useDebounce(measurementChangeTimestamp, 200);
  const {
    measurementService,
    uiDialogService,
    displaySetService,
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
    comparedReportInfo,
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
      _mapMeasurementToDisplay(m, measurementService.VALUE_TYPES, displaySetService)
    );
    setDisplayMeasurements(mappedMeasurements);
    // eslint-ignore-next-line
  }, [measurementService, trackedStudy, trackedSeries, debouncedMeasurementChangeTimestamp]);

  const updateDisplayStudySummary = () => {
    // evibased, TODO: study summary info at top right corner
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
                _editQCDataInfo(
                  userAuthenticationService,
                  uiDialogService,
                  measurementService,
                  logSinkService,
                  data.measurement.uid
                );
              }
            }
          }
        }).unsubscribe
      );
    });

    const edit = measurementService.EVENTS.TRACKED_MEASUREMENT_EDIT;
    const editSub = measurementService.subscribe(edit, data => {
      _editQCDataInfo(
        userAuthenticationService,
        uiDialogService,
        measurementService,
        logSinkService,
        data.uid
      );
    });
    subscriptions.push(editSub.unsubscribe);

    return () => {
      subscriptions.forEach(unsub => {
        unsub();
      });
    };
  }, [measurementService, sendTrackedMeasurementsEvent, comparedReportInfo]);

  // function handle measurement item click
  const jumpToImage = ({ uid, isActive }) => {
    // jump to measurement
    measurementService.jumpToMeasurement(viewportGrid.activeViewportId, uid);

    // set measurement active
    onMeasurementItemClickHandler({ uid, isActive });
  };

  // evibased, edit label
  const onMeasurementItemEditHandler = ({ uid, isActive }) => {
    jumpToImage({ uid, isActive });
    // evibased, edit label
    _editQCDataInfo(
      userAuthenticationService,
      uiDialogService,
      measurementService,
      logSinkService,
      uid
    );
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

  // evibased, refresh taskInfo
  useEffect(() => {
    console.log('successSaveReport:', successSaveReport);
    _refreshTaskInfo(successSaveReport);
  }, [successSaveReport, currentTask]);

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

  // evibased, edit report button
  function createReport() {
    // audit log, create report
    logSinkService._broadcastEvent(logSinkService.EVENTS.LOG_ACTION, {
      msg: 'enter edit report page',
      action: 'QC_DATA_CREATE_REPORT',
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
      taskType: 'QC-data',
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
      navigate(`/qc-data?StudyInstanceUIDs=${studyUID}`);
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
        navigate(`/qc-data?StudyInstanceUIDs=${studyUID}`);
      }
      navigate(`/qc-data?StudyInstanceUIDs=${studyUID}`);
      // no compare mode for now?
      // const comparedUID = timepoints[index - 1].UID;
      // navigate(
      //   `/qc-data?StudyInstanceUIDs=${studyUID},${comparedUID}&hangingprotocolId=@ohif/timepointCompare`
      // );
    }
  }

  // evibased TODO: 暂时不分组？
  const allFindings = [...displayMeasurements];
  // sort by index, get index from label, TODO: get index from measurementLabelInfo
  allFindings.sort((a, b) => parseInt(a.label.split('|')[0]) - parseInt(b.label.split('|')[0]));

  // TODO: validate?
  let validationInfo = undefined;

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
              currentLabels={allFindings.length}
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
          <QCDataProblemTable
            title={`问题列表`}
            data={allFindings}
            servicesManager={servicesManager}
            onClick={jumpToImage}
            onEdit={onMeasurementItemEditHandler}
            tableID="all-findings" //evibased, add tableID when ID is needed
          />
        </div>
        {/* report button */}
        <div className="flex justify-center p-4">
          <ActionButtons
            userRoles={userRoles}
            onCreateReportClick={createReport}
          />
        </div>
      </div>
    </>
  );
}

PanelQCData.propTypes = {
  servicesManager: PropTypes.shape({
    services: PropTypes.shape({
      measurementService: PropTypes.shape({
        getMeasurements: PropTypes.func.isRequired,
        VALUE_TYPES: PropTypes.object.isRequired,
      }).isRequired,
    }).isRequired,
  }).isRequired,
};

// evibased
function _editQCDataInfo(
  userAuthenticationService,
  uiDialogService,
  measurementService,
  logSinkService,
  uid
) {
  const measurement = measurementService.getMeasurement(uid);

  QCDataInputDialog(uiDialogService, measurement, (label, actionId) => {
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
    // update displayText
    const commentText = label['measurementLabelInfo']?.dataProblemComment || '无注视';
    updatedMeasurement['displayText'] = [commentText];

    // measurementService in platform core service module
    measurementService.update(updatedMeasurement.uid, updatedMeasurement, true); // notYetUpdatedAtSource = true

    // audit log, full measurement info
    logSinkService._broadcastEvent(logSinkService.EVENTS.LOG_ACTION, {
      msg: 'edit QC data info',
      action: 'QC_DATA_EDIT_INFO',
      username: userAuthenticationService.getUser().profile.preferred_username,
      authHeader: userAuthenticationService.getAuthorizationHeader(),
      data: {
        action_result: 'success',
        measurement: measurement,
      },
    });
  });
}

function _mapMeasurementToDisplay(measurement, types, displaySetService) {
  const { referenceStudyUID, referenceSeriesUID, SOPInstanceUID } = measurement;

  const displaySets = displaySetService.getDisplaySetsForSeries(referenceSeriesUID);

  if (!displaySets[0] || !displaySets[0].images) {
    throw new Error('The tracked measurements panel should only be tracking "stack" displaySets.');
  }

  const {
    displayText: baseDisplayText,
    uid,
    label: baseLabel,
    type,
    selected,
    findingSites,
    finding,
    measurementLabelInfo, // evibased, add measurementLabelInfo
    toolName, // evibased
    data, // evibased
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
    measurementLabelInfo, // evibased
    toolName, // evibased
    data, // evibased
    modality: displaySets[0]?.Modality, // evibased
  };
}

export default PanelQCData;
