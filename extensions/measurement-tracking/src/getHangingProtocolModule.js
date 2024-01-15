import timepointComare from './timepointCompare';

function getHangingProtocolModule() {
  return [
    // timepoint compare
    {
      name: timepointComare.id,
      protocol: timepointComare,
    },
  ];
}

export default getHangingProtocolModule;
