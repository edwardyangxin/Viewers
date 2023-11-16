import { createReportAsync, createReportDialogPrompt } from '@ohif/extension-default';
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
  const StudyInstanceUID = evt?.data?.StudyInstanceUID;
  const SeriesInstanceUID = evt?.data?.SeriesInstanceUID;

  const { trackedStudy, trackedSeries } = ctx;
  let displaySetInstanceUIDs;

  //evibased, call createReportDialogPrompt and 1. store report to evibased api, 2. store report to PACS dicomSR
  return new Promise(async function (resolve, reject) {
    // TODO: Fallback if (uiDialogService) {
    const promptResult = await createReportDialogPrompt(uiDialogService, {
      extensionManager,
    });

    if (promptResult.action === RESPONSE.CREATE_REPORT) {
      // get api flag
      const _appConfig = extensionManager._appConfig;
      if (_appConfig.evibased['use_report_api']) {
        // post to report api
        _uploadReportAsync(servicesManager, extensionManager, trackedStudy, trackedSeries);
      } else {
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
    });
  });
}

// evibased, upload report to backend api
async function _uploadReportAsync(servicesManager, extensionManager, trackedStudy, trackedSeries) {
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
    const authHeaderKey = Object.keys(authHeader)[0];
    if (user) {
      username = user.profile.preferred_username;
    }
    // get report api from config
    const uploadReportUrl = _appConfig['evibased']['report_upload_url'];
    const uploadReportBody = {
      StudyInstanceUID: trackedMeasurements[0]['StudyInstanceUID'],
      username: username,
      report_template: 'RECIST1.1',
      report_template_version: 'v1',
      report_comments: '',
      measurements: trackedMeasurements,
    };
    const response = await fetch(uploadReportUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        authHeaderKey: authHeader[authHeaderKey],
      },
      body: JSON.stringify(uploadReportBody),
    });
    if (!response.ok) {
      const body = await response.text();
      throw new Error(`HTTP error! status: ${response.status} body: ${body}`);
    }
    const uploadReportResult = await response.json();
    console.log('uploadReportResult:', uploadReportResult);

    // audit log after upload report success
    const auditMsg = 'upload report success';
    const auditLogBodyMeta = {
      taskType: '', // TODO: get task type from API
      StudyInstanceUID: trackedMeasurements[0]['StudyInstanceUID'],
      action: 'upload_report',
      action_result: 'success',
    };
    performAuditLog(_appConfig, userAuthenticationService, 'i', auditMsg, auditLogBodyMeta);

    uiNotificationService.show({
      title: i18n.t('MeasurementTable:Create Report'),
      message: `${reportTypeStr} ${i18n.t('MeasurementTable:saved successfully')}`,
      type: 'success',
    });
  } catch (error) {
    uiNotificationService.show({
      title: 'Create Report',
      message: error.message || `Failed to store ${reportTypeStr}`,
      type: 'error',
    });
  } finally {
    uiDialogService.dismiss({ id: loadingDialogId });
  }
}

function Loading() {
  return <div className="text-primary-active">传输中...</div>;
}

// convert measurements, based on core>utils>dowanloadCSVReport.js
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

export default promptSaveReport;
