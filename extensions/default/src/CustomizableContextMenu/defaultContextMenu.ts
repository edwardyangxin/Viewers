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
              // we only have support for cornerstoneTools context menu since
              // they are svg based
              context: 'CORNERSTONE',
            },
          ],
        },
        {
          label: i18n.t('ContextMenu:Add Label'),
          commands: [
            {
              commandName: 'setMeasurementLabel',
            },
          ],
        },
      ],
    },
  ],
};

export default defaultContextMenu;
