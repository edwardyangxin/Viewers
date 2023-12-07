function getViewportId(viewports, viewportName = 'default') {
  let targetViewportId = null;
  for (const viewport of viewports.values()) {
    const { viewportId, displaySetOptions } = viewport;
    // get id from displaySetOptions[0]
    const idLabel = displaySetOptions[0]['id'];
    if (idLabel === viewportName) {
      targetViewportId = viewportId;
      break;
    }
  }
  return targetViewportId;
}

export { getViewportId };
