import React, { useEffect, useState, useRef } from 'react';
import PropTypes from 'prop-types';
import {
  useImageViewer,
  Dialog,
  Select,
  useViewportGrid,
  ButtonEnums,
  TimePointSummary,
  Input,
} from '@ohif/ui';
import MeasurementTable from '../../ui/MeasurementTable';
import { DicomMetadataStore, utils } from '@ohif/core';
import { useDebounce } from '@hooks';
import ActionButtons from './ActionButtons';
import { useTrackedMeasurements } from '../../getContextModule';
import debounce from 'lodash.debounce';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { targetIndexMapping, targetInfoMapping, locationInfoMapping, responseOptions } from '../../utils/mappings';

const { downloadCSVReport } = utils;

// evibased, 右边栏上部显示的信息
const DISPLAY_STUDY_SUMMARY_INITIAL_VALUE = {
  key: undefined,
  timepoint: undefined,
  modality: '', // 'deprecated',
  description: '', // 'deprecated',
  taskInfo: undefined, // task info
};

const targetKeyGroup = ['Target', 'Target_CR', 'Target_UN'];
const nontargetKeyGroup = ['Non_Target', 'Non_Target_Disappear', 'Non_Target_Progress', 'Non_Target_New'];
const otherKeyGroup = ['Other'];

