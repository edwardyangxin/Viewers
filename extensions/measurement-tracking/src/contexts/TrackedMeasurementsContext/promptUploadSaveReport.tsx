// import { createReportAsync } from '@ohif/extension-default';
import createReportDialogPrompt, { CREATE_REPORT_DIALOG_RESPONSE } from './createReportDialogPrompt';
// import getNextSRSeriesNumber from '../../_shared/getNextSRSeriesNumber';
import RESPONSE from '../../_shared/PROMPT_RESPONSES';
import { DicomMetadataStore } from '@ohif/core';
import React from 'react';
import i18n from '@ohif/i18n';
import { getUserName } from '../../utils/utils';
import { ButtonEnums, Input } from '@ohif/ui';
import ReportDialog from '../../ui/ReportDialog';

// evibased, based on ../promptSaveReport.js
function promptSaveReport({ servicesManager, commandsManager, extensionManager }, ctx, evt) {
  const { uiDialogService, measurementService, userAuthenticationService, logSinkService } =
    servicesManager.services;
  const viewportId = evt.viewportId;
  const isBackupSave = evt.isBackupSave;
  const imageQuality = evt.imageQuality;
  const { trackedStudy, trackedSeries, currentTask, taskStartTime } = ctx;
  const taskType = evt.taskType || currentTask.type;
  const StudyInstanceUID = trackedStudy;

  let displaySetInstanceUIDs;
  //evibased, call createReportDialogPrompt and store report to evibased api, was store report as dicomSR to PACS 
  return new Promise(async function (resolve, reject) {
    const reportStartTime = new Date();
    console.log('report start time:', reportStartTime);
    // create report dialog based on taskType
    let reportSummaryResult;
    if (taskType === 'QC-data') {
      reportSummaryResult = await createQCDataReportDialogPrompt(
        ctx,
        imageQuality,
        uiDialogService,
        measurementService,
        {
          extensionManager,
        }
      );
    } else {
      reportSummaryResult = await createReportDialogPrompt(
        ctx,
        imageQuality,
        uiDialogService,
        measurementService,
        {
          servicesManager,
        }
      );
    }

    const taskEndTime = new Date();
    console.log('task end time:', taskEndTime);
    let successSaveReport = false;
    if (reportSummaryResult.action === RESPONSE.CREATE_REPORT) {
      // post to backend api
      successSaveReport = await _uploadReportAsync(
        servicesManager,
        extensionManager,
        trackedStudy,
        trackedSeries,
        currentTask,
        imageQuality,
        reportSummaryResult.value.reportInfo,
        taskStartTime,
        reportStartTime,
        taskEndTime,
        taskType
      );
    } else if (reportSummaryResult.action === RESPONSE.CANCEL) {
      // audit log go back to viewer
      logSinkService._broadcastEvent(logSinkService.EVENTS.LOG_ACTION, {
        msg: 'cancel create report and go back to viewer/previous page',
        action: 'CANCEL_REPORT',
        username: userAuthenticationService.getUser()?.profile?.preferred_username,
        authHeader: userAuthenticationService.getAuthorizationHeader(),
        data: {
          action_result: 'success',
        },
      });
    }

    resolve({
      userResponse: reportSummaryResult.action,
      createdDisplaySetInstanceUIDs: displaySetInstanceUIDs,
      StudyInstanceUID,
      viewportId,
      isBackupSave,
      successSaveReport,
      reportStartTime,
      taskEndTime,
    });
  });
}

