import { hotkeys } from '@ohif/core';
import i18n from 'i18next';
import { id } from './id';
import initToolGroups from './initToolGroups';
import toolbarButtons from './toolbarButtons';
import moreTools from './moreTools';

// Allow this mode by excluding non-imaging modalities such as SR, SEG
// Also, SM is not a simple imaging modalities, so exclude it.
const NON_IMAGE_MODALITIES = ['SM', 'ECG', 'SR', 'SEG', 'RTSTRUCT'];

const ohif = {
  layout: '@ohif/extension-default.layoutTemplateModule.viewerLayout',
  sopClassHandler: '@ohif/extension-default.sopClassHandlerModule.stack',
  thumbnailList: '@ohif/extension-default.panelModule.seriesList',
};

const tracked = {
  measurements: '@ohif/extension-measurement-tracking.panelModule.trackedMeasurements',
  pastReports: '@ohif/extension-measurement-tracking.panelModule.pastReports',
  thumbnailList: '@ohif/extension-measurement-tracking.panelModule.seriesList',
  viewport: '@ohif/extension-measurement-tracking.viewportModule.cornerstone-tracked',
};

const dicomsr = {
  sopClassHandler: '@ohif/extension-cornerstone-dicom-sr.sopClassHandlerModule.dicom-sr',
  viewport: '@ohif/extension-cornerstone-dicom-sr.viewportModule.dicom-sr',
};

const dicomvideo = {
  sopClassHandler: '@ohif/extension-dicom-video.sopClassHandlerModule.dicom-video',
  viewport: '@ohif/extension-dicom-video.viewportModule.dicom-video',
};

const dicompdf = {
  sopClassHandler: '@ohif/extension-dicom-pdf.sopClassHandlerModule.dicom-pdf',
  viewport: '@ohif/extension-dicom-pdf.viewportModule.dicom-pdf',
};

const dicomSeg = {
  sopClassHandler: '@ohif/extension-cornerstone-dicom-seg.sopClassHandlerModule.dicom-seg',
  viewport: '@ohif/extension-cornerstone-dicom-seg.viewportModule.dicom-seg',
  panel: '@ohif/extension-cornerstone-dicom-seg.panelModule.panelSegmentation',
};

const dicomRT = {
  viewport: '@ohif/extension-cornerstone-dicom-rt.viewportModule.dicom-rt',
  sopClassHandler: '@ohif/extension-cornerstone-dicom-rt.sopClassHandlerModule.dicom-rt',
};

const extensionDependencies = {
  // Can derive the versions at least process.env.from npm_package_version
  '@ohif/extension-default': '^3.0.0',
  '@ohif/extension-cornerstone': '^3.0.0',
  '@ohif/extension-measurement-tracking': '^3.0.0',
  '@ohif/extension-cornerstone-dicom-sr': '^3.0.0',
  '@ohif/extension-cornerstone-dicom-seg': '^3.0.0',
  '@ohif/extension-cornerstone-dicom-rt': '^3.0.0',
  '@ohif/extension-dicom-pdf': '^3.0.1',
  '@ohif/extension-dicom-video': '^3.0.1',
};

