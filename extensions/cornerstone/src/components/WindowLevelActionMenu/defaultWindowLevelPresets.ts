// The following are the default window level presets and can be further
// configured via the customization service.
// evibased, modified default WindowLevel Presets
const defaultWindowLevelPresets = {
  MR: [
    { description: 'Soft tissue(软组织)', window: '400', level: '40' },
    { description: 'Lung(肺)', window: '1500', level: '-600' },
    { description: 'Liver(肝脏)', window: '150', level: '90' },
    { description: 'Bone(骨)', window: '2500', level: '480' },
    { description: 'Brain(脑)', window: '80', level: '40' },
    { description: 'Mediastinum(纵隔)', window: '350', level: '50' },
  ],

  CT: [
    { description: 'Soft tissue(软组织)', window: '400', level: '40' },
    { description: 'Lung(肺)', window: '1500', level: '-600' },
    { description: 'Liver(肝脏)', window: '150', level: '90' },
    { description: 'Bone(骨)', window: '2500', level: '480' },
    { description: 'Brain(脑)', window: '80', level: '40' },
    { description: 'Mediastinum(纵隔)', window: '350', level: '50' },
  ],

  PT: [
    { description: 'Default', window: '5', level: '2.5' },
    { description: 'SUV', window: '0', level: '3' },
    { description: 'SUV', window: '0', level: '5' },
    { description: 'SUV', window: '0', level: '7' },
    { description: 'SUV', window: '0', level: '8' },
    { description: 'SUV', window: '0', level: '10' },
    { description: 'SUV', window: '0', level: '15' },
  ],
};

export default defaultWindowLevelPresets;