function PanelMeasurementTableTracking({ servicesManager, extensionManager }) {
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
    taskInfo, successSaveReport, currentReportInfo } = trackedMeasurements.context;
  const [displayStudySummary, setDisplayStudySummary] = useState(
    DISPLAY_STUDY_SUMMARY_INITIAL_VALUE
  );
  const [displayMeasurements, setDisplayMeasurements] = useState([]);
  const measurementsPanelRef = useRef(null);
  const [inputSOD, setInputSOD] = useState('总测量值(mm)');
  const [timepointResponse, setTimepointResponse] = useState('Baseline');

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
          timepoint: ClinicalTrialTimePointID ? ClinicalTrialTimePointID : StudyDate,
          modality,
          description: StudyDescription,
          taskInfo: taskInfo,
        });
      }
    } else if (trackedStudy === '' || trackedStudy === undefined) {
      setDisplayStudySummary({
        key: undefined, //
        timepoint: undefined, // '07-Sep-2010',
        modality: '', // 'CT',
        description: '', // 'CHEST/ABD/PELVIS W CONTRAST',
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
        measurementService.subscribe(evt, () => {
          setMeasurementsUpdated(Date.now().toString());
          if (evt === added) {
            debounce(() => {
              measurementsPanelRef.current.scrollTop =
                measurementsPanelRef.current.scrollHeight;
            }, 300)();
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

  const jumpToImage = ({ uid, isActive }) => {
    measurementService.jumpToMeasurement(viewportGrid.activeViewportId, uid);

    onMeasurementItemClickHandler({ uid, isActive });
  };

  // TODO: evibased, 重构，和extension cornerstone callInputDialog统一代码
  const onMeasurementItemEditHandler = ({ uid, isActive }) => {
    const measurement = measurementService.getMeasurement(uid);
    const dialogId = 'enter-annotation';
    jumpToImage({ uid, isActive });

    // label for 保存尽量多的label信息，因为cornerstonejs只支持保存label到DicomSR中
    let label = measurement ? measurement.label : '1|target_info|location_info';
    label = label.split("|")
    if (label.length === 1) {
      label = [1, label[0], 'location_info']
    } else if (label.length < 3) {
      // label at least 3 infos
      label.push('location_info');
    }

    // get measurementLabelInfo, noMeasurement means create Cornerstone3D annotation first just return label to callback!
    // if no measurementLabelInfo, get from label
    const measurementLabelInfo = measurement && measurement['measurementLabelInfo'] ?
      measurement['measurementLabelInfo'] : {}

    const valueDialog = {
      measurementLabelInfo: measurementLabelInfo,
      label: label,
    };

    // init targetValue, locationValue
    let targetIndex = null;
    if ('targetIndex' in measurementLabelInfo) {
      targetIndex = measurementLabelInfo['targetIndex'];
    } else {
      // no target in measurementLabelInfo, get from label
      let labelIndex = parseInt(label[0], 10);
      targetIndex = {
        value: labelIndex,
        label: labelIndex,
      }
      measurementLabelInfo['targetIndex'] = targetIndex;
    }

    let targetValue = null;
    if ('target' in measurementLabelInfo) {
      targetValue = measurementLabelInfo['target'];
    } else {
      // no target in measurementLabelInfo, get from label
      let labelTarget = label[1];
      if (labelTarget in targetInfoMapping) {
        targetValue = {
          value: labelTarget,
          label: targetInfoMapping[labelTarget],
        };
      }
      measurementLabelInfo['target'] = targetValue;
    }

    let locationValue = null;
    if ('location' in measurementLabelInfo) {
      locationValue = measurementLabelInfo['location'];
    } else {
      // no target in measurementLabelInfo, get from label
      let labelLocation = label[1]
      if (labelLocation in locationInfoMapping) {
        locationValue = {
          'value': labelLocation,
          'label': locationInfoMapping[labelLocation]
        }
      }
      measurementLabelInfo['location'] = locationValue;
    }

    // for dialog sumbit button
    const onSubmitHandler = ({ action, value }) => {
      switch (action.id) {
        case 'save': {
          // copy measurement
          const updatedMeasurement = { ...measurement };
          updatedMeasurement['measurementLabelInfo'] = valueDialog['measurementLabelInfo'];
          updatedMeasurement['label'] = valueDialog['label'].join('|');

          measurementService.update(uid, updatedMeasurement, true);
        }
      }
      uiDialogService.dismiss({ id: dialogId });
    };

    uiDialogService.create({
      id: dialogId,
      centralize: true,
      isDraggable: false,
      showOverlay: true,
      content: Dialog,
      contentProps: {
        title: t('Dialog:Annotation'),
        noCloseButton: true,
        value: valueDialog,
        onClose: () => uiDialogService.dismiss({ id: dialogId }),

        body: ({ value, setValue }) => {
          const targetIndexOptions = [];
          for (const [key, value] of Object.entries(targetIndexMapping)) {
            targetIndexOptions.push({ value: key, label: value });
          }
          const targetOptions = [];
          for (const [key, value] of Object.entries(targetInfoMapping)) {
            targetOptions.push({ value: key, label: value });
          }
          const locationOptions = [];
          for (const [key, value] of Object.entries(locationInfoMapping)) {
            locationOptions.push({ value: key, label: value });
          }
          return (
            <div>
              <Select
                id="targetIndex"
                placeholder="选择目标编号"
                value={targetIndex ? [targetIndex.value] : [1]} //select只能传入target value
                onChange={(newSelection, action) => {
                  console.info('newSelection:', newSelection, 'action:', action);
                  targetIndex = newSelection;
                  setValue(value => {
                    // update label info
                    value['measurementLabelInfo']['targetIndex'] = targetIndex;
                    value['label'][0] = targetIndex['value'];
                    return value;
                  });
                }}
                options={targetIndexOptions}
              />
              <Select
                id="target"
                placeholder="选择目标类型"
                value={targetValue ? [targetValue.value] : []} //select只能传入target value
                onChange={(newSelection, action) => {
                  console.info('newSelection:', newSelection, 'action:', action);
                  targetValue = newSelection;
                  setValue(value => {
                    // update label info
                    value['measurementLabelInfo']['target'] = targetValue;
                    value['label'][1] = targetValue['value'];
                    return value;
                  });
                }}
                options={targetOptions}
              />
              <Select
                id="location"
                placeholder="选择病灶位置"
                value={locationValue ? [locationValue.value] : []}
                onChange={(newSelection, action) => {
                  console.info('newSelection:', newSelection, 'action:', action);
                  locationValue = newSelection;
                  setValue(value => {
                    // update label info
                    value['measurementLabelInfo']['location'] = locationValue;
                    value['label'][2] = locationValue['value'];
                    return value;
                  });
                }}
                options={locationOptions}
              />
            </div>
          );
        },
        actions: [
          {
            id: 'cancel',
            text: t('Dialog:Cancel'),
            type: ButtonEnums.type.secondary,
          },
          {
            id: 'save',
            text: t('Dialog:Save'),
            type: ButtonEnums.type.primary,
          },
        ],
        onSubmit: onSubmitHandler,
      },
    });
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
    let nextTaskStudyUID = undefined;
    let taskInfo = {
      nextTaskStudyUID: nextTaskStudyUID,
      totalTask: undefined,
      userTasks: [],
    };
    if (userTasks.length > 0) {
      // get next task study
      for (const task of userTasks) {
        if (task.timepoint.UID !== StudyInstanceUIDs[0]) {
          nextTaskStudyUID = task.timepoint.UID;
          break;
        }
      }
      taskInfo = {
        nextTaskStudyUID: nextTaskStudyUID,
        totalTask: userTasks.length,
        userTasks: userTasks,
      };
    }

    if (navigateToNextTask) {
      // auto go to next task
      _navigateToNextTask(nextTaskStudyUID);
    } else {
      // update taskInfo
      sendTrackedMeasurementsEvent('UPDATE_TASK_INFO', {
        taskInfo: taskInfo,
      });
    }

    return taskInfo;
  }

  function _navigateToNextTask(nextTaskStudyUID) {
    // auto go to next task
    if (nextTaskStudyUID) {
      navigate(`/viewer?StudyInstanceUIDs=${nextTaskStudyUID}`);
    } else {
      navigate('/');
    }
  }

  // evibased, get next tsak study
  async function _getUserTaskInfo() {
    try {
      const authHeader = userAuthenticationService.getAuthorizationHeader();
      const username = userAuthenticationService.getUser().profile.preferred_username;
      const getTaskUrl = _appConfig['evibased']['task_get_url'];
      const taskStatus = 'create';

      const getTaskResponse = await fetch(`${getTaskUrl}?username=${username}&status=${taskStatus}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: authHeader.Authorization,
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

  useEffect(() => {
    console.log('currentReportInfo:', currentReportInfo);
    if (currentReportInfo) {
      setInputSOD(currentReportInfo.SOD);
      setTimepointResponse(currentReportInfo.response);
    }
  }, [ currentReportInfo ]);

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
  // sort by index, get index from label, TODO: get index from measurementLabelInfo
  targetFindings.sort((a, b) => parseInt(a.label.split('|')[0]) - parseInt(b.label.split('|')[0]));
  nonTargetFindings.sort((a, b) => parseInt(a.label.split('|')[0]) - parseInt(b.label.split('|')[0]));
  otherFindings.sort((a, b) => parseInt(a.label.split('|')[0]) - parseInt(b.label.split('|')[0]));

  // SOD input
  const onInputChangeHandler = event => {
    event.persist();
    setInputSOD(event.target.value);
  };

  return (
    <>
      <div
        className="invisible-scrollbar overflow-y-visible overflow-x-visible"
        ref={measurementsPanelRef}
        data-cy={'trackedMeasurements-panel'}
      >
        {displayStudySummary.taskInfo && (
          <TimePointSummary
            // evibased
            taskInfo={displayStudySummary.taskInfo}
            timepoint={displayStudySummary.timepoint ? t('MeasurementTable:TimePoint') + displayStudySummary.timepoint.slice(1) : undefined}
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
            label="总测量值(SOD)"
            labelClassName="text-white text-[14px] leading-[1.2]"
            className="border-primary-main bg-black"
            type="text"
            value={inputSOD}
            onChange={onInputChangeHandler}
            // required
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
      </div>
      <div className="flex justify-center p-4">
        <ActionButtons
          onExportClick={exportReport}
          onCreateReportClick={() => {
            sendTrackedMeasurementsEvent('SAVE_REPORT', {
              viewportId: viewportGrid.activeViewportId,
              isBackupSave: true,
              reportInfo: {
                SOD: inputSOD,
                response: timepointResponse,
              },
            });
          }}
          disabled={
            (targetFindings.length === 0 &&
            nonTargetFindings.length === 0) || successSaveReport
          }
        />
      </div>
      {/* evibased, auto navigate to next job. so no next task link here */}
      {/* {taskInfo.totalTask > 0 && (
        <div className="flex justify-center p-4">
          {taskInfo.nextTaskStudyUID && (
            <Link
              className="text-primary-light"
              to={`/viewer?StudyInstanceUIDs=${taskInfo.nextTaskStudyUID}`}
            >
              下一任务
            </Link>
          )}
        </div>
      )} */}
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
