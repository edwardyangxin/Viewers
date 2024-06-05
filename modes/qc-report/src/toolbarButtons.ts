// TODO: torn, can either bake this here; or have to create a whole new button type
// Only ways that you can pass in a custom React component for render :l
import { WindowLevelMenuItem } from '@ohif/ui';
import { defaults, ToolbarService } from '@ohif/core';
import type { Button } from '@ohif/core/types';

const { windowLevelPresets } = defaults;
const { createButton } = ToolbarService;

function _createWwwcPreset(preset, title, subtitle) {
  return {
    id: preset.toString(),
    title,
    subtitle,
    commands: [
      {
        commandName: 'setWindowLevel',
        commandOptions: {
          ...windowLevelPresets[preset],
        },
        context: 'CORNERSTONE',
      },
    ],
  };
}

export const setToolActiveToolbar = {
  commandName: 'setToolActiveToolbar',
  commandOptions: {
    toolGroupIds: ['default', 'mpr', 'SRToolGroup', 'volume3d'],
  },
};

const toolbarButtons: Button[] = [
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
  {
    id: 'WindowLevel',
    uiType: 'ohif.splitButton',
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
];

export default toolbarButtons;
