import { defaultContextMenu } from './contextMenu';

export default function getCustomizationModule() {
  return [
    {
      name: 'custom-context-menu',
      value: [defaultContextMenu],
    },
  ];
}
