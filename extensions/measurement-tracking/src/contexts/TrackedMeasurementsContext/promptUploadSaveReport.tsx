import { createReportAsync } from '@ohif/extension-default';
import createReportDialogPrompt from './createReportDialogPrompt';
import getNextSRSeriesNumber from '../../_shared/getNextSRSeriesNumber';
import RESPONSE from '../../_shared/PROMPT_RESPONSES';
import { DicomMetadataStore, utils } from '@ohif/core';
import React from 'react';
import i18n from '@ohif/i18n';

const { performAuditLog } = utils;

// evibased, based on ../promptSaveReport.js
function promptSaveReport({ servicesManager, commandsManager, extensionManager }, ctx, evt) {
  const { uiDialogService, measurementService, displaySetService } = servicesManager.services;
  const viewportId = evt.viewportId === undefined ? evt.data.viewportId : evt.viewportId;
  const isBackupSave = evt.isBackupSave === undefined ? evt.data.isBackupSave : evt.isBackupSave;
  const reportInfo = evt.reportInfo === undefined ? evt.data.reportInfo : evt.reportInfo;
  const StudyInstanceUID = evt?.data?.StudyInstanceUID;
  const SeriesInstanceUID = evt?.data?.SeriesInstanceUID;

  const { trackedStudy, trackedSeries } = ctx;
  let displaySetInstanceUIDs;

  //evibased, call createReportDialogPrompt and 1. store report to evibased api, 2. store report to PACS dicomSR
  return new Promise(async function (resolve, reject) {
    // TODO: Fallback if (uiDialogService) {
    const promptResult = await createReportDialogPrompt(uiDialogService, {
      extensionManager, reportInfo
    });

    let successSaveReport = false;
    if (promptResult.action === RESPONSE.CREATE_REPORT) {
      // get api flag
      const _appConfig = extensionManager._appConfig;
      if (_appConfig.evibased['use_report_api']) {
        // post to report api
        successSaveReport = await _uploadReportAsync(servicesManager, extensionManager, trackedStudy, trackedSeries, reportInfo);
      } else {
        // deprecated, SR report has limited fields, use report api instead
        // reportInfo not saved to PACS dicomSR
        throw new Error(`deprecated, SR report has limited fields, use report api instead`);
        // post to PACS dicomSR
        const dataSources = extensionManager.getDataSources();
        const dataSource = dataSources[0];
        const measurements = measurementService.getMeasurements();
        const trackedMeasurements = measurements.filter(
          m => trackedStudy === m.referenceStudyUID && trackedSeries.includes(m.referenceSeriesUID)
        );

        const SeriesDescription =
          // isUndefinedOrEmpty
          promptResult.value === undefined || promptResult.value === ''
            ? 'Research Derived Series' // default
            : promptResult.value; // provided value

        const SeriesNumber = getNextSRSeriesNumber(displaySetService);

        const getReport = async () => {
          return commandsManager.runCommand(
            'storeMeasurements',
            {
              measurementData: trackedMeasurements,
              dataSource,
              additionalFindingTypes: ['ArrowAnnotate'],
              options: {
                SeriesDescription,
                SeriesNumber,
              },
            },
            'CORNERSTONE_STRUCTURED_REPORT'
          );
        };
        displaySetInstanceUIDs = await createReportAsync({
          servicesManager,
          getReport,
        });
        successSaveReport = true;
      }
    } else if (promptResult.action === RESPONSE.CANCEL) {
      // Do nothing
    }

    resolve({
      userResponse: promptResult.action,
      createdDisplaySetInstanceUIDs: displaySetInstanceUIDs,
      StudyInstanceUID,
      SeriesInstanceUID,
      viewportId,
      isBackupSave,
      successSaveReport,
    });
  });
}

// evibased, upload report to backend api
async function _uploadReportAsync(servicesManager, extensionManager, trackedStudy, trackedSeries, reportInfo) {
  const { measurementService, userAuthenticationService, uiNotificationService, uiDialogService } =
    servicesManager.services;
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
    const user = userAuthenticationService.getUser();
    let username = 'unknown';
    const authHeader = userAuthenticationService.getAuthorizationHeader();
    if (user) {
      username = user.profile.preferred_username;
    }
    const StudyInstanceUID = trackedMeasurements[0]['StudyInstanceUID'];

    // TODO: evibased, refactor api calls and task type check. 在页面加载处获取taskid&type？
    // get task api for current study
    const getTaskUrl = _appConfig['evibased']['task_get_url'];
    const getTaskResponse = await fetch(
      `${getTaskUrl}?username=${username}&StudyInstanceUID=${StudyInstanceUID}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: authHeader.Authorization,
        },
      }
    );
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
    if (tasks.length === 0) {
      console.log('no tasks found', StudyInstanceUID, username);
      throw new Error(`no tasks found, can't upload report`);
    }

    // loop tasks and get task id&type
    let taskId = undefined;
    let taskType = undefined;
    tasks.forEach(task => {
      if (['reading', 'arbitration'].includes(task.type) && ['create'].includes(task.status)) {
        taskId = task._id;
        taskType = task.type;
      }
    });
    if (!taskId) {
      console.log('no suitable taskType found', StudyInstanceUID, username);
      throw new Error(`no suitable taskType found, can't upload report`);
    }

    // post report api
    const uploadReportUrl = _appConfig['evibased']['report_upload_url'];
    const uploadReportBody = {
      StudyInstanceUID: StudyInstanceUID,
      username: username,
      task: taskId,
      report_template: 'RECIST1.1',
      report_template_version: 'v1',
      report_comments: '',
      SOD: reportInfo ? reportInfo.SOD: '',
      response: reportInfo ? reportInfo.response: '',
      report_info: reportInfo,
      measurements: trackedMeasurements,
    };
    const reportResponse = await fetch(uploadReportUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: authHeader.Authorization,
      },
      body: JSON.stringify(uploadReportBody),
    });
    if (!reportResponse.ok) {
      const body = await reportResponse.text();
      throw new Error(`HTTP error! status: ${reportResponse.status} body: ${body}`);
    }
    const uploadReportResult = await reportResponse.json();
    console.log('uploadReportResult:', uploadReportResult);

    // put task api
    const putTaskUrl = _appConfig['evibased']['task_update_url'];
    const putTaskBody = {
      StudyInstanceUID: StudyInstanceUID,
      username: username,
      type: taskType,
      status: 'done',
    };
    const putTaskResponse = await fetch(putTaskUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: authHeader.Authorization,
      },
      body: JSON.stringify(putTaskBody),
    });
    if (!putTaskResponse.ok) {
      const body = await putTaskResponse.text();
      throw new Error(`HTTP error! status: ${putTaskResponse.status} body: ${body}`);
    }
    const putTaskResult = await putTaskResponse.json();
    console.log('putTaskResult:', putTaskResult);

    // audit log after upload report success
    const auditMsg = 'upload report success';
    const auditLogBodyMeta = {
      taskType: taskType,
      StudyInstanceUID: StudyInstanceUID,
      action: 'upload_report',
      action_result: 'success',
    };
    performAuditLog(_appConfig, userAuthenticationService, 'i', auditMsg, auditLogBodyMeta);

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