// evibased, create QC data report dialog
function createQCDataReportDialogPrompt(
  ctx,
  imageQuality,
  uiDialogService,
  measurementService,
  { extensionManager }
) {
  const { trackedStudy, trackedSeries, currentReportInfo } = ctx;
  const measurements = measurementService.getMeasurements();
  const filteredMeasurements = measurements.filter(
    m => trackedStudy === m.referenceStudyUID && trackedSeries.includes(m.referenceSeriesUID)
  );

  return new Promise(function (resolve, reject) {
    let dialogId = undefined;

    const _handleClose = () => {
      // Dismiss dialog
      uiDialogService.dismiss({ id: dialogId });
      // Notify of cancel action
      resolve({
        action: CREATE_REPORT_DIALOG_RESPONSE.CANCEL,
        value: undefined,
        dataSourceName: undefined,
      });
    };

    const _handleFormSubmit = ({ action, value }) => {
      uiDialogService.dismiss({ id: dialogId });
      switch (action.id) {
        case 'save': {
          const returnVal = {
            ...value,
            reportInfo: {
              QCDataComment: value.QCDataComment,
            },
          };
          resolve({
            action: CREATE_REPORT_DIALOG_RESPONSE.CREATE_REPORT,
            value: returnVal,
            dataSourceName: undefined, // deprecated
          });
          break;
        }
        case 'cancel':
          resolve({
            action: CREATE_REPORT_DIALOG_RESPONSE.CANCEL,
            value: undefined,
            dataSourceName: undefined, // deprecated
          });
          break;
      }
    };

    // buttons
    const dialogActions = [
      {
        id: 'cancel',
        text: '返回',
        type: ButtonEnums.type.secondary,
      },
      {
        id: 'save',
        text: '确认提交',
        type: ButtonEnums.type.primary,
      },
    ];
    dialogId = uiDialogService.create({
      centralize: true,
      isDraggable: false,
      content: ReportDialog,
      useLastPosition: false,
      showOverlay: true,
      dialogWidth: '1200px',
      contentProps: {
        title: `提交数据审核报告`,
        value: {
          imageQuality: imageQuality,
          QCDataComment: currentReportInfo ? currentReportInfo.QCDataComment : '',
        },
        noCloseButton: false,
        onClose: _handleClose,
        actions: dialogActions,
        onSubmit: _handleFormSubmit,
        body: ({ value, setValue }) => {
          const imageQualified = value.imageQuality?.selection?.value === 'image_qualified';
          return (
            <>
              <div className="flex h-full flex-col bg-slate-300 ">
                {/* subtitle: 1. 图像质量*/}
                <div className="flex flex-row justify-between pl-2 pb-2">
                  <span
                    className={`${!imageQualified && 'bg-red-500'} text-[14px] leading-[1.2] text-black`}
                  >
                    {`图像质量: ${value.imageQuality?.selection?.label}${value.imageQuality?.description ? ' (' + value.imageQuality?.description + ')' : ''}`}
                  </span>
                </div>
                <div className="flex grow flex-col overflow-visible">
                  <div className="flex grow flex-row justify-evenly">
                    <div className="w-1/2">
                      <Input
                        type="text"
                        id="comment"
                        label="备注信息"
                        labelClassName="text-black text-[14px] leading-[1.2] mt-2"
                        className="border-primary-main bg-slate-300 text-black"
                        transparent={true}
                        placeholder="备注信息"
                        value={value.QCDataComment}
                        onChange={event => {
                          event.persist();
                          setValue(value => ({ ...value, QCDataComment: event.target.value }));
                        }}
                        onKeyUp={event => {
                          event.persist();
                          if (event.key === 'Enter') {
                            setValue(value => ({ ...value, QCDataComment: event.target.value }));
                          }
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </>
          );
        },
      },
    });
  });
}

// evibased, upload report to backend api
async function _uploadReportAsync(
  servicesManager,
  extensionManager,
  trackedStudy,
  trackedSeries,
  currentTask,
  imageQuality,
  reportInfo,
  taskStartTime,
  reportStartTime,
  taskEndTime,
  taskType
) {
  const {
    measurementService,
    userAuthenticationService,
    uiNotificationService,
    uiDialogService,
    logSinkService,
  } = servicesManager.services;
  const _appConfig = extensionManager._appConfig;
  const reportTypeStr = i18n.t(`MeasurementTable:measurement`);

  const loadingDialogId = uiDialogService.create({
    showOverlay: true,
    isDraggable: false,
    centralize: true,
    content: Loading,
  });

  try {
    const measurements = measurementService.getMeasurements();
    let trackedMeasurements = measurements.filter(
      m => trackedStudy === m.referenceStudyUID && trackedSeries.includes(m.referenceSeriesUID)
    );
    if (trackedMeasurements.length === 0) {
      // Prevent upload of report with no measurements.
      return;
    }
    // convert to measurements
    trackedMeasurements = _convertToReportMeasurements(trackedMeasurements);

    console.log('Authenticated user info: ', userAuthenticationService.getUser());
    const username = getUserName(userAuthenticationService);
    const authHeader = userAuthenticationService.getAuthorizationHeader();
    const StudyInstanceUID = trackedMeasurements[0]['StudyInstanceUID'];

    // check currentTask exist
    if (!currentTask) {
      console.error('no tasks found', StudyInstanceUID, username);
      throw new Error(`no tasks found, can't upload report`);
    }
    // check taskType
    if (taskType === 'QC-data' && taskType !== currentTask.type) {
      console.error('task type not match', StudyInstanceUID, username);
      throw new Error(`task type not match, can't upload report`);
    }

    // post report api
    const taskId = currentTask.id;
    let createReportBody;
    if (taskType === 'QC-data') {
      createReportBody = {
        StudyInstanceUID: StudyInstanceUID, // deprecated, no need to link to timepoint
        username: username,
        task: { id: taskId }, // link to task
        reportTemplate: 'QC-data', // report criteria
        reportTemplateVersion: 'v1', // criteria version
        imageQuality: imageQuality, // imageQuality from image view page
        measurements: trackedMeasurements, // measurements from measurement table
        taskStartTime: taskStartTime.toISOString(), // taskStartTime from task start
        reportStartTime: reportStartTime.toISOString(), // reportStartTime from report start
        taskEndTime: taskEndTime.toISOString(), // taskEndTime from task end
        ...reportInfo, // reportInfo from report page, structure see above
      };
    } else {
      // for other taskType, like review
      // review reportInfo fields from report dialog
      // reportInfo: {
      //   SOD
      //   autoCalculatedSOD
      //   targetResponse
      //   nonTargetResponse
      //   response
      //   reviewComment
      //   arbitrationComment
      //   reportRef
      // }
      createReportBody = {
        StudyInstanceUID: StudyInstanceUID, // deprecated, no need to link to timepoint
        username: username,
        task: { id: taskId }, // link to task
        reportTemplate: 'RECIST1.1', // report criteria
        reportTemplateVersion: 'v1', // criteria version
        // reportComments: '', // deprecated but required by api
        imageQuality: imageQuality, // imageQuality from image view page
        measurements: trackedMeasurements, // measurements from measurement table
        taskStartTime: taskStartTime.toISOString(), // taskStartTime from task start
        reportStartTime: reportStartTime.toISOString(), // reportStartTime from report start
        taskEndTime: taskEndTime.toISOString(), // taskEndTime from task end
        ...reportInfo, // reportInfo from report page, structure see above
      };
    }
    const createReportUrl = new URL(_appConfig['evibased']['apiv2_reports_url']);
    const reportResponse = await fetch(createReportUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Authorization: authHeader?.Authorization,
      },
      body: JSON.stringify(createReportBody),
    });
    if (!reportResponse.ok) {
      const body = await reportResponse.text();
      throw new Error(`HTTP error! status: ${reportResponse.status} body: ${body}`);
    }
    const newReport = await reportResponse.json();
    console.log('newReport:', newReport);
    // audit log after upload report success
    logSinkService._broadcastEvent(logSinkService.EVENTS.LOG_ACTION, {
      msg: 'create report and upload success',
      action: 'CREATE_REPORT',
      username: userAuthenticationService.getUser()?.profile?.preferred_username,
      authHeader: userAuthenticationService.getAuthorizationHeader(),
      data: {
        action_result: 'success',
        taskType: taskType,
        StudyInstanceUID: StudyInstanceUID,
        taskId: taskId,
        reportId: newReport.id,
      },
    });

    uiNotificationService.show({
      title: i18n.t('MeasurementTable:Create Report'),
      message: `${reportTypeStr} ${i18n.t('MeasurementTable:saved successfully')}`,
      type: 'success',
    });
    return true;
  } catch (error) {
    // console log error
    console.error('upload report error: ', error);
    // info user
    uiNotificationService.show({
      title: i18n.t('MeasurementTable:Create Report'),
      message: `${reportTypeStr} 上传失败（或重复上传），请联系管理员`,
      type: 'error',
    });
    return false;
  } finally {
    uiDialogService.dismiss({ id: loadingDialogId });
  }
}

