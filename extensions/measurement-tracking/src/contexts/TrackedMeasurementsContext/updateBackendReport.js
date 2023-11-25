import { utils } from '@ohif/core';

const RESPONSE = {
  NO_NEVER: -1,
  CANCEL: 0,
  CREATE_REPORT: 1,
  ADD_SERIES: 2,
  SET_STUDY_AND_SERIES: 3,
  NO_NOT_FOR_SERIES: 4,
  HYDRATE_REPORT: 5,
};

function updateBackendReport({ servicesManager, extensionManager, appConfig }, ctx, evt) {
  const { measurementService } = servicesManager.services;
  const { viewportId } = evt;
  const reportData = evt.reportData;

  const reportInfo = reportData.report_info;
  const measurements = reportData.measurements;

  // for tracking StudyInstanceUID, SeriesInstanceUID
  let trackedStudyInstanceUID, trackedSeriesInstanceUIDs = [];

  // loop through all measurements
  for (let i = 0; i < measurements.length; i++) {
    const measurement = measurements[i];
    const {
      Patient_ID,
      Patient_Name,
      StudyInstanceUID,
      SeriesInstanceUID,
      SOPInstanceUID,
      Label,
      AnnotationType,
      Length,
      Width,
      Unit,
      FrameOfReferenceUID,
      points,
      label_info,
    } = measurement;
    // based on hydrateStructuredReport in cornerstone-dicom-sr extension
    // use measurementService.addRawMeasurement to add measurement
    // get source
    const CORNERSTONE_3D_TOOLS_SOURCE_NAME = 'Cornerstone3DTools';
    const CORNERSTONE_3D_TOOLS_SOURCE_VERSION = '0.1';
    const source = measurementService.getSource(
      CORNERSTONE_3D_TOOLS_SOURCE_NAME,
      CORNERSTONE_3D_TOOLS_SOURCE_VERSION
    );
    // get AnnotationType, measurement["AnnotationType"] = "Cornerstone:Bidirectional"
    const annotationType = AnnotationType.split(':')[1];
    // get annotation
    const referencedImageId = `wadors:/dicom-web/studies/${StudyInstanceUID}/series/${SeriesInstanceUID}/instances/${SOPInstanceUID}/frames/1`; 
    const imageId = 'imageId:' + referencedImageId;
    const cachedStats = {
      [imageId]: {
        length: parseFloat(Length),
        width: parseFloat(Width),
      },
    };
    // turn points string to array [[x y z]]
    let handlesPoints = points.split(';');
    for (let i = 0; i < handlesPoints.length; i++) {
      handlesPoints[i] = handlesPoints[i].split(' ');
      for (let j = 0; j < handlesPoints[i].length; j++) {
        handlesPoints[i][j] = parseFloat(handlesPoints[i][j]);
      }
    }
    const annotationData = {
      handles: {
        points: handlesPoints,
        activeHandleIndex: 0,
        textBox: {
          hasMoved: false,
        },
      },
      cachedStats: cachedStats,
      frameNumber: undefined,
      label: Label,
      text: Label, // to support CornerstoneTools ArrowAnnotate
      finding: undefined,
      findingSites: undefined,
      site: undefined,
      measurementLabelInfo: label_info,
    };

    const annotation = {
      annotationUID: utils.guid(),
      data: annotationData,
      metadata: {
        toolName: annotationType,
        referencedImageId: referencedImageId,
        FrameOfReferenceUID,
      },
    };

    const mappings = measurementService.getSourceMappings(
      CORNERSTONE_3D_TOOLS_SOURCE_NAME,
      CORNERSTONE_3D_TOOLS_SOURCE_VERSION
    );
    const matchingMapping = mappings.find(m => m.annotationType === annotationType);

    // add measurement
    const newAnnotationUID = measurementService.addRawMeasurement(
      source,
      annotationType,
      { annotation },
      matchingMapping.toMeasurementSchema,
      extensionManager.getActiveDataSource()[0]
    );
    console.log("newAnnotationUID: ", newAnnotationUID);

    // update tracking StudyInstanceUID, SeriesInstanceUID
    trackedStudyInstanceUID = StudyInstanceUID;
    if (!trackedSeriesInstanceUIDs.includes(SeriesInstanceUID)) {
      trackedSeriesInstanceUIDs.push(SeriesInstanceUID);
    }
  }

  return new Promise(async function (resolve, reject) {
    resolve({
      userResponse: RESPONSE.HYDRATE_REPORT,
      viewportId,
      StudyInstanceUID: trackedStudyInstanceUID,
      SeriesInstanceUIDs: trackedSeriesInstanceUIDs,
      reportInfo,
    });
  });
}

export default updateBackendReport;
