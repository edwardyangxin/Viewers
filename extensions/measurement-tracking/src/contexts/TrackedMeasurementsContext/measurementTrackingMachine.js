import { hydrateStructuredReport } from '@ohif/extension-cornerstone-dicom-sr';
import { assign } from 'xstate';
import { annotation as CsAnnotation } from '@cornerstonejs/tools';
import { reportMeasurementToReadonlyMeasurement } from '../../utils/utils';

const RESPONSE = {
  NO_NEVER: -1,
  CANCEL: 0,
  CREATE_REPORT: 1,
  ADD_SERIES: 2,
  SET_STUDY_AND_SERIES: 3,
  NO_NOT_FOR_SERIES: 4,
  HYDRATE_REPORT: 5,
};

const machineConfiguration = {
  id: 'measurementTracking',
  initial: 'idle',
  context: {
    activeViewportId: null,
    currentViewportId: null,
    comparedViewportId: null,
    trackedStudy: '',
    trackedSeries: [],
    ignoredSeries: [],
    //
    prevTrackedStudy: '',
    prevTrackedSeries: [],
    prevIgnoredSeries: [],
    //
    ignoredSRSeriesForHydration: [],
    isDirty: false,
    // evibased
    username: undefined,
    userRoles: undefined,
    currentTask: undefined,
    successSaveReport: false,
    currentTimepoint: undefined,
    baselineTimepoint: undefined,
    lastTimepoint: undefined,
    lowestSODTimepoint: undefined,
    comparedTimepoint: undefined,
    comparedReportInfo: undefined,
    pastTimepoints: undefined,
    currentReportInfo: undefined,
    taskInfo: {
      nextTaskStudyUID: undefined,
      totalTask: undefined,
      userTasks: [],
    },
  },
  states: {
    off: {
      type: 'final',
    },
    idle: {
      entry: 'clearContext',
      on: {
        TRACK_SERIES: 'promptBeginTracking',
        // Unused? We may only do PROMPT_HYDRATE_SR now?
        SET_TRACKED_SERIES: [
          {
            target: 'tracking',
            actions: ['setTrackedStudyAndMultipleSeries', 'setIsDirtyToClean'],
          },
        ],
        PROMPT_HYDRATE_SR: {
          target: 'promptHydrateStructuredReport',
          cond: 'hasNotIgnoredSRSeriesForHydration',
        },
        RESTORE_PROMPT_HYDRATE_SR: 'promptHydrateStructuredReport',
        HYDRATE_SR: 'hydrateStructuredReport',
        UPDATE_ACTIVE_VIEWPORT_ID: {
          actions: assign({
            activeViewportId: (_, event) => event.activeViewportId,
          }),
        },
        // evibased
        // load report to measurements
        UPDATE_BACKEND_REPORT: {
          target: 'updateBackendReport',
        },
        UPDATE_USERNAME: {
          actions: assign({
            username: (_, event) => event.username,
          }),
        },
        UPDATE_USERROLES: {
          actions: assign({
            userRoles: (_, event) => event.userRoles,
          }),
        },
        UPDATE_CURRENT_TASK: {
          actions: assign({
            currentTask: (_, event) => event.currentTask,
          }),
        },
        UPDATE_TASK_INFO: {
          actions: assign({
            taskInfo: (_, event) => event.taskInfo,
          }),
        },
        UPDATE_CURRENT_TIMEPOINT: {
          actions: assign({
            currentTimepoint: (_, event) => event.currentTimepoint,
          }),
        },
        UPDATE_BASELINE_TIMEPOINT: {
          actions: assign({
            baselineTimepoint: (_, event) => event.baselineTimepoint,
          }),
        },
        UPDATE_LAST_TIMEPOINT: {
          actions: assign({
            lastTimepoint: (_, event) => event.lastTimepoint,
          }),
        },
        UPDATE_LOWEST_SOD_TIMEPOINT: {
          actions: assign({
            lowestSODTimepoint: (_, event) => event.lowestSODTimepoint,
          }),
        },
        UPDATE_COMPARED_TIMEPOINT: {
          actions: ['updateComparedTimepointInfo'],
        },
        UPDATE_COMPARED_REPORT: {
          actions: assign({
            comparedReportInfo: (_, event) => event.comparedReportInfo,
          }),
        },
        UPDATE_PAST_TIMEPOINTS: {
          actions: assign({
            pastTimepoints: (_, event) => event.pastTimepoints,
          }),
        },
        UPDATE_CURRENT_VIEWPORT_ID: {
          actions: assign({
            currentViewportId: (_, event) => event.currentViewportId,
          }),
        },
        UPDATE_COMPARED_VIEWPORT_ID: {
          actions: assign({
            comparedViewportId: (_, event) => event.comparedViewportId,
          }),
        },
        SAVE_REPORT: 'promptSaveReport',
      },
    },
    promptBeginTracking: {
      invoke: {
        src: 'promptBeginTracking',
        onDone: [
          {
            target: 'tracking',
            actions: ['setTrackedStudyAndSeries', 'setIsDirty'],
            cond: 'shouldSetStudyAndSeries',
          },
          {
            target: 'off',
            cond: 'shouldKillMachine',
          },
          {
            target: 'idle',
          },
        ],
        onError: {
          target: 'idle',
        },
      },
    },
    tracking: {
      on: {
        TRACK_SERIES: [
          {
            target: 'promptTrackNewStudy',
            cond: 'isNewStudy',
          },
          {
            target: 'promptTrackNewSeries',
            cond: 'isNewSeries',
          },
        ],
        UNTRACK_SERIES: [
          {
            target: 'tracking',
            actions: ['removeTrackedSeries', 'setIsDirty'],
            cond: 'hasRemainingTrackedSeries',
          },
          {
            target: 'idle',
          },
        ],
        SET_TRACKED_SERIES: [
          {
            target: 'tracking',
            actions: ['setTrackedStudyAndMultipleSeries'],
          },
        ],
        SAVE_REPORT: 'promptSaveReport',
        SET_DIRTY: [
          {
            target: 'tracking',
            actions: ['setIsDirty'],
            cond: 'shouldSetDirty',
          },
          {
            target: 'tracking',
          },
        ],
        // evibased
        UPDATE_TASK_INFO: {
          actions: assign({
            taskInfo: (_, event) => event.taskInfo,
          }),
        },
        UNTRACK_ALL: [
          {
            target: 'idle',
            actions: ['clearAllMeasurements'],
          },
        ],
      },
    },
    promptTrackNewSeries: {
      invoke: {
        src: 'promptTrackNewSeries',
        onDone: [
          {
            target: 'tracking',
            actions: ['addTrackedSeries', 'setIsDirty'],
            cond: 'shouldAddSeries',
          },
          {
            target: 'tracking',
            actions: [
              'discardPreviouslyTrackedMeasurements',
              'setTrackedStudyAndSeries',
              'setIsDirty',
            ],
            cond: 'shouldSetStudyAndSeries',
          },
          {
            target: 'promptSaveReport',
            cond: 'shouldPromptSaveReport',
          },
          {
            target: 'tracking',
          },
        ],
        onError: {
          target: 'idle',
        },
      },
    },
    promptTrackNewStudy: {
      invoke: {
        src: 'promptTrackNewStudy',
        onDone: [
          {
            target: 'tracking',
            actions: [
              'discardPreviouslyTrackedMeasurements',
              'setTrackedStudyAndSeries',
              'setIsDirty',
            ],
            cond: 'shouldSetStudyAndSeries',
          },
          {
            target: 'tracking',
            actions: ['ignoreSeries'],
            cond: 'shouldAddIgnoredSeries',
          },
          {
            target: 'promptSaveReport',
            cond: 'shouldPromptSaveReport',
          },
          {
            target: 'tracking',
          },
        ],
        onError: {
          target: 'idle',
        },
      },
    },
    promptSaveReport: {
      invoke: {
        src: 'promptSaveReport',
        onDone: [
          // evibased, disable clear all measurements after save
          // "clicked the save button"
          // - should clear all measurements
          // - show DICOM SR
          // {
          //   target: 'idle',
          //   actions: ['clearAllMeasurements', 'showStructuredReportDisplaySetInActiveViewport'],
          //   cond: 'shouldSaveAndContinueWithSameReport',
          // },
          // "starting a new report"
          // - remove "just saved" measurements
          // - start tracking a new study + report
          // {
          //   target: 'tracking',
          //   actions: ['discardPreviouslyTrackedMeasurements', 'setTrackedStudyAndSeries'],
          //   cond: 'shouldSaveAndStartNewReport',
          // },
          // update successSaveReport context variable
          {
            target: 'tracking',
            actions: ['successSaveReport'],
            cond: 'ifSuccessSaveReport',
          },
          // Cancel, back to tracking
          {
            target: 'tracking',
          },
        ],
        onError: {
          target: 'idle',
        },
      },
    },
    promptHydrateStructuredReport: {
      invoke: {
        src: 'promptHydrateStructuredReport',
        onDone: [
          {
            target: 'tracking',
            actions: [
              'setTrackedStudyAndMultipleSeries',
              'jumpToFirstMeasurementInActiveViewport',
              'setIsDirtyToClean',
            ],
            cond: 'shouldHydrateStructuredReport',
          },
          {
            target: 'idle',
            actions: ['ignoreHydrationForSRSeries'],
            cond: 'shouldIgnoreHydrationForSR',
          },
        ],
        onError: {
          target: 'idle',
        },
      },
    },
    hydrateStructuredReport: {
      invoke: {
        src: 'hydrateStructuredReport',
        onDone: [
          {
            target: 'tracking',
            actions: [
              'setTrackedStudyAndMultipleSeries',
              'jumpToFirstMeasurementInActiveViewport',
              'setIsDirtyToClean',
            ],
          },
        ],
        onError: {
          target: 'idle',
        },
      },
    },
    // evibased
    // add update backend report
    updateBackendReport: {
      invoke: {
        src: 'updateBackendReport',
        onDone: [
          {
            target: 'tracking',
            actions: [
              'setTrackedStudyAndMultipleSeries',
              'setCurrentReportInfo',
              // 'jumpToFirstMeasurementInActiveViewport',
              'jumpToFirstMeasurementInCurrentViewport', // evibased
              'setIsDirtyToClean',
            ],
          },
        ],
        onError: {
          target: 'idle',
        },
      },
    },
  },
  strict: true,
};

