const targetIndexMapping = {
  1: 1,
  2: 2,
  3: 3,
  4: 4,
  5: 5,
  6: 6,
  7: 7,
  8: 8,
  9: 9,
  10: 10,
};

const targetInfoMapping = {
  Target: 'Target',
  Target_CR: 'Target(CR)',
  Target_UN: 'Target(UN未知)',
  Non_Target: 'Non_Target',
  Non_Target_Disappear: 'Non_Target(消失)',
  Non_Target_Progress: 'Non_Target(发展Progress)',
  Non_Target_New: 'Non_Target(新发New)',
  Other: 'Other',
};

const locationInfoMapping = {
  Abdomen_Chest_Wall: 'Abdomen/Chest Wall',
  Lung: 'Lung',
  Lymph_Node: 'Lymph Node',
  Liver: 'Liver',
  Mediastinum_Hilum: 'Mediastinum/Hilum',
  Pelvis: 'Pelvis',
  Petritoneum_Omentum: 'Petritoneum/Omentum',
  Retroperitoneum: 'Retroperitoneum',
  Adrenal: 'Adrenal',
  Bladder: 'Bladder',
  Bone: 'Bone',
  Braine: 'Braine',
  Breast: 'Breast',
  Colon: 'Colon',
  Esophagus: 'Esophagus',
  Extremities: 'Extremities',
  Gallbladder: 'Gallbladder',
  Kidney: 'Kidney',
  Muscle: 'Muscle',
  Neck: 'Neck',
  Other_Soft_Tissue: 'Other Soft Tissue',
  Ovary: 'Ovary',
  Pancreas: 'Pancreas',
  Prostate: 'Prostate',
  Small_Bowel: 'Small Bowel',
  Spleen: 'Spleen',
  Stomach: 'Stomach',
  Subcutaneous: 'Subcutaneous',
};

// 区分target
const targetKeyGroup = ['Target', 'Target_CR', 'Target_UN'];
const nontargetKeyGroup = ['Non_Target', 'Non_Target_Disappear', 'Non_Target_Progress', 'Non_Target_New'];
const otherKeyGroup = ['Other'];

const responseOptions = [ 
  { value: 'Baseline', label: 'Baseline(No Response)' },
  { value: 'CR', label: 'CR' },
  { value: 'PR', label: 'PR' },
  { value: 'SD', label: 'SD' },
  { value: 'PD', label: 'PD' },
];

export { targetIndexMapping, targetInfoMapping, locationInfoMapping, 
  targetKeyGroup, nontargetKeyGroup, otherKeyGroup, responseOptions };
