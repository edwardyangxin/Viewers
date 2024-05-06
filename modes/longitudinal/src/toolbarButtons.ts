// TODO: torn, can either bake this here; or have to create a whole new button type
// Only ways that you can pass in a custom React component for render :l
import { WindowLevelMenuItem } from '@ohif/ui';
import { defaults, ToolbarService } from '@ohif/core';
import type { Button } from '@ohif/core/types';

const { windowLevelPresets } = defaults;
const { createButton } = ToolbarService;

export const setToolActiveToolbar = {
  commandName: 'setToolActiveToolbar',
  commandOptions: {
    toolGroupIds: ['default', 'mpr', 'SRToolGroup', 'volume3d'],
  },
};

const toolbarButtons: Button[] = [
  // evibased, commented out, moved to the top level
  // Measurement split button
  // {
  //   id: 'MeasurementTools',
  //   uiType: 'ohif.splitButton',
  //   props: {
  //     groupId: 'MeasurementTools',
  //     // group evaluate to determine which item should move to the top
  //     evaluate: 'evaluate.group.promoteToPrimaryIfCornerstoneToolNotActiveInTheList',
  //     primary: createButton({
  //       id: 'Length',
  //       icon: 'tool-length',
  //       label: 'Length',
  //       tooltip: 'Length Tool',
  //       commands: setToolActiveToolbar,
  //       evaluate: 'evaluate.cornerstoneTool',
  //     }),
  //     secondary: {
  //       icon: 'chevron-down',
  //       tooltip: 'More Measure Tools',
  //     },
  //     items: [
  //       createButton({
  //         id: 'Length',
  //         icon: 'tool-length',
  //         label: 'Length',
  //         tooltip: 'Length Tool',
  //         commands: setToolActiveToolbar,
  //         evaluate: 'evaluate.cornerstoneTool',
  //       }),
  //       createButton({
  //         id: 'Bidirectional',
  //         icon: 'tool-bidirectional',
  //         label: 'Bidirectional',
  //         tooltip: 'Bidirectional Tool',
  //         commands: setToolActiveToolbar,
  //         evaluate: 'evaluate.cornerstoneTool',
  //       }),
  //       createButton({
  //         id: 'ArrowAnnotate',
  //         icon: 'tool-annotate',
  //         label: 'Annotation',
  //         tooltip: 'Arrow Annotate',
  //         commands: setToolActiveToolbar,
  //         evaluate: 'evaluate.cornerstoneTool',
  //       }),
  //       createButton({
  //         id: 'EllipticalROI',
  //         icon: 'tool-ellipse',
  //         label: 'Ellipse',
  //         tooltip: 'Ellipse ROI',
  //         commands: setToolActiveToolbar,
  //         evaluate: 'evaluate.cornerstoneTool',
  //       }),
  //       createButton({
  //         id: 'CircleROI',
  //         icon: 'tool-circle',
  //         label: 'Circle',
  //         tooltip: 'Circle Tool',
  //         commands: setToolActiveToolbar,
  //         evaluate: 'evaluate.cornerstoneTool',
  //       }),
  //     ],
  //   },
  // },
  {
    id: 'Length',
    uiType: 'ohif.radioGroup',
    props: {
      type: 'tool',
      icon: 'tool-length',
      label: '可测量病灶(长径)',
      commands: [
        {
          commandName: 'setToolActive',
          commandOptions: {
            toolName: 'Length',
          },
          context: 'CORNERSTONE',
        },
        {
          commandName: 'setToolActive',
          commandOptions: {
            toolName: 'SRLength',
            toolGroupId: 'SRToolGroup',
          },
          // we can use the setToolActive command for this from Cornerstone commandsModule
          context: 'CORNERSTONE',
        },
      ],
      evaluate: 'evaluate.cornerstoneTool',
    },
  },
  {
    id: 'Bidirectional',
    uiType: 'ohif.radioGroup',
    props: {
      type: 'tool',
      icon: 'tool-bidirectional',
      label: '可测量病灶(双径)',
      commands: [
        {
          commandName: 'setToolActive',
          commandOptions: {
            toolName: 'Bidirectional',
          },
          context: 'CORNERSTONE',
        },
        {
          commandName: 'setToolActive',
          commandOptions: {
            toolName: 'SRBidirectional',
            toolGroupId: 'SRToolGroup',
          },
          context: 'CORNERSTONE',
        },
      ],
      evaluate: 'evaluate.cornerstoneTool',
    },
  },
  {
    id: 'ArrowAnnotate',
    uiType: 'ohif.radioGroup',
    props: {
      type: 'tool',
      icon: 'tool-annotate',
      label: '不可测量病灶(箭头)',
      commands: [
        {
          commandName: 'setToolActive',
          commandOptions: {
            toolName: 'ArrowAnnotate',
          },
          context: 'CORNERSTONE',
        },
        {
          commandName: 'setToolActive',
          commandOptions: {
            toolName: 'SRArrowAnnotate',
            toolGroupId: 'SRToolGroup',
          },
          context: 'CORNERSTONE',
        },
      ],
      evaluate: 'evaluate.cornerstoneTool',
    },
  },
  {
    id: 'Rectangle',
    uiType: 'ohif.radioGroup',
    props: {
      type: 'tool',
      icon: 'tool-rectangle',
      label: '不可测量病灶(方框)',
      commands: [
        {
          commandName: 'setToolActive',
          commandOptions: {
            toolName: 'RectangleROI',
          },
          context: 'CORNERSTONE',
        },
      ],
      evaluate: 'evaluate.cornerstoneTool',
    },
  },
  {
    id: 'Zoom',
    uiType: 'ohif.radioGroup',
    props: {
      icon: 'tool-zoom',
      label: 'Zoom',
      commands: setToolActiveToolbar,
      evaluate: 'evaluate.cornerstoneTool',
    },
  },
  // Window Level
  {
    id: 'WindowLevel',
    uiType: 'ohif.radioGroup',
    props: {
      groupId: 'WindowLevel',
      primary: createButton({
        id: 'WindowLevel',
        icon: 'tool-window-level',
        label: 'Window Level',
        tooltip: 'Window Level',
        commands: setToolActiveToolbar,
        evaluate: 'evaluate.cornerstoneTool',
      }),
      secondary: {
        icon: 'chevron-down',
        label: 'W/L Manual',
        tooltip: 'W/L Presets',
      },
      renderer: WindowLevelMenuItem,
      items: [
        _createWwwcPreset(1, 'Soft tissue(软组织)', '400 / 40'),
        _createWwwcPreset(2, 'Lung(肺)', '1500 / -600'),
        _createWwwcPreset(3, 'Liver(肝脏)', '150 / 90'),
        _createWwwcPreset(4, 'Bone(骨)', '2500 / 480'),
        _createWwwcPreset(5, 'Brain(脑)', '80 / 40'),
        _createWwwcPreset(6, 'Mediastinum(纵隔)', '350 / 50'),
      ],
    },
  },
  // Pan...
  {
    id: 'Pan',
    uiType: 'ohif.radioGroup',
    props: {
      type: 'tool',
      icon: 'tool-move',
      label: 'Pan',
      commands: setToolActiveToolbar,
      evaluate: 'evaluate.cornerstoneTool',
    },
  },
  // {
  //   id: 'TrackballRotate',
  //   uiType: 'ohif.radioGroup',
  //   props: {
  //     type: 'tool',
  //     icon: 'tool-3d-rotate',
  //     label: '3D Rotate',
  //     commands: setToolActiveToolbar,
  //     evaluate: 'evaluate.cornerstoneTool',
  //   },
  // },
  {
    id: 'Capture',
    uiType: 'ohif.radioGroup',
    props: {
      icon: 'tool-capture',
      label: 'Capture',
      commands: 'showDownloadViewportModal',
      evaluate: 'evaluate.action',
    },
  },
  {
    id: 'Layout',
    uiType: 'ohif.layoutSelector',
    props: {
      rows: 3,
      columns: 4,
      evaluate: 'evaluate.action',
      commands: [
        {
          commandName: 'setViewportGridLayout',
        },
      ],
    },
  },
  // evibased, new version of Image Slice Sync for reference
  // createButton({
  //   id: 'ImageSliceSync',
  //   icon: 'link',
  //   label: 'Image Slice Sync',
  //   tooltip: 'Enable position synchronization on stack viewports',
  //   commands: {
  //     commandName: 'toggleSynchronizer',
  //     commandOptions: {
  //       type: 'imageSlice',
  //     },
  //   },
  //   listeners: {
  //     [EVENTS.STACK_VIEWPORT_NEW_STACK]: {
  //       commandName: 'toggleImageSliceSync',
  //       commandOptions: { toggledState: true },
  //     },
  //   },
  //   evaluate: ['evaluate.cornerstone.synchronizer', 'evaluate.not3D'],
  // }),
  // evibased, old version of Image Slice Sync, use it for now
  {
    id: 'StackImageSync',
    uiType: 'ohif.radioGroup',
    props: {
      type: 'toggle',
      icon: 'link',
      label: 'Stack Image Sync',
      commands: [
        {
          commandName: 'toggleIRCImageSync',
          commandOptions: {
            toggledState: true,
          },
          context: 'CORNERSTONE', // command context
        },
      ],
    },
    evaluate: ['evaluate.cornerstone.synchronizer', 'evaluate.not3D'],
  },
  {
    id: 'MPR',
    uiType: 'ohif.radioGroup',
    props: {
      icon: 'icon-mpr',
      label: 'MPR',
      commands: [
        {
          commandName: 'toggleHangingProtocol',
          commandOptions: {
            protocolId: 'mpr',
          },
        },
      ],
      evaluate: 'evaluate.mpr',
    },
  },
  // evibased, TODO: crosshairs not showing up when MRP mode is active
  {
    id: 'Crosshairs',
    uiType: 'ohif.radioGroup',
    props: {
      type: 'tool',
      icon: 'tool-crosshair',
      label: 'Crosshairs',
      commands: {
        commandName: 'setToolActiveToolbar',
        commandOptions: {
          toolGroupIds: ['mpr'],
        },
      },
      evaluate: 'evaluate.cornerstoneTool',
    },
  },
];

export default toolbarButtons;
