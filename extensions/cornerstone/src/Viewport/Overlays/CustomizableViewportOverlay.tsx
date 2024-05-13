import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { vec3 } from 'gl-matrix';
import PropTypes from 'prop-types';
import { metaData, Enums, utilities } from '@cornerstonejs/core';
import { ImageSliceData } from '@cornerstonejs/core/dist/esm/types';
import { ViewportOverlay } from '@ohif/ui';
import { ServicesManager } from '@ohif/core';
import { InstanceMetadata } from '@ohif/core/src/types';
import { formatPN, formatDICOMDate, formatDICOMTime, formatNumberPrecision } from './utils';
import { StackViewportData, VolumeViewportData } from '../../types/CornerstoneCacheService';

import './CustomizableViewportOverlay.css';

const EPSILON = 1e-4;

type ViewportData = StackViewportData | VolumeViewportData;

interface OverlayItemProps {
  element: HTMLElement;
  viewportData: ViewportData;
  imageSliceData: ImageSliceData;
  servicesManager: ServicesManager;
  viewportId: string;
  instance: InstanceMetadata;
  customization: any;
  formatters: {
    formatPN: (val) => string;
    formatDate: (val) => string;
    formatTime: (val) => string;
    formatNumberPrecision: (val, number) => string;
  };

  // calculated values
  voi: {
    windowWidth: number;
    windowCenter: number;
  };
  instanceNumber?: number;
  scale?: number;
}

const OverlayItemComponents = {
  'ohif.overlayItem.windowLevel': VOIOverlayItem,
  'ohif.overlayItem.zoomLevel': ZoomOverlayItem,
  'ohif.overlayItem.instanceNumber': InstanceNumberOverlayItem,
};

/**
 * Customizable Viewport Overlay
 */