function Loading() {
  return <div className="text-primary-active">传输中...</div>;
}

// convert measurements, based on core>utils>dowanloadCSVReport.js
function _convertToReportMeasurements(measurementData) {
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

  const results = _mapReportsToMeasurements(reportMap);
  return results;
}

function _getCommonRowItems(measurement, seriesMetadata) {
  const firstInstance = seriesMetadata.instances[0];

  // put all tags need to be saved to report
  return {
    'Patient ID': firstInstance.PatientID, // Patient ID
    'Patient Name': firstInstance.PatientName?.Alphabetic || '', // Patient Name
    Modality: firstInstance.Modality, // Modality
    StudyInstanceUID: measurement.referenceStudyUID, // StudyInstanceUID
    SeriesInstanceUID: measurement.referenceSeriesUID, // SeriesInstanceUID
    SOPInstanceUID: measurement.SOPInstanceUID, // SOPInstanceUID
    Label: measurement.label || '', // Label
    label_info: measurement.measurementLabelInfo || {}, // Info object save to DB
  };
}

function _mapReportsToMeasurements(reportMap) {
  const results = [];
  Object.keys(reportMap).forEach(id => {
    const { report, commonRowItems } = reportMap[id];
    const item = {};
    // For commonRowItems, find the correct index and add the value to the
    // correct row in the results array
    Object.keys(commonRowItems).forEach(key => {
      const value = commonRowItems[key];
      item[key] = value;
    });

    // For each annotation data, find the correct index and add the value to the
    // correct row in the results array
    report.columns.forEach((column, index) => {
      const value = report.values[index];
      item[column] = value;
    });

    results.push(item);
  });

  return results;
}

export default promptSaveReport;
