import getContextModule from './getContextModule';
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
  // hangingProtocolModule
  getHangingProtocolModule,
};

export default measurementTrackingExtension;
