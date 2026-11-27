// src/utils/treeLabels.js
// Relationship text shown on family tree cards.

import { translations } from '../translations/index.js';

export const RELATIONSHIP_KEYS = {
  spouse: 'rel_spouse', husband: 'rel_husband', wife: 'rel_wife',
  'श्रीमान': 'rel_husband', 'श्रीमान्': 'rel_husband', 'श्रीमती': 'rel_wife',
  father: 'rel_father', mother: 'rel_mother',
  'बुवा': 'rel_father', 'बाबा': 'rel_father', 'आमा': 'rel_mother',
  son: 'rel_son', daughter: 'rel_daughter',
  'छोरा': 'rel_son', 'जेठो छोरा': 'rel_eldest_son', 'छोरी': 'rel_daughter', 'जेठी छोरी': 'rel_eldest_daughter',
  grandfather: 'rel_grandfather', grandmother: 'rel_grandmother',
  'हजुरबा': 'rel_grandfather', 'जेठो हजुरबा': 'rel_elder_grandfather', 'हजुरआमा': 'rel_grandmother',
  grandson: 'rel_grandson', granddaughter: 'rel_granddaughter',
  'नाति': 'rel_grandson', 'नातिनी': 'rel_granddaughter',
  'पनाति': 'rel_great_grandson', 'पनातिनी': 'rel_great_granddaughter',
  brother: 'rel_brother', sister: 'rel_sister',
  elderBrother: 'rel_elder_brother', youngerBrother: 'rel_younger_brother',
  elderSister: 'rel_elder_sister', youngerSister: 'rel_younger_sister',
  'दाजु': 'rel_elder_brother', 'भाइ': 'rel_younger_brother',
  'दिदी': 'rel_elder_sister', 'बहिनी': 'rel_younger_sister',
  'पुर्खा': 'rel_ancestor',
  'ज्वाइँ': 'rel_son_in_law', 'बुहारी': 'rel_daughter_in_law',
  'काका': 'rel_paternal_uncle', 'काकी': 'rel_paternal_aunt',
  'मामा': 'rel_maternal_uncle', 'माइजू': 'rel_maternal_aunt',
  'फुपू': 'rel_father_sister', 'फुपाजु': 'rel_father_sister_husband',
  member: 'rel_member', lineage_member: 'rel_lineage_member',
  'सदस्य': 'rel_member',
  lineage_head: 'rel_lineage_head', family_head: 'rel_family_head',
  child: 'rel_child', parent: 'rel_parent', sibling: 'rel_sibling',
  grandparent: 'rel_grandparent', grandchild: 'rel_grandchild', other: 'rel_other',
};

const DEFAULT_RELATIONSHIPS = ['सदस्य', 'member', 'lineage_member'];
const fallbackTranslator = (key) => translations.ne[key] || key;

export const getSpouseLabel = (person, t = fallbackTranslator) => {
  if (person?.gender === 'male') return t('rel_husband');
  if (person?.gender === 'female') return t('rel_wife');
  return t('rel_partner');
};

export const getRelationLabel = (person, t = fallbackTranslator) => {
  if (!person) return t('rel_member');
  if (person.lineageRole === 'lineage_head') return t('rel_lineage_head');

  const relationship = (person.relationship || '').trim();
  if (relationship && !DEFAULT_RELATIONSHIPS.includes(relationship)) {
    const key = RELATIONSHIP_KEYS[relationship];
    return key ? t(key) : relationship;
  }

  return person.isSpouseCard ? getSpouseLabel(person, t) : t('rel_member');
};

// Any of the other dates (death, citizenship, passport ...) as it was typed in BS.
// Records saved before the BS text was kept hold those same BS digits in the date itself.
export const getBsDateLabel = (record, field) => {
  if (!record) return '';
  if (record[`${field}Nepali`]) return record[`${field}Nepali`];
  const value = record[field];
  if (!value) return '';
  return typeof value === 'string' ? value.slice(0, 10) : new Date(value).toISOString().slice(0, 10);
};

// Date of birth as entered (BS) when the record has it.
export const getBirthDateLabel = (person) => {
  if (person?.dobNepali) return person.dobNepali;
  if (!person?.dob) return '';
  const date = new Date(person.dob);
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleDateString('ne-NP');
};
