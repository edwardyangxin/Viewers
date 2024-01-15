import React from 'react';
import { DicomMetadataStore } from '@ohif/core';
import i18n from '@ohif/i18n';

/**
 *
 * @param {*} servicesManager
 */
async function createReportAsync({ servicesManager, getReport, reportType = 'measurement' }) {
  const { displaySetService, uiNotificationService, uiDialogService } = servicesManager.services;
  const loadingDialogId = uiDialogService.create({
    showOverlay: true,
    isDraggable: false,
    centralize: true,
    content: Loading,
  });
  const reportTypeStr = i18n.t(`MeasurementTable:${reportType}`);
  try {
    const naturalizedReport = await getReport();

    // The "Mode" route listens for DicomMetadataStore changes
    // When a new instance is added, it listens and
    // automatically calls makeDisplaySets
    DicomMetadataStore.addInstances([naturalizedReport], true);

    const displaySet = displaySetService.getMostRecentDisplaySet();

    const displaySetInstanceUID = displaySet.displaySetInstanceUID;
    
    uiNotificationService.show({
      title: i18n.t('MeasurementTable:Create Report'),
      message: `${reportTypeStr} ${i18n.t('MeasurementTable:saved successfully')}`,
      type: 'success',
    });

    return [displaySetInstanceUID];
  } catch (error) {
    uiNotificationService.show({
      title: i18n.t('MeasurementTable:Create Report'),
      message: error.message || `${i18n.t('MeasurementTable:Failed to store')} ${reportTypeStr}`,
      type: 'error',
    });
  } finally {
    uiDialogService.dismiss({ id: loadingDialogId });
  }
}

function Loading() {
  return <div className="text-primary-active">Loading...</div>;
}

export default createReportAsync;