function modeFactory({ modeConfiguration }) {
  let _activatePanelTriggersSubscriptions = [];
  return {
    // TODO: We're using this as a route segment
    // We should not be.
    id,
    routeName: 'viewer',
    displayName: i18n.t('Modes:Basic Viewer'),
    /**
     * Lifecycle hooks
     */
    onModeEnter: async function ({ servicesManager, extensionManager, commandsManager }) {
      const {
        measurementService,
        toolbarService,
        toolGroupService,
        customizationService,
        logSinkService, // evibased, audit log
      } = servicesManager.services;

      measurementService.clearMeasurements();

      // customizationService.addModeCustomizations([
      //   {
      //     id: 'measurementLabels',
      //     labelOnMeasure: true,
      //     exclusive: true,
      //     items: [
      //       { value: 'Head', label: 'Head' },
      //       { value: 'Shoulder', label: 'Shoulder' },
      //       { value: 'Knee', label: 'Knee' },
      //       { value: 'Toe', label: 'Toe' },
      //     ],
      //   },
      // ]);

      // Init Default and SR ToolGroups
      initToolGroups(extensionManager, toolGroupService, commandsManager, this.labelConfig);

      toolbarService.addButtons([...toolbarButtons, ...moreTools]);
      toolbarService.createButtonSection('primary', [
        // evibased, top toolbar
        // group annotation tools
        // 'MeasurementTools',
        // annotation tools
        // 'Length',
        'Bidirectional',
        'ArrowAnnotate',
        'Rectangle',
        // other tools
        'Zoom',
        'Pan',
        'TrackballRotate',
        'WindowLevel',
        // 'Capture',
        'Layout',
        'StackImageSync',
        // 'MPR', // evibased, use layout MPR instead
        'Crosshairs',
        'MoreTools',
      ]);

      // evibased, comment 没有需要两套toolbar，这里是一个为了MRP mode下toolbar的例子
      // toolbarService.createButtonSection(MPR_TOOL_GROUP_ID, [
      //   'MeasurementTools',
      //   'Zoom',
      //   'WindowLevel',
      //   'Pan',
      //   // 'Capture',
      //   // 'Layout',
      //   'MPR',
      //   'Crosshairs',
      //   'MoreTools',
      // ]);

      // evibased, init customizations, for custom context menu
      customizationService.addModeCustomizations([
        '@ohif/extension-measurement-tracking.customizationModule.custom-context-menu',
        {
          id: 'segmentation.panel',
          disableEditing: true,
        },
      ]);

      // // ActivatePanel event trigger for when a segmentation or measurement is added.
      // // Do not force activation so as to respect the state the user may have left the UI in.
      // _activatePanelTriggersSubscriptions = [
      //   ...panelService.addActivatePanelTriggers(dicomSeg.panel, [
      //     {
      //       sourcePubSubService: segmentationService,
      //       sourceEvents: [
      //         segmentationService.EVENTS.SEGMENTATION_PIXEL_DATA_CREATED,
      //       ],
      //     },
      //   ]),
      //   ...panelService.addActivatePanelTriggers(tracked.measurements, [
      //     {
      //       sourcePubSubService: measurementService,
      //       sourceEvents: [
      //         measurementService.EVENTS.MEASUREMENT_ADDED,
      //         measurementService.EVENTS.RAW_MEASUREMENT_ADDED,
      //       ],
      //     },
      //   ]),
      // ];

      // evibased, audit log
      const { userAuthenticationService } = servicesManager.services;
      // get StudyInstanceUIDs from URL, assume only one study uids
      const urlParams = new URLSearchParams(window.location.search);
      const StudyInstanceUIDs = urlParams.get('StudyInstanceUIDs');
      logSinkService._broadcastEvent(logSinkService.EVENTS.LOG_ACTION, {
        msg: 'entering viewer mode',
        action: 'ENTER_VIEWER',
        username: userAuthenticationService.getUser()?.profile?.preferred_username,
        authHeader: userAuthenticationService.getAuthorizationHeader(),
        data: {
          action_result: 'success',
          StudyInstanceUID: StudyInstanceUIDs,
        },
      });
    },
    onModeExit: async ({ servicesManager, extensionManager }) => {
      const {
        toolGroupService,
        syncGroupService,
        segmentationService,
        cornerstoneViewportService,
        uiDialogService,
        uiModalService,
        logSinkService,
      } = servicesManager.services;

      _activatePanelTriggersSubscriptions.forEach(sub => sub.unsubscribe());
      _activatePanelTriggersSubscriptions = [];

      uiDialogService.dismissAll();
      uiModalService.hide();
      toolGroupService.destroy();
      syncGroupService.destroy();
      segmentationService.destroy();
      cornerstoneViewportService.destroy();

      // evibased, audit log, no studyUID available
      const { userAuthenticationService } = servicesManager.services;
      // get StudyInstanceUIDs from URL, assume only one study uids
      const urlParams = new URLSearchParams(window.location.search);
      const StudyInstanceUIDs = urlParams.get('StudyInstanceUIDs');
      logSinkService._broadcastEvent(logSinkService.EVENTS.LOG_ACTION, {
        msg: 'leave viewer mode',
        action: 'LEAVE_VIEWER',
        username: userAuthenticationService.getUser()?.profile?.preferred_username,
        authHeader: userAuthenticationService.getAuthorizationHeader(),
        data: {
          action_result: 'success',
          StudyInstanceUID: StudyInstanceUIDs,
        },
      });
    },
    validationTags: {
      study: [],
      series: [],
    },

    isValidMode: function ({ modalities, taskTypes }) {
      // const modalities_list = modalities.split('\\');

      let valid = false;
      for (const taskType of taskTypes) {
        if (taskType !== 'QC-data') {
          valid = true;
          break;
        }
      }
      // Exclude non-image modalities
      return {
        // valid: !!modalities_list.filter(modality => NON_IMAGE_MODALITIES.indexOf(modality) === -1)
        //   .length,
        valid,
        description:
          'The mode does not support studies that ONLY include the following modalities: SM, ECG, SR, SEG, RTSTRUCT',
      };
    },
    routes: [
      {
        path: 'longitudinal',
        /*init: ({ servicesManager, extensionManager }) => {
          //defaultViewerRouteInit
        },*/
        layoutTemplate: () => {
          return {
            id: ohif.layout,
            props: {
              leftPanels: [tracked.thumbnailList],
              // rightPanels: [dicomSeg.panel, tracked.measurements], // evibased, disable dicomSeg panel
              rightPanels: [tracked.measurements, tracked.pastReports],
              rightPanelClosed: false,
              viewports: [
                {
                  namespace: tracked.viewport,
                  displaySetsToDisplay: [ohif.sopClassHandler],
                },
                {
                  namespace: dicomsr.viewport,
                  displaySetsToDisplay: [dicomsr.sopClassHandler],
                },
                {
                  namespace: dicomvideo.viewport,
                  displaySetsToDisplay: [dicomvideo.sopClassHandler],
                },
                {
                  namespace: dicompdf.viewport,
                  displaySetsToDisplay: [dicompdf.sopClassHandler],
                },
                {
                  namespace: dicomSeg.viewport,
                  displaySetsToDisplay: [dicomSeg.sopClassHandler],
                },
                {
                  namespace: dicomRT.viewport,
                  displaySetsToDisplay: [dicomRT.sopClassHandler],
                },
              ],
            },
          };
        },
      },
    ],
    extensions: extensionDependencies,
    // Default protocol gets self-registered by default in the init
    hangingProtocol: 'default',
    // Order is important in sop class handlers when two handlers both use
    // the same sop class under different situations.  In that case, the more
    // general handler needs to come last.  For this case, the dicomvideo must
    // come first to remove video transfer syntax before ohif uses images
    sopClassHandlers: [
      dicomvideo.sopClassHandler,
      dicomSeg.sopClassHandler,
      ohif.sopClassHandler,
      dicompdf.sopClassHandler,
      dicomsr.sopClassHandler,
      dicomRT.sopClassHandler,
    ],
    hotkeys: [...hotkeys.defaults.hotkeyBindings],
    ...modeConfiguration,
  };
}

const mode = {
  id,
  modeFactory,
  extensionDependencies,
};

export default mode;
export { initToolGroups, moreTools, toolbarButtons };