const defaultOptions = {
  services: {
    promptBeginTracking: (ctx, evt) => {
      // return { userResponse, StudyInstanceUID, SeriesInstanceUID }
    },
    promptTrackNewStudy: (ctx, evt) => {
      // return { userResponse, StudyInstanceUID, SeriesInstanceUID }
    },
    promptTrackNewSeries: (ctx, evt) => {
      // return { userResponse, StudyInstanceUID, SeriesInstanceUID }
    },
  },
  actions: {
    discardPreviouslyTrackedMeasurements: (ctx, evt) => {
      console.log('discardPreviouslyTrackedMeasurements: not implemented');
    },
    clearAllMeasurements: (ctx, evt) => {
      console.log('clearAllMeasurements: not implemented');
    },
    jumpToFirstMeasurementInActiveViewport: (ctx, evt) => {
      console.warn('jumpToFirstMeasurementInActiveViewport: not implemented');
    },
    jumpToFirstMeasurementInCurrentViewport: (ctx, evt) => {
      console.warn('jumpToFirstMeasurementInCurrentViewport: not implemented');
    },
    showStructuredReportDisplaySetInActiveViewport: (ctx, evt) => {
      console.warn('showStructuredReportDisplaySetInActiveViewport: not implemented');
    },
    clearContext: assign({
      trackedStudy: '',
      trackedSeries: [],
      ignoredSeries: [],
      prevTrackedStudy: '',
      prevTrackedSeries: [],
      prevIgnoredSeries: [],
      // evibased
      currentReportInfo: undefined, // reset loaded report info
    }),
    // Promise resolves w/ `evt.data.*`
    setTrackedStudyAndSeries: assign((ctx, evt) => {
      console.log("measurementTrackingMachine action(setTrackedStudyAndSeries): ", evt.type, evt);
      return {
        prevTrackedStudy: ctx.trackedStudy,
        prevTrackedSeries: ctx.trackedSeries.slice(),
        prevIgnoredSeries: ctx.ignoredSeries.slice(),
        //
        trackedStudy: evt.data.StudyInstanceUID,
        trackedSeries: [evt.data.SeriesInstanceUID],
        ignoredSeries: [],
      };
    }),
    setTrackedStudyAndMultipleSeries: assign((ctx, evt) => {
      console.log("measurementTrackingMachine action(): ", evt.type, evt);
      const studyInstanceUID = evt.StudyInstanceUID || evt.data.StudyInstanceUID;
      const seriesInstanceUIDs = evt.SeriesInstanceUIDs || evt.data.SeriesInstanceUIDs;

      return {
        prevTrackedStudy: ctx.trackedStudy,
        prevTrackedSeries: ctx.trackedSeries.slice(),
        prevIgnoredSeries: ctx.ignoredSeries.slice(),
        //
        trackedStudy: studyInstanceUID,
        trackedSeries: [...ctx.trackedSeries, ...seriesInstanceUIDs],
        ignoredSeries: [],
      };
    }),
    setIsDirtyToClean: assign((ctx, evt) => {
      console.log("measurementTrackingMachine action(setIsDirtyToClean): ", evt.type, evt);

      return {
        isDirty: false,
      }
    }),
    setIsDirty: assign((ctx, evt) => {
      console.log("measurementTrackingMachine action(setIsDirty): ", evt.type, evt);

      return {
        isDirty: true,
      }
    }),
    ignoreSeries: assign((ctx, evt) => {
      console.log("measurementTrackingMachine action(ignoreSeries): ", evt.type, evt);

      return {
        prevIgnoredSeries: [...ctx.ignoredSeries],
        ignoredSeries: [...ctx.ignoredSeries, evt.data.SeriesInstanceUID],
      }
    }),
    ignoreHydrationForSRSeries: assign((ctx, evt) => {
      console.log("measurementTrackingMachine action(ignoreHydrationForSRSeries): ", evt.type, evt);

      return {
        ignoredSRSeriesForHydration: [
          ...ctx.ignoredSRSeriesForHydration,
          evt.data.srSeriesInstanceUID,
      ],
      }
    }),
    addTrackedSeries: assign((ctx, evt) => {
      console.log("measurementTrackingMachine action(addTrackedSeries): ", evt.type, evt);

      return {
        prevTrackedSeries: [...ctx.trackedSeries],
        trackedSeries: [...ctx.trackedSeries, evt.data.SeriesInstanceUID],
      }
    }),
    removeTrackedSeries: assign((ctx, evt) => {
      console.log("measurementTrackingMachine action(removeTrackedSeries): ", evt.type, evt);

      return {
        prevTrackedSeries: ctx.trackedSeries.slice().filter(ser => ser !== evt.SeriesInstanceUID),
        trackedSeries: ctx.trackedSeries.slice().filter(ser => ser !== evt.SeriesInstanceUID),
      };
    }),
    // evibased, actions
    setCurrentReportInfo: assign((ctx, evt) => {
      console.log("measurementTrackingMachine action(setCurrentReportInfo): ", evt.type, evt);

      return {
        currentReportInfo: evt.data.reportInfo,
      };
    }),
    successSaveReport: assign((ctx, evt) => {
      console.log("measurementTrackingMachine action(successSaveReport): ", evt.type, evt);

      return {
        successSaveReport: true,
      };
    }),
    // evibased, compared timepoint
    updateComparedTimepointInfo: assign((ctx, evt) => {
      console.log("measurementTrackingMachine action(updateComparedTimepointInfo): ", evt.type, evt);
      const extensionManager = evt.extensionManager;
      const measurementService = evt.measurementService;
      const comparedViewportId = evt.comparedViewportId ? evt.comparedViewportId : 'default';
      const appConfig = evt.appConfig;
      // check comparedTimepoint studyInstanceUid
      if (!evt.comparedTimepoint || ctx.comparedTimepoint?.studyInstanceUid === evt.comparedTimepoint.studyInstanceUid) {
        // no comparedTimepoint or same studyInstanceUid
        return {};
      } else {
        // deprecated, different studyInstanceUid, clear all readonly measurements
        // measurementService.clearReadonlyMeasurements();
      }

      // create readonly measurements and annotations
      // default load first report
      let reportData = evt.comparedTimepoint.reports? evt.comparedTimepoint.reports[0]: undefined;
      if (!reportData) {
        // timepoint without report
        return {
          comparedTimepoint: evt.comparedTimepoint,
        };
      }
      
      // const reportInfo = reportData.report_info;
      let measurements = reportData.measurements;

      // loop through all measurements, and create readonly measurements and annotations
      for (let i = 0; i < measurements.length; i++) {
        let measurement = measurements[i];
        const newReadonlyMeasurementUID = reportMeasurementToReadonlyMeasurement(
          extensionManager,
          measurementService,
          appConfig,
          measurement
        );
         measurement.readonlyMeasurementUID = newReadonlyMeasurementUID;
      }

      // auto jump to first measurement in compared viewport
      const firstMeasurementUid = measurements[0].uid;
      measurementService.jumpToReadonlyMeasurement(comparedViewportId, firstMeasurementUid);

      return {
        comparedTimepoint: evt.comparedTimepoint,
      };
    }),
  },
  guards: {
    // We set dirty any time we performan an action that:
    // - Tracks a new study
    // - Tracks a new series
    // - Adds a measurement to an already tracked study/series
    //
    // We set clean any time we restore from an SR
    //
    // This guard/condition is specific to "new measurements"
    // to make sure we only track dirty when the new measurement is specific
    // to a series we're already tracking
    //
    // tl;dr
    // Any report change, that is not a hydration of an existing report, should
    // result in a "dirty" report
    //
    // Where dirty means there would be "loss of data" if we blew away measurements
    // without creating a new SR.
    shouldSetDirty: (ctx, evt) => {
      return (
        // When would this happen?
        evt.SeriesInstanceUID === undefined || ctx.trackedSeries.includes(evt.SeriesInstanceUID)
      );
    },
    shouldKillMachine: (ctx, evt) => evt.data && evt.data.userResponse === RESPONSE.NO_NEVER,
    shouldAddSeries: (ctx, evt) => evt.data && evt.data.userResponse === RESPONSE.ADD_SERIES,
    shouldSetStudyAndSeries: (ctx, evt) => {
      if (ctx.currentTimepoint && ctx.currentTimepoint.studyInstanceUid !== evt.data.StudyInstanceUID) {
        return false;
      }
      return evt.data && evt.data.userResponse === RESPONSE.SET_STUDY_AND_SERIES;
    },
    shouldAddIgnoredSeries: (ctx, evt) =>
      evt.data && evt.data.userResponse === RESPONSE.NO_NOT_FOR_SERIES,
    shouldPromptSaveReport: (ctx, evt) =>
      evt.data && evt.data.userResponse === RESPONSE.CREATE_REPORT,
    shouldIgnoreHydrationForSR: (ctx, evt) => evt.data && evt.data.userResponse === RESPONSE.CANCEL,
    shouldSaveAndContinueWithSameReport: (ctx, evt) =>
      evt.data &&
      evt.data.userResponse === RESPONSE.CREATE_REPORT &&
      evt.data.isBackupSave === true,
    shouldSaveAndStartNewReport: (ctx, evt) =>
      evt.data &&
      evt.data.userResponse === RESPONSE.CREATE_REPORT &&
      evt.data.isBackupSave === false,
    shouldHydrateStructuredReport: (ctx, evt) =>
      evt.data && evt.data.userResponse === RESPONSE.HYDRATE_REPORT,
    // Has more than 1, or SeriesInstanceUID is not in list
    // --> Post removal would have non-empty trackedSeries array
    hasRemainingTrackedSeries: (ctx, evt) =>
      ctx.trackedSeries.length > 1 || !ctx.trackedSeries.includes(evt.SeriesInstanceUID),
    hasNotIgnoredSRSeriesForHydration: (ctx, evt) => {
      return !ctx.ignoredSRSeriesForHydration.includes(evt.SeriesInstanceUID);
    },
    isNewStudy: (ctx, evt) =>
      !ctx.ignoredSeries.includes(evt.SeriesInstanceUID) &&
      ctx.trackedStudy !== evt.StudyInstanceUID,
    isNewSeries: (ctx, evt) =>
      !ctx.ignoredSeries.includes(evt.SeriesInstanceUID) &&
      !ctx.trackedSeries.includes(evt.SeriesInstanceUID),
    // evibased, cond on success save report
    ifSuccessSaveReport: (ctx, evt) => evt.data && evt.data.userResponse === RESPONSE.CREATE_REPORT && evt.data.successSaveReport,
  },
};

export { defaultOptions, machineConfiguration };
