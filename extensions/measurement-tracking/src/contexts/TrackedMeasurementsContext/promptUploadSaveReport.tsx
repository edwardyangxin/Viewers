// import { createReportAsync } from '@ohif/extension-default';
import createReportDialogPrompt from './createReportDialogPrompt';
// import getNextSRSeriesNumber from '../../_shared/getNextSRSeriesNumber';
import RESPONSE from '../../_shared/PROMPT_RESPONSES';
import { DicomMetadataStore } from '@ohif/core';
import React from 'react';
import i18n from '@ohif/i18n';
import { getUserName } from '../../utils/utils';

// evibased, based on ../promptSaveReport.js
function promptSaveReport({ servicesManager, commandsManager, extensionManager }, ctx, evt) {
  const { uiDialogService, measurementService, displaySetService } = servicesManager.services;
  const viewportId = evt.viewportId === undefined ? evt.data.viewportId : evt.viewportId;
  const isBackupSave = evt.isBackupSave === undefined ? evt.data.isBackupSave : evt.isBackupSave;
  const StudyInstanceUID = evt?.data?.StudyInstanceUID;
  const SeriesInstanceUID = evt?.data?.SeriesInstanceUID;
  const imageQuality = evt.imageQuality === undefined ? evt.data.imageQuality : evt.imageQuality;

  const { trackedStudy, trackedSeries, currentTask, taskStartTime } = ctx;
  let displaySetInstanceUIDs;

  //evibased, call createReportDialogPrompt and store report to evibased api, was store report as dicomSR to PACS 
  return new Promise(async function (resolve, reject) {
    const reportStartTime = new Date();
    console.log('report start time:', reportStartTime);
    const reportSummaryResult = await createReportDialogPrompt(
      ctx,
      imageQuality,
      uiDialogService,
      measurementService,
      {
        extensionManager,
      }
    );

    let successSaveReport = false;
    const taskEndTime = new Date();
    console.log('task end time:', taskEndTime);
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
        taskEndTime
      );

      // deprecated, SR report has limited fields, use report api instead
      // reportInfo not saved to PACS dicomSR
      // throw new Error(`deprecated, SR report has limited fields, use report api instead`);
      // post to PACS dicomSR
      // const dataSources = extensionManager.getDataSources();
      // const dataSource = dataSources[0];
      // const measurements = measurementService.getMeasurements();
      // const trackedMeasurements = measurements.filter(
      //   m => trackedStudy === m.referenceStudyUID && trackedSeries.includes(m.referenceSeriesUID)
      // );

      // const SeriesDescription =
      //   // isUndefinedOrEmpty
      //   reportSummaryResult.value === undefined || reportSummaryResult.value === ''
      //     ? 'Research Derived Series' // default
      //     : reportSummaryResult.value; // provided value

      // const SeriesNumber = getNextSRSeriesNumber(displaySetService);

      // const getReport = async () => {
      //   return commandsManager.runCommand(
      //     'storeMeasurements',
      //     {
      //       measurementData: trackedMeasurements,
      //       dataSource,
      //       additionalFindingTypes: ['ArrowAnnotate'],
      //       options: {
      //         SeriesDescription,
      //         SeriesNumber,
      //       },
      //     },
      //     'CORNERSTONE_STRUCTURED_REPORT'
      //   );
      // };
      // displaySetInstanceUIDs = await createReportAsync({
      //   servicesManager,
      //   getReport,
      // });
      // successSaveReport = true;
    } else if (reportSummaryResult.action === RESPONSE.CANCEL) {
      // Do nothing
    }

    resolve({
      userResponse: reportSummaryResult.action,
      createdDisplaySetInstanceUIDs: displaySetInstanceUIDs,
      StudyInstanceUID,
      SeriesInstanceUID,
      viewportId,
      isBackupSave,
      successSaveReport,
      reportStartTime,
      taskEndTime,
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
  taskEndTime
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
    // check currentTask exist
    if (!currentTask) {
      console.log('no tasks found', StudyInstanceUID, username);
      throw new Error(`no tasks found, can't upload report`);
    }

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

    // post report api
    const taskId = currentTask.id;
    const taskType = currentTask.type;
    // const uploadReportUrl = _appConfig['evibased']['report_upload_url'];
    // evibased, reportInfo fields from report page
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
    const createReportBody = {
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
      msg: 'create_report',
      action: 'VIEWER_CREATE_REPORT',
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
