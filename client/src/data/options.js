// src/data/options.js - UPDATED

export const jobTitles = [
  { value: 'Farmer', labelKey: 'opt_farmer', icon: '👨‍🌾' },
  { value: 'Computer Operator', labelKey: 'opt_computer_operator', icon: '💻' },
  { value: 'Teacher', labelKey: 'opt_teacher', icon: '👨‍🏫' },
  { value: 'Engineer', labelKey: 'opt_engineer', icon: '👨‍🔧' },
  { value: 'Doctor', labelKey: 'opt_doctor', icon: '👨‍⚕️' },
  { value: 'Business', labelKey: 'opt_business', icon: '💼' },
  { value: 'Government Employee', labelKey: 'opt_government_employee', icon: '🏛️' },
  { value: 'Army', labelKey: 'opt_army', icon: '🪖' },
  { value: 'Police', labelKey: 'opt_police', icon: '👮' },
  { value: 'Student', labelKey: 'opt_student', icon: '🎓' },
  { value: 'Driver', labelKey: 'opt_driver', icon: '🚗' },
  { value: 'Labour', labelKey: 'opt_labour', icon: '🔨' },
  { value: 'Electrician', labelKey: 'opt_electrician', icon: '⚡' },
  { value: 'Plumber', labelKey: 'opt_plumber', icon: '🔧' },
  { value: 'Software Developer', labelKey: 'opt_software_developer', icon: '💻' },
  { value: 'Designer', labelKey: 'opt_designer', icon: '🎨' },
  { value: 'Nurse', labelKey: 'opt_nurse', icon: '👩‍⚕️' },
  { value: 'Housewife', labelKey: 'opt_housewife', icon: '🏠' },
  { value: 'Retired', labelKey: 'opt_retired', icon: '🛋️' },
];

export const educationLevels = [
  { value: 'SEE', labelKey: 'opt_see_slc' },
  { value: 'SLC', labelKey: 'opt_slc' },
  { value: '+2', labelKey: 'opt_intermediate' },
  { value: 'Diploma', labelKey: 'opt_diploma' },
  { value: 'BIT', labelKey: 'opt_bit' },
  { value: 'BCA', labelKey: 'opt_bca' },
  { value: 'BBS', labelKey: 'opt_bbs' },
  { value: 'BSc', labelKey: 'opt_bsc' },
  { value: 'BA', labelKey: 'opt_ba' },
  { value: 'BEd', labelKey: 'opt_bed' },
  { value: 'BBA', labelKey: 'opt_bba' },
  { value: 'MIT', labelKey: 'opt_mit' },
  { value: 'MCA', labelKey: 'opt_mca' },
  { value: 'Masters', labelKey: 'opt_masters' },
  { value: 'PhD', labelKey: 'opt_phd' },
];

export const bloodGroups = [
  { value: 'A+', labelKey: 'a_positive' },
  { value: 'A-', labelKey: 'a_negative' },
  { value: 'B+', labelKey: 'b_positive' },
  { value: 'B-', labelKey: 'b_negative' },
  { value: 'AB+', labelKey: 'ab_positive' },
  { value: 'AB-', labelKey: 'ab_negative' },
  { value: 'O+', labelKey: 'o_positive' },
  { value: 'O-', labelKey: 'o_negative' },
  { value: 'unknown', labelKey: 'opt_blood_unknown' },
];

export const maritalStatuses = [
  { value: 'single', labelKey: 'opt_single' },
  { value: 'married', labelKey: 'opt_married' },
  { value: 'divorced', labelKey: 'opt_divorced' },
  { value: 'widowed', labelKey: 'opt_widowed' },
  { value: 'other', labelKey: 'opt_other' },
];

// ⭐ UPDATED: Nepali relationships only
export const relationships = [
  { value: 'पुर्खा', labelKey: 'rel_ancestor' },
  { value: 'जेठो हजुरबा', labelKey: 'rel_elder_grandfather' },
  { value: 'हजुरबा', labelKey: 'rel_grandfather' },
  { value: 'हजुरआमा', labelKey: 'rel_grandmother' },
  { value: 'बुवा', labelKey: 'rel_father' },
  { value: 'आमा', labelKey: 'rel_mother' },
  { value: 'दाजु', labelKey: 'rel_elder_brother' },
  { value: 'भाइ', labelKey: 'rel_younger_brother' },
  { value: 'दिदी', labelKey: 'rel_elder_sister' },
  { value: 'बहिनी', labelKey: 'rel_younger_sister' },
  { value: 'जेठो छोरा', labelKey: 'rel_eldest_son' },
  { value: 'छोरा', labelKey: 'rel_son' },
  { value: 'छोरी', labelKey: 'rel_daughter' },
  { value: 'जेठी छोरी', labelKey: 'rel_eldest_daughter' },
  { value: 'नाति', labelKey: 'rel_grandson' },
  { value: 'नातिनी', labelKey: 'rel_granddaughter' },
  { value: 'पनाति', labelKey: 'rel_great_grandson' },
  { value: 'पनातिनी', labelKey: 'rel_great_granddaughter' },
  { value: 'श्रीमान्', labelKey: 'rel_husband' },
  { value: 'श्रीमती', labelKey: 'rel_wife' },
  { value: 'ज्वाइँ', labelKey: 'rel_son_in_law' },
  { value: 'बुहारी', labelKey: 'rel_daughter_in_law' },
  { value: 'काका', labelKey: 'rel_paternal_uncle' },
  { value: 'काकी', labelKey: 'rel_paternal_aunt' },
  { value: 'मामा', labelKey: 'rel_maternal_uncle' },
  { value: 'माइजू', labelKey: 'rel_maternal_aunt' },
  { value: 'फुपू', labelKey: 'rel_father_sister' },
  { value: 'फुपाजु', labelKey: 'rel_father_sister_husband' },
];

// src/data/options.js - ADD THIS
export const gotraOptions = [
  { value: 'माण्डप', labelKey: 'gotra_mandapa' },
  { value: 'कश्यप', labelKey: 'gotra_kashyap' },
  { value: 'भारद्वाज', labelKey: 'gotra_bharadwaj' },
  { value: 'वशिष्ठ', labelKey: 'gotra_vashistha' },
  { value: 'गौतम', labelKey: 'gotra_gautam' },
  { value: 'अत्रि', labelKey: 'gotra_atri' },
  { value: 'विश्वामित्र', labelKey: 'gotra_vishwamitra' },
  { value: 'जमदग्नि', labelKey: 'gotra_jamadagni' },
];
