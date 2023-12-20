const targetIndexMapping = {
  1: 1,
  2: 2,
  3: 3,
  4: 4,
  5: 5,
};

const nonTargetIndexMapping = {
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
  11: 11,
  12: 12,
  13: 13,
  14: 14,
  15: 15,
  16: 16,
  17: 17,
  18: 18,
  19: 19,
  20: 20,
};

const targetInfoMapping = {
  Target: '靶病灶',
  Target_NM: '靶病灶(太小无法测量)',
  Target_CR: '靶病灶(消失)',
  Target_UN: '靶病灶(本次扫描未覆盖)',
  Non_Target: '非靶病灶',
  Non_Target_Disappear: '非靶病灶(消失)',
  Non_Target_Progress: '非靶病灶(进展)',
  Non_Target_Possible_New: '非靶病灶(疑似新发)',
  Non_Target_New: '非靶病灶(确认新发)',
  Non_Target_UN: '非靶病灶(本次扫描未覆盖)',
  Other: '其他',
};

const locationInfoMapping = {
  Abdomen_Chest_Wall: 'Abdomen/Chest Wall:腹壁/胸壁',
  Lung: 'Lung:肺',
  Lymph_Node: 'Lymph Node:淋巴结',
  Liver: 'Liver:肝',
  Mediastinum_Hilum: 'Mediastinum/Hilum:纵隔/肺门',
  Adrenal: 'Adrenal:肾上腺',
  Bladder: 'Bladder:膀胱',
  Bone: 'Bone:骨',
  Brain: 'Brain:脑',
  Breast: 'Breast:乳腺',
  Central_Nervous_System: 'Central Nervous System:中枢神经系统',
  Cervix_Uteri_Uterine: 'Cervix Uteri/Uterine:宫颈/子宫',
  Colon_Rectum: 'Colon/Rectum:结肠/直肠',
  Esophagus: 'Esophagus:食管',
  Extremities: 'Extremities:四肢',
  Gallbladder: 'Gallbladder:胆囊',
  Kidney: 'Kidney:肾',
  Muscle: 'Muscle:肌肉',
  Other_Soft_Tissue: 'Other Soft Tissue:其他软组织',
  Ovary: 'Ovary:卵巢',
  Pericardium: 'Pericardium:心包',
  Pelvis: 'Pelvis:骨盆',
  Petritoneum_Omentum: 'Petritoneum/Omentum:腹膜/大网膜',
  Pleura: 'Pleura:胸膜',
  Pancreas: 'Pancreas:胰腺',
  Prostate: 'Prostate:前列腺',
  Retroperitoneum: 'Retroperitoneum:腹膜后',
  Small_Bowel: 'Small Bowel:小肠',
  Spleen: 'Spleen:脾',
  Stomach: 'Stomach:胃',
  Skin_Subcutaneous: 'Skin/Subcutaneous:皮肤/皮下',
  Testicle: 'Testicle:睾丸',
  Thyroid_Gland: 'Thyroid_Gland:甲状腺',
  Other_specify: 'other,specify:其他,请填写',
};

// options
const targetIndexOptions = [];
for (const [key, value] of Object.entries(targetIndexMapping)) {
  targetIndexOptions.push({ value: key, label: value });
}
const nonTargetIndexOptions = [];
for (const [key, value] of Object.entries(nonTargetIndexMapping)) {
  nonTargetIndexOptions.push({ value: key, label: value });
}
const targetOptions = [];
for (const [key, value] of Object.entries(targetInfoMapping)) {
  targetOptions.push({ value: key, label: value });
}
const locationOptions = [];
for (const [key, value] of Object.entries(locationInfoMapping)) {
  locationOptions.push({ value: key, label: value });
}

// 区分target
const targetKeyGroup = ['Target', 'Target_NM', 'Target_CR', 'Target_UN'];
const nontargetKeyGroup = [
  'Non_Target',
  'Non_Target_Disappear',
  'Non_Target_Progress',
  'Non_Target_Possible_New',
  'Non_Target_New',
  'Non_Target_UN',
];
const otherKeyGroup = ['Other'];

const nonTargetResponseMapping = {
  Baseline: '基线评估',
  CR: '完全缓解(CR)',
  NCR_NPD: '非CR/非PD',
  PD: '疾病进展(PD)',
  NE: '不可评估(NE)',
};

const responseMapping = {
  Baseline: '基线评估',
  CR: '完全缓解(CR)',
  PR: '部分缓解(PR)',
  SD: '疾病稳定(SD)',
  NCR_NPD: '非CR/非PD',
  PD: '疾病进展(PD)',
  NE: '不可评估(NE)',
  Data_Unsatisfied: '影响质量问题(不可评估)',
};

// options
const nonTargetResponseOptions = [];
for (const [key, value] of Object.entries(nonTargetResponseMapping)) {
  nonTargetResponseOptions.push({ value: key, label: value });
}

const responseOptions = [];
for (const [key, value] of Object.entries(responseMapping)) {
  responseOptions.push({ value: key, label: value });
}

export {
  targetIndexMapping,
  nonTargetIndexMapping,
  targetInfoMapping,
  locationInfoMapping,
  targetIndexOptions,
  nonTargetIndexOptions,
  targetOptions,
  locationOptions,
  targetKeyGroup,
  nontargetKeyGroup,
  otherKeyGroup,
  nonTargetResponseMapping,
  nonTargetResponseOptions,
  responseOptions,
  responseMapping,
};
