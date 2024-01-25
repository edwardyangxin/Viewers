const TaskMapping = {
  reading: '阅片',
  arbitration: '仲裁',
  QC: '质控',
};

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

const LesionMapping = {
  Target: '靶病灶',
  Target_NM: '靶病灶(太小无法测量)',
  Target_CR: '靶病灶(消失)',
  Target_UN: '靶病灶(本次扫描未覆盖)',
  Target_NE: '靶病灶(不可评估)',
  Non_Target: '非靶病灶',
  Non_Target_Disappear: '非靶病灶(消失)',
  Non_Target_Nodal_NP: '非靶病灶(淋巴结<10mm)',
  Non_Target_Progress: '非靶病灶(进展)',
  Non_Target_UN: '非靶病灶(本次扫描未覆盖)',
  Non_Target_NE: '非靶病灶(不可评估)',
  New_Lesion_Possible: '新发病灶(疑似)',
  New_Lesion: '新发病灶(确认)',
  New_Lesion_Disappear: '新发病灶(消失)',
  New_Lesion_UN: '新病灶(本次扫描未覆盖)',
  New_Lesion_NE: '新病灶(不可评估)',
  Other: '其他',
};

const organMapping = {
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

const organLateralMapping = {
  NA: '不可选',
  Left: '左',
  Right: '右',
  Both: '双侧',
};

const organLocationMapping = {
  Lung: {
    Upper_Lobe: 'Upper Lobe:上叶',
    Middle_Lobe: 'Middle Lobe:中叶',
    Lower_Lobe: 'Lower Lobe:下叶',
  },
  Lymph_Node: {
    Axillary_Lymph_Node: 'Axillary:腋窝淋巴结',
    Posterior_Pharyngeal_Lymph_Node: 'Posterior pharyngeal:咽后淋巴结',
    Neck_Lymph_Node: 'Neck:颈部淋巴结',
    Supraclavicular_Lymph_Node: 'Supraclavicular:锁骨上淋巴结',
    Subclavicular_Lymph_Node: 'Subclavicular:锁骨下淋巴结',
    Hilar_Lymph_Node: 'Hilar (pulmonary hilum):肺门淋巴结',
    Mediastinal_Lymph_Node: 'Mediastinal:纵膈淋巴结',
    Iliac_Lymph_Node: 'Iliac:髂骨淋巴结',
    Para_Aortic_Lymph_Node: 'Para-aortic:主动脉旁淋巴结',
    Para_Aortic_Pulmonary_Artery_Window_Lymph_Node:
      'Para-aortic pulmonary artery window:主动脉肺动脉窗淋巴结',
    Diaphragmatic_Lymph_Node: 'Diaphragmatic (behind the diaphragm):膈脚后淋巴结',
    Posterior_Peritoneal_Lymph_Node: 'Posterior peritoneal:腹膜后淋巴结',
    Subcostal_Lymph_Node: 'Subcostal:隆突下淋巴结',
    Paracaval_Lymph_Node: 'Paracaval:腔静脉旁淋巴结',
    Paraaortic_Lymph_Node: 'Paraaortic:门静脉旁淋巴结',
    Pelvic_Lymph_Node: 'Pelvic:盆腔淋巴结',
    Inguinal_Lymph_Node: 'Inguinal:腹股沟淋巴结',
    Pericardial_Lymph_Node: 'Pericardial:心包淋巴结',
    Abdominal_Aorta_Lymph_Node: 'Abdominal aorta:腹腔干淋巴结',
    Peripancreatic_Lymph_Node: 'Peripancreatic:胰周淋巴结',
    Hepatic_Hilar_Lymph_Node: 'Hepatic hilar:肝门淋巴结',
    Abdominal_Lymph_Node: 'Abdominal:腹腔淋巴结',
    Cervical_Lymph_Node: 'Cervical:颈部淋巴结',
    Mesenteric_Lymph_Node: 'Mesenteric:肠系膜淋巴结',
    Para_Tracheal_Lymph_Node: 'Para-tracheal:气管旁淋巴结',
    Para_Bronchial_Lymph_Node: 'Para-bronchial:支气管旁淋巴结',
    Parotid_Lymph_Node: 'Parotid:腮腺淋巴结',
  },
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
const lesionOptions = [];
for (const [key, value] of Object.entries(LesionMapping)) {
  lesionOptions.push({ value: key, label: value });
}
const organOptions = [];
for (const [key, value] of Object.entries(organMapping)) {
  organOptions.push({ value: key, label: value });
}
const organLateralOptions = [];
for (const [key, value] of Object.entries(organLateralMapping)) {
  organLateralOptions.push({ value: key, label: value });
}
const organLocationOptions = {};
for (const [organKey, organValue] of Object.entries(organLocationMapping)) {
  organLocationOptions[organKey] = [];
  for (const [key, value] of Object.entries(organValue)) {
    organLocationOptions[organKey].push({ value: key, label: value });
  }
}

// 区分target
const targetKeyGroup = ['Target', 'Target_NM', 'Target_CR', 'Target_UN', 'Target_NE'];
const nonTargetKeyGroup = [
  'Non_Target',
  'Non_Target_Disappear',
  'Non_Target_Nodal_NP',
  'Non_Target_Progress',
  'Non_Target_UN',
  'Non_Target_NE',
  'New_Lesion_Possible',
  'New_Lesion',
  'New_Lesion_Disappear',
  'New_Lesion_UN',
  'New_Lesion_NE',
];
const newLesionKeyGroup = [
  'New_Lesion_Possible',
  'New_Lesion',
  'New_Lesion_Disappear',
  'New_Lesion_UN',
  'New_Lesion_NE',
];
const otherKeyGroup = ['Other'];

const targetResponseMapping = {
  Baseline: '基线评估',
  ND: '无疾病(ND)',
  CR: '完全缓解(CR)',
  PR: '部分缓解(PR)',
  SD: '疾病稳定(SD)',
  PD: '疾病进展(PD)',
  NE: '不可评估(NE)',
};

const nonTargetResponseMapping = {
  Baseline: '基线评估',
  ND: '无疾病(ND)',
  CR: '完全缓解(CR)',
  NCR_NPD: '非CR/非PD',
  PD: '疾病进展(PD)',
  NE: '不可评估(NE)',
};

const responseMapping = {
  Baseline: '基线评估',
  ND: '无疾病(ND)',
  CR: '完全缓解(CR)',
  PR: '部分缓解(PR)',
  SD: '疾病稳定(SD)',
  NCR_NPD: '非CR/非PD',
  PD: '疾病进展(PD)',
  NE: '不可评估(NE)',
  Data_Unsatisfied: '影像质量问题(不可评估)',
};

// options
const targetResponseOptions = [];
for (const [key, value] of Object.entries(targetResponseMapping)) {
  targetResponseOptions.push({ value: key, label: value });
}

const nonTargetResponseOptions = [];
for (const [key, value] of Object.entries(nonTargetResponseMapping)) {
  nonTargetResponseOptions.push({ value: key, label: value });
}

const responseOptions = [];
for (const [key, value] of Object.entries(responseMapping)) {
  responseOptions.push({ value: key, label: value });
}

export {
  TaskMapping,
  targetIndexMapping,
  nonTargetIndexMapping,
  LesionMapping,
  organMapping,
  organLateralMapping,
  organLocationMapping,
  targetIndexOptions,
  nonTargetIndexOptions,
  lesionOptions,
  organOptions,
  organLateralOptions,
  organLocationOptions,
  targetKeyGroup,
  nonTargetKeyGroup,
  newLesionKeyGroup,
  otherKeyGroup,
  targetResponseMapping,
  targetResponseOptions,
  nonTargetResponseMapping,
  nonTargetResponseOptions,
  responseOptions,
  responseMapping,
};
