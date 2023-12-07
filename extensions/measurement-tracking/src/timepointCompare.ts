import { Types } from '@ohif/core';

const defaultDisplaySetSelector = {
  studyMatchingRules: [
    {
      // The priorInstance is a study counter that indicates what position this study is in
      // and the value comes from the options parameter.
      attribute: 'studyInstanceUIDsIndex',
      from: 'options',
      required: true,
      constraint: {
        equals: { value: 0 },
      },
    },
  ],
  seriesMatchingRules: [
    {
      attribute: 'numImageFrames',
      constraint: {
        greaterThan: { value: 0 },
      },
    },
    // This display set will select the specified items by preference
    // It has no affect if nothing is specified in the URL.
    {
      attribute: 'isDisplaySetFromUrl',
      weight: 10,
      constraint: {
        equals: true,
      },
    },
  ],
};

const priorDisplaySetSelector = {
  studyMatchingRules: [
    {
      // The priorInstance is a study counter that indicates what position this study is in
      // and the value comes from the options parameter.
      attribute: 'studyInstanceUIDsIndex',
      from: 'options',
      required: true,
      constraint: {
        equals: { value: 1 },
      },
    },
  ],
  seriesMatchingRules: [
    {
      attribute: 'numImageFrames',
      constraint: {
        greaterThan: { value: 0 },
      },
    },
    // This display set will select the specified items by preference
    // It has no affect if nothing is specified in the URL.
    {
      attribute: 'isDisplaySetFromUrl',
      weight: 10,
      constraint: {
        equals: true,
      },
    },
  ],
};

const currentDisplaySet = {
  id: 'currentDisplaySetId',
};

const priorDisplaySet = {
  id: 'comparedDisplaySetId',
};

const currentViewport0 = {
  viewportOptions: {
    toolGroupId: 'default',
    allowUnmatchedView: true,
  },
  displaySets: [currentDisplaySet],
};

const currentViewport1 = {
  ...currentViewport0,
  displaySets: [
    {
      ...currentDisplaySet,
      matchedDisplaySetsIndex: 1,
    },
  ],
};

const priorViewport0 = {
  ...currentViewport0,
  displaySets: [priorDisplaySet],
};

const priorViewport1 = {
  ...priorViewport0,
  displaySets: [
    {
      ...priorDisplaySet,
      matchedDisplaySetsIndex: 1,
    },
  ],
};

/**
 * This hanging protocol can be activated on the primary mode by directly
 * referencing it in a URL or by directly including it within a mode, e.g.:
 * `&hangingProtocolId=@ohif/mnGrid` added to the viewer URL
 * It is not included in the viewer mode by default.
 */
const timepointCompare: Types.HangingProtocol.Protocol = {
  id: '@ohif/timepointCompare',
  description: 'Compare two timepoints in various layouts',
  name: 'Compare Two Studies',
  numberOfPriorsReferenced: 1,
  protocolMatchingRules: [
    {
      id: 'Two Studies',
      weight: 1000,
      attribute: 'StudyInstanceUID',
      // The 'from' attribute says where to get the 'attribute' value from.  In this case
      // prior means the second study in the study list.
      from: 'prior',
      required: true,
      constraint: {
        notNull: true,
      },
    },
  ],
  toolGroupIds: ['default'],
  displaySetSelectors: {
    currentDisplaySetId: defaultDisplaySetSelector,
    comparedDisplaySetId: priorDisplaySetSelector,
  },
  defaultViewport: {
    viewportOptions: {
      viewportType: 'stack',
      toolGroupId: 'default',
      allowUnmatchedView: true,
    },
    displaySets: [
      {
        id: 'currentDisplaySetId',
        matchedDisplaySetsIndex: -1,
      },
    ],
  },
  stages: [
    // default, 2*1 layout
    {
      name: '2x1',
      stageActivation: {
        enabled: {
          minViewportsMatched: 2,
        },
      },
      viewportStructure: {
        layoutType: 'grid',
        properties: {
          rows: 1,
          columns: 2,
        },
      },
      viewports: [priorViewport0, currentViewport0],
    },

    {
      name: '2x2',
      stageActivation: {
        enabled: {
          minViewportsMatched: 4,
        },
      },
      viewportStructure: {
        layoutType: 'grid',
        properties: {
          rows: 2,
          columns: 2,
        },
      },
      viewports: [priorViewport0, currentViewport0, priorViewport1, currentViewport1],
    },
  ],
};

export default timepointCompare;
