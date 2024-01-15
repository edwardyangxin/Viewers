import i18n from '@ohif/i18n';

const defaultContextMenu = {
  id: 'measurementsContextMenu',
  customizationType: 'ohif.contextMenu',
  menus: [
    // Get the items from the UI Customization for the menu name (and have a custom name)
    {
      id: 'forExistingMeasurement',
      selector: ({ nearbyToolData }) => !!nearbyToolData,
      items: [
        {
          label: i18n.t('ContextMenu:Delete measurement'),
          commands: [
            {
              commandName: 'deleteMeasurement',
            },
          ],
        },
        {
          label: i18n.t('ContextMenu:Add Label'),
          commands: [
            {
              commandName: 'setIRCMeasurementLabel',
            },
          ],
        },
      ],
    },
  ],
};

export default defaultContextMenu;
