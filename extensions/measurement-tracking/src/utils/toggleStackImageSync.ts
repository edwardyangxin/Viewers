const STACK_SYNC_NAME = 'IRCImageSync';

// evibased, based on cornerstone extension
export default function toggleIRCImageSync({
  toggledState,
  servicesManager,
  viewports: providedViewports,
}) {
  // evibased, toggledState deprecated
  // if (!toggledState) {
  //   return disableSync(STACK_SYNC_NAME, servicesManager);
  // }
  const { syncGroupService, viewportGridService, displaySetService, cornerstoneViewportService } =
    servicesManager.services;

  // evibased, get existing synchronizer. if exists, disable it 
  if (syncGroupService.getSynchronizer(STACK_SYNC_NAME)) {
    return disableSync(STACK_SYNC_NAME, servicesManager);
  }

  // sync all viewports for now
  const { viewports } = viewportGridService.getState();

  // create synchronization group and add the viewports to it.
  viewports.forEach(gridViewport => {
    const { viewportId } = gridViewport.viewportOptions;
    const viewport = cornerstoneViewportService.getCornerstoneViewport(viewportId);
    if (!viewport) {
      return;
    }
    syncGroupService.addViewportToSyncGroup(viewportId, viewport.getRenderingEngine().id, {
      type: 'stackimage',
      id: STACK_SYNC_NAME,
      source: true,
      target: true,
    });
  });
}

function disableSync(syncName, servicesManager) {
  const { syncGroupService, viewportGridService, displaySetService, cornerstoneViewportService } =
    servicesManager.services;
  const { viewports } = viewportGridService.getState();
  viewports.forEach(gridViewport => {
    const { viewportId } = gridViewport.viewportOptions;
    const viewport = cornerstoneViewportService.getCornerstoneViewport(viewportId);
    if (!viewport) {
      return;
    }
    syncGroupService.removeViewportFromSyncGroup(
      viewport.id,
      viewport.getRenderingEngine().id,
      syncName
    );
  });
}