function CustomizableViewportOverlay({
  element,
  viewportData,
  imageSliceData,
  viewportId,
  servicesManager,
}: {
  element: HTMLElement;
  viewportData: ViewportData;
  imageSliceData: ImageSliceData;
  viewportId: string;
  servicesManager: ServicesManager;
}) {
  const { cornerstoneViewportService, customizationService, toolGroupService } =
    servicesManager.services;
  const [voi, setVOI] = useState({ windowCenter: null, windowWidth: null });
  const [scale, setScale] = useState(1);
  const { imageIndex } = imageSliceData;

  const topLeftCustomization = customizationService.getModeCustomization(
    'cornerstoneOverlayTopLeft'
  );
  const topRightCustomization = customizationService.getModeCustomization(
    'cornerstoneOverlayTopRight'
  );
  const bottomLeftCustomization = customizationService.getModeCustomization(
    'cornerstoneOverlayBottomLeft'
  );
  const bottomRightCustomization = customizationService.getModeCustomization(
    'cornerstoneOverlayBottomRight'
  );

  const instances = useMemo(() => {
    if (viewportData != null) {
      return _getViewportInstances(viewportData);
    } else {
      return null;
    }
  }, [viewportData, imageIndex]);

  const instanceNumber = useMemo(
    () =>
      viewportData
        ? getInstanceNumber(viewportData, viewportId, imageIndex, cornerstoneViewportService)
        : null,
    [viewportData, viewportId, imageIndex, cornerstoneViewportService]
  );

  /**
   * Updating the VOI when the viewport changes its voi
   */
  useEffect(() => {
    const updateVOI = eventDetail => {
      const { range } = eventDetail.detail;

      if (!range) {
        return;
      }

      const { lower, upper } = range;
      const { windowWidth, windowCenter } = utilities.windowLevel.toWindowLevel(lower, upper);

      setVOI({ windowCenter, windowWidth });
    };

    element.addEventListener(Enums.Events.VOI_MODIFIED, updateVOI);

    return () => {
      element.removeEventListener(Enums.Events.VOI_MODIFIED, updateVOI);
    };
  }, [viewportId, viewportData, voi, element]);

  /**
   * Updating the scale when the viewport changes its zoom
   */
  useEffect(() => {
    const updateScale = eventDetail => {
      const { previousCamera, camera } = eventDetail.detail;

      if (
        previousCamera.parallelScale !== camera.parallelScale ||
        previousCamera.scale !== camera.scale
      ) {
        const viewport = cornerstoneViewportService.getCornerstoneViewport(viewportId);

        if (!viewport) {
          return;
        }

        const imageData = viewport.getImageData();

        if (!imageData) {
          return;
        }

        if (camera.scale) {
          setScale(camera.scale);
          return;
        }

        const { spacing } = imageData;
        // convert parallel scale to scale
        const scale = (element.clientHeight * spacing[0] * 0.5) / camera.parallelScale;
        setScale(scale);
      }
    };

    element.addEventListener(Enums.Events.CAMERA_MODIFIED, updateScale);

    return () => {
      element.removeEventListener(Enums.Events.CAMERA_MODIFIED, updateScale);
    };
  }, [viewportId, viewportData, cornerstoneViewportService, element]);

  const _renderOverlayItem = useCallback(
    item => {
      const overlayItemProps = {
        element,
        viewportData,
        imageSliceData,
        viewportId,
        servicesManager,
        customization: item,
        formatters: {
          formatPN,
          formatDate: formatDICOMDate,
          formatTime: formatDICOMTime,
          formatNumberPrecision,
          formatSpacing, // evibased
        },
        instance: instances ? instances[item?.instanceIndex] : null,
        voi,
        scale,
        instanceNumber,
      };

      if (!item) {
        return null;
      }

      const { customizationType } = item;
      const OverlayItemComponent = OverlayItemComponents[customizationType];

      if (OverlayItemComponent) {
        return <OverlayItemComponent {...overlayItemProps} />;
      } else {
        const renderItem = customizationService.transform(item);

        if (typeof renderItem.content === 'function') {
          return renderItem.content(overlayItemProps);
        }
      }
    },
    [
      element,
      viewportData,
      imageSliceData,
      viewportId,
      servicesManager,
      customizationService,
      instances,
      voi,
      scale,
      instanceNumber,
    ]
  );

  const getContent = useCallback(
    (customization, defaultItems, keyPrefix) => {
      const items = customization?.items ?? defaultItems;
      return (
        <>
          {items.map((item, index) => (
            <div key={`${keyPrefix}_${index}`}>
              {item?.condition
                ? item.condition({
                    instance: instances ? instances[item?.instanceIndex] : null,
                    formatters: { formatDate: formatDICOMDate },
                  })
                  ? _renderOverlayItem(item)
                  : null
                : _renderOverlayItem(item)}
            </div>
          ))}
        </>
      );
    },
    [_renderOverlayItem]
  );

  const studyDateItem = {
    id: 'StudyDate',
    customizationType: 'ohif.overlayItem',
    label: '',
    title: 'Study date',
    condition: ({ instance }) =>
      instance && !instance.ClinicalTrialTimePointID && instance.StudyDate,
    contentF: ({ instance, formatters: { formatDate } }) => formatDate(instance.StudyDate),
  };

  const seriesDescriptionItem = {
    id: 'SeriesDescription',
    customizationType: 'ohif.overlayItem',
    label: '',
    title: 'Series description',
    attribute: 'SeriesDescription',
    condition: ({ instance }) => {
      return instance && instance.SeriesDescription;
    },
  };

  // evibased, dicom items
  const patientIDItem = {
    id: 'PatientID',
    customizationType: 'ohif.overlayItem',
    // label: '受试者',
    title: 'Patient ID',
    attribute: 'PatientID',
    condition: ({ instance }) => instance && instance.PatientID,
  };

  const clinicalTrialTimePointIDItem = {
    id: 'ClinicalTrialTimePointID',
    customizationType: 'ohif.overlayItem',
    // label: '访视编号',
    title: 'Clinical Timepoint',
    // attribute: 'ClinicalTrialTimePointID',
    condition: ({ instance }) => instance && instance.ClinicalTrialTimePointID,
    contentF: ({ instance, formatters }) => {
      return getTimepointName(instance.ClinicalTrialTimePointID);
    },
  };

  const sliceThicknessItem = {
    id: 'SliceThickness',
    customizationType: 'ohif.overlayItem',
    label: '层厚',
    title: 'SliceThickness',
    // attribute: 'SliceThickness',
    condition: ({ instance }) => instance && instance.SliceThickness,
    contentF: ({ instance, formatters: { formatSpacing } }) =>
      formatSpacing(instance.SliceThickness),
  };

  const spacingBetweenSlicesItem = {
    id: 'SpacingBetweenSlices',
    customizationType: 'ohif.overlayItem',
    label: '层间距',
    title: 'SpacingBetweenSlices',
    // attribute: 'SpacingBetweenSlices',
    condition: ({ instance }) => instance && instance.SpacingBetweenSlices,
    contentF: ({ instance, formatters: { formatSpacing } }) =>
      formatSpacing(instance.SpacingBetweenSlices),
  };

  // evibased, viewport top left corner dicom infos
  const topLeftItems = instances
    ? instances
        .map((instance, index) => {
          return [
            {
              ...studyDateItem,
              instanceIndex: index,
            },
            {
              ...patientIDItem,
              instanceIndex: index,
            },
            {
              ...clinicalTrialTimePointIDItem,
              instanceIndex: index,
            },
            {
              ...sliceThicknessItem,
              instanceIndex: index,
            },
            {
              ...spacingBetweenSlicesItem,
              instanceIndex: index,
            },
            // {
            //   ...seriesDescriptionItem,
            //   instanceIndex: index,
            // },
          ];
        })
        .flat()
    : [];

  return (
    <ViewportOverlay
      topLeft={
        /**
         * Inline default overlay items for a more standard expansion
         */
        getContent(topLeftCustomization, [...topLeftItems], 'topLeftOverlayItem')
      }
      topRight={getContent(topRightCustomization, [], 'topRightOverlayItem')}
      bottomLeft={getContent(
        bottomLeftCustomization,
        [
          {
            id: 'WindowLevel',
            customizationType: 'ohif.overlayItem.windowLevel',
          },
          {
            id: 'ZoomLevel',
            customizationType: 'ohif.overlayItem.zoomLevel',
            condition: () => {
              const activeToolName = toolGroupService.getActiveToolForViewport(viewportId);
              return activeToolName === 'Zoom';
            },
          },
        ],
        'bottomLeftOverlayItem'
      )}
      bottomRight={getContent(
        bottomRightCustomization,
        [
          {
            id: 'InstanceNumber',
            customizationType: 'ohif.overlayItem.instanceNumber',
          },
        ],
        'bottomRightOverlayItem'
      )}
    />
  );
}

