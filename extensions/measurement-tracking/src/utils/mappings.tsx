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
  Target: '靶病灶',
  Target_NM: '靶病灶(太小无法测量)',
  Target_CR: '靶病灶(消失)',
  Target_UN: '靶病灶(UN未知)',
  Non_Target: '非靶病灶',
  Non_Target_Disappear: '非靶病灶(消失)',
  Non_Target_Progress: '非靶病灶(进展)',
  Non_Target_New: '非靶病灶(新发)',
  Other: '其他',
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
const targetKeyGroup = ['Target', 'Target_NM', 'Target_CR', 'Target_UN'];
const nontargetKeyGroup = ['Non_Target', 'Non_Target_Disappear', 'Non_Target_Progress', 'Non_Target_New'];
const otherKeyGroup = ['Other'];

const responseOptions = [
  { value: 'Baseline', label: '基线评估' },
  { value: 'CR', label: '完全缓解(CR)' },
  { value: 'PR', label: '部分缓解(PR)' },
  { value: 'SD', label: '疾病稳定(SD)' },
  { value: 'PD', label: '疾病进展(PD)' },
  { value: 'NCR_NPD', label: '非CR/非PD' },
  { value: 'NE', label: '不可评估(NE)' },
];

export { targetIndexMapping, targetInfoMapping, locationInfoMapping, 
  targetKeyGroup, nontargetKeyGroup, otherKeyGroup, responseOptions };
