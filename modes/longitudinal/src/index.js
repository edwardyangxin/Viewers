import { hotkeys, utils } from '@ohif/core';
import toolbarButtons from './toolbarButtons';
import { id } from './id';
import initToolGroups from './initToolGroups';
import moreTools from './moreTools';
import moreToolsMpr from './moreToolsMpr';

const { performAuditLog } = utils;

// Allow this mode by excluding non-imaging modalities such as SR, SEG
// Also, SM is not a simple imaging modalities, so exclude it.
const NON_IMAGE_MODALITIES = ['SM', 'ECG', 'SR', 'SEG', 'RTSTRUCT'];

const DEFAULT_TOOL_GROUP_ID = 'default';
const MPR_TOOL_GROUP_ID = 'mpr';

const ohif = {
  layout: '@ohif/extension-default.layoutTemplateModule.viewerLayout',
  sopClassHandler: '@ohif/extension-default.sopClassHandlerModule.stack',
  thumbnailList: '@ohif/extension-default.panelModule.seriesList',
};

const tracked = {
  measurements: '@ohif/extension-measurement-tracking.panelModule.trackedMeasurements',
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
    displayName: 'Basic Viewer',
    /**
     * Lifecycle hooks
     */
    onModeEnter: async ({ servicesManager, extensionManager, commandsManager }) => {
      const {
        measurementService,
        toolbarService,
        toolGroupService,
        panelService,
        customizationService,
      } = servicesManager.services;

      measurementService.clearMeasurements();

      // Init Default and SR ToolGroups
      initToolGroups(extensionManager, toolGroupService, commandsManager);

      let unsubscribe;
      toolbarService.setDefaultTool({
        groupId: 'WindowLevel',
        itemId: 'WindowLevel',
        interactionType: 'tool',
        commands: [
          {
            commandName: 'setToolActive',
            commandOptions: {
              toolName: 'WindowLevel',
            },
            context: 'CORNERSTONE',
          },
        ],
      });

      const activateTool = () => {
        toolbarService.recordInteraction(toolbarService.getDefaultTool());

        // We don't need to reset the active tool whenever a viewport is getting
        // added to the toolGroup.
        unsubscribe();
      };

      // Since we only have one viewport for the basic cs3d mode and it has
      // only one hanging protocol, we can just use the first viewport
      ({ unsubscribe } = toolGroupService.subscribe(
        toolGroupService.EVENTS.VIEWPORT_ADDED,
        activateTool
      ));

      toolbarService.init(extensionManager);
      toolbarService.addButtons([...toolbarButtons, ...moreTools, ...moreToolsMpr]);
      toolbarService.createButtonSection(DEFAULT_TOOL_GROUP_ID, [
        'MeasurementTools',
        'Zoom',
        'WindowLevel',
        'Pan',
        'Capture',
        'Layout',
        'MPR',
        'MoreTools',
      ]);
      toolbarService.createButtonSection(MPR_TOOL_GROUP_ID, [
        'MeasurementTools',
        'Zoom',
        'WindowLevel',
        'Pan',
        'Capture',
        'Layout',
        'MPR',
        'Crosshairs',
        'MoreToolsMpr',
      ]);

      customizationService.addModeCustomizations([
        {
          id: 'segmentation.disableEditing',
          value: true,
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
      const { _appConfig } = extensionManager;
      // get StudyInstanceUIDs from URL, assume only one study uids
      const urlParams = new URLSearchParams(window.location.search);
      const StudyInstanceUIDs = urlParams.get('StudyInstanceUIDs');

      const auditMsg = 'entering viewer mode';
      const auditLogBodyMeta = {
        StudyInstanceUID: StudyInstanceUIDs,
        action: auditMsg,
        action_result: 'success',
      };
      performAuditLog(_appConfig, userAuthenticationService, 'i', auditMsg, auditLogBodyMeta);
    },
    onModeExit: async ({ servicesManager, extensionManager }) => {
      const {
        toolGroupService,
        syncGroupService,
        toolbarService,
        segmentationService,
        cornerstoneViewportService,
      } = servicesManager.services;

      _activatePanelTriggersSubscriptions.forEach(sub => sub.unsubscribe());
      _activatePanelTriggersSubscriptions = [];

      toolGroupService.destroy();
      syncGroupService.destroy();
      segmentationService.destroy();
      cornerstoneViewportService.destroy();

      // evibased, audit log, no studyUID available
      const { userAuthenticationService } = servicesManager.services;
      const { _appConfig } = extensionManager;
      // get StudyInstanceUIDs from URL, assume only one study uids
      const urlParams = new URLSearchParams(window.location.search);
      const StudyInstanceUIDs = urlParams.get('StudyInstanceUIDs');
      const auditMsg = 'leave viewer mode';
      const auditLogBodyMeta = {
        StudyInstanceUID: StudyInstanceUIDs,
        action: auditMsg,
        action_result: 'success',
      };
      performAuditLog(_appConfig, userAuthenticationService, 'i', auditMsg, auditLogBodyMeta);
    },
    validationTags: {
      study: [],
      series: [],
    },

    isValidMode: function ({ modalities }) {
      const modalities_list = modalities.split('\\');

      // Exclude non-image modalities
      return !!modalities_list.filter(modality => NON_IMAGE_MODALITIES.indexOf(modality) === -1)
        .length;
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
              rightPanels: [tracked.measurements, dicomSeg.panel],
              rightPanelDefaultClosed: false,
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
export { initToolGroups, toolbarButtons };