// evibased
function formatSpacing(spacing) {
  return `${parseFloat(spacing).toFixed(1)} mm`;
}

function getTimepointName(timepointId) {
  if (timepointId === null || timepointId === undefined) {
    return '未知';
  }
  // deprecated, remove timepoint prefix, 现在没有T前缀
  timepointId = timepointId.startsWith('T') ? timepointId.slice(1) : timepointId;
  let timepointName = '';
  if (timepointId === '00' || timepointId === '0') {
    timepointName = '基线';
  } else if (timepointId.length === 3) {
    // the 3rd character is the unscheduled visit number
    const unscheduledVisitNumber = timepointId[2];
    timepointName = `访视${timepointId.slice(0, 2)}后计划外(${unscheduledVisitNumber})`;
  } else if (timepointId.length <= 2) {
    timepointName = `访视${timepointId}`;
  }
  return timepointName;
}

function _getViewportInstances(viewportData) {
  const imageIds = [];
  if (viewportData.viewportType === Enums.ViewportType.STACK) {
    imageIds.push(viewportData.data.imageIds[0]);
  } else if (viewportData.viewportType === Enums.ViewportType.ORTHOGRAPHIC) {
    const volumes = viewportData.data;
    volumes.forEach(volume => {
      if (!volume?.imageIds) {
        return;
      }
      imageIds.push(volume.imageIds[0]);
    });
  }
  const instances = [];

  imageIds.forEach(imageId => {
    const instance = metaData.get('instance', imageId) || {};
    instances.push(instance);
  });
  return instances;
}

const getInstanceNumber = (viewportData, viewportId, imageIndex, cornerstoneViewportService) => {
  let instanceNumber;

  switch (viewportData.viewportType) {
    case Enums.ViewportType.STACK:
      instanceNumber = _getInstanceNumberFromStack(viewportData, imageIndex);
      break;
    case Enums.ViewportType.ORTHOGRAPHIC:
      instanceNumber = _getInstanceNumberFromVolume(
        viewportData,
        viewportId,
        cornerstoneViewportService,
        imageIndex
      );
      break;
  }

  return instanceNumber ?? null;
};

