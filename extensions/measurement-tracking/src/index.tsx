import getCommandsModule from './commandsModule';
import getContextModule from './getContextModule';
import getCustomizationModule from './getCustomizationModule';
import getHangingProtocolModule from './getHangingProtocolModule';
import getPanelModule from './getPanelModule';
import getViewportModule from './getViewportModule';
import { id } from './id.js';

const measurementTrackingExtension = {
  /**
   * Only required property. Should be a unique value across all extensions.
   */
  id,

  getContextModule,
  getPanelModule,
  getViewportModule,
  // evibased, hanging protocol
  getHangingProtocolModule,
  // evibased, commands
  getCommandsModule,
  /** Registers some customizations */
  getCustomizationModule,
};

export default measurementTrackingExtension;