function _getInstanceNumberFromStack(viewportData, imageIndex) {
  const imageIds = viewportData.data.imageIds;
  const imageId = imageIds[imageIndex];

  if (!imageId) {
    return;
  }

  const generalImageModule = metaData.get('generalImageModule', imageId) || {};
  const { instanceNumber } = generalImageModule;

  const stackSize = imageIds.length;

  if (stackSize <= 1) {
    return;
  }

  return parseInt(instanceNumber);
}

// Since volume viewports can be in any view direction, they can render
// a reconstructed image which don't have imageIds; therefore, no instance and instanceNumber
// Here we check if viewport is in the acquisition direction and if so, we get the instanceNumber
function _getInstanceNumberFromVolume(
  viewportData,
  viewportId,
  cornerstoneViewportService,
  imageIndex
) {
  const volumes = viewportData.data;

  if (!volumes) {
    return;
  }

  // Todo: support fusion of acquisition plane which has instanceNumber
  const { volume } = volumes[0];
  const { direction, imageIds } = volume;

  const cornerstoneViewport = cornerstoneViewportService.getCornerstoneViewport(viewportId);

  if (!cornerstoneViewport) {
    return;
  }

  const camera = cornerstoneViewport.getCamera();
  const { viewPlaneNormal } = camera;
  // checking if camera is looking at the acquisition plane (defined by the direction on the volume)

  const scanAxisNormal = direction.slice(6, 9);

  // check if viewPlaneNormal is parallel to scanAxisNormal
  const cross = vec3.cross(vec3.create(), viewPlaneNormal, scanAxisNormal);
  const isAcquisitionPlane = vec3.length(cross) < EPSILON;

  if (isAcquisitionPlane) {
    const imageId = imageIds[imageIndex];

    if (!imageId) {
      return {};
    }

    const { instanceNumber } = metaData.get('generalImageModule', imageId) || {};
    return parseInt(instanceNumber);
  }
}

/**
 * Window Level / Center Overlay item
 */
function VOIOverlayItem({ voi, customization }: OverlayItemProps) {
  const { windowWidth, windowCenter } = voi;
  if (typeof windowCenter !== 'number' || typeof windowWidth !== 'number') {
    return null;
  }

  return (
    <div
      className="overlay-item flex flex-row"
      style={{ color: (customization && customization.color) || undefined }}
    >
      <span className="mr-1 shrink-0">W:</span>
      <span className="ml-1 mr-2 shrink-0">{windowWidth.toFixed(0)}</span>
      <span className="mr-1 shrink-0">L:</span>
      <span className="ml-1 shrink-0">{windowCenter.toFixed(0)}</span>
    </div>
  );
}

/**
 * Zoom Level Overlay item
 */
function ZoomOverlayItem({ scale, customization }: OverlayItemProps) {
  return (
    <div
      className="overlay-item flex flex-row"
      style={{ color: (customization && customization.color) || undefined }}
    >
      <span className="mr-1 shrink-0">Zoom:</span>
      <span>{scale.toFixed(2)}x</span>
    </div>
  );
}

/**
 * Instance Number Overlay Item
 */
function InstanceNumberOverlayItem({
  instanceNumber,
  imageSliceData,
  customization,
}: OverlayItemProps) {
  const { imageIndex, numberOfSlices } = imageSliceData;

  return (
    <div
      className="overlay-item flex flex-row"
      style={{ color: (customization && customization.color) || undefined }}
    >
      <span>
        {instanceNumber !== undefined && instanceNumber !== null ? (
          <>
            <span className="mr-1 shrink-0">I:</span>
            <span>{`${instanceNumber} (${imageIndex + 1}/${numberOfSlices})`}</span>
          </>
        ) : (
          `${imageIndex + 1}/${numberOfSlices}`
        )}
      </span>
    </div>
  );
}

CustomizableViewportOverlay.propTypes = {
  viewportData: PropTypes.object,
  imageIndex: PropTypes.number,
  viewportId: PropTypes.string,
};

export default CustomizableViewportOverlay;
