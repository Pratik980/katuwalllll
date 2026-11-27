import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createMember, updateMember, getMemberOptions } from '../api/members';
import { getFamilies } from '../api/families';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';

// Components
import FloatingInput from '../components/FloatingInput';
import SearchableSelect from '../components/SearchableSelect';
import LocationSelect from '../components/LocationSelect';
import ImageUpload from '../components/ImageUpload';
import NepaliDatePickerComponent from '../components/NepaliDatePickerComponent';
import Button from '../components/Button';
import VanshNoAutocomplete from '../components/VanshNoAutocomplete';
import { getBsDateLabel } from '../utils/treeLabels';
import { useLanguage } from '../context/LanguageContext';

// Data
import { jobTitles, educationLevels, bloodGroups, maritalStatuses, relationships } from '../data/options';

// Icons
import {
  AcademicCapIcon as FaGraduationCap,
  BriefcaseIcon as FaBriefcase,
  BuildingOfficeIcon as FaBuilding,
  CalendarIcon as FaCalendar,
  CameraIcon as FaCamera,
  CheckIcon as FaSave,
  ChevronLeftIcon as FaChevronLeft,
  ChevronRightIcon as FaChevronRight,
  DocumentDuplicateIcon as FaClone,
  DocumentIcon as FaFile,
  EnvelopeIcon as FaEnvelope,
  GlobeAltIcon as FaPassport,
  HeartIcon as FaHeart,
  HomeIcon as FaHome,
  IdentificationIcon as FaAddressCard,
  IdentificationIcon as FaIdCard,
  InformationCircleIcon as FaInfoCircle,
  MapPinIcon as FaMapPin,
  NoSymbolIcon as FaUserSlash,
  PhoneIcon as FaPhone,
  PrinterIcon as FaPrint,
  QuestionMarkCircleIcon as FaQuestionCircle,
  TrashIcon as FaTrash,
  TruckIcon as FaCar,
  UserGroupIcon as FaTree,
  UserGroupIcon as FaUsers,
  UserIcon as FaChild,
  UserIcon as FaFemale,
  UserIcon as FaMale,
  UserIcon as FaUser,
  XMarkIcon as FaTimes,
} from '@heroicons/react/24/outline';

const PHOTO_FIELDS = [
  'photo', 'citizenshipFront', 'citizenshipBack',
  'nationalIdFront', 'passportPhoto', 'drivingLicensePhoto',
];

// Dates other than the date of birth. All are typed in BS.
const BS_DATE_FIELDS = [
  'dod', 'wifeDob', 'husbandDob', 'citizenshipIssueDate', 'nationalIdIssueDate',
  'passportIssueDate', 'passportExpiryDate', 'drivingLicenseIssueDate', 'drivingLicenseExpiryDate',
];

// Fields that always keep a value: emptying them on an edit changes nothing
const NEVER_CLEARED = [
  'name', 'gender', 'dob', 'district', 'country', 'family', 'familyNumber', 'generation', 'generationMode',
  'personStatus', 'isAlive', 'maritalStatus', 'lineageRole', 'bloodGroup', 'sons', 'daughters',
];

const DRAFT_KEY = '__katuwalMemberDraft__';

const DataEntry = ({ member, onSuccess, onCancel }) => {
  const { t } = useLanguage();
  const translatedOptions = useMemo(() => {
    const translate = (options) => options.map((option) => ({
      ...option,
      label: `${option.icon ? `${option.icon} ` : ''}${t(option.labelKey)}`,
    }));
    return {
      jobTitles: translate(jobTitles),
      educationLevels: translate(educationLevels),
      bloodGroups: translate(bloodGroups),
      maritalStatuses: translate(maritalStatuses),
      relationships: translate(relationships),
    };
  }, [t]);
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('personal');
  const [loading, setLoading] = useState(false);
  const [validationErrors, setValidationErrors] = useState({});

  const tabOrder = ['personal', 'contact', 'family', 'identification', 'passport', 'documents', 'additional'];
  const currentTabIndex = tabOrder.indexOf(activeTab);
  const isLastTab = currentTabIndex === tabOrder.length - 1;
  const isFirstTab = currentTabIndex === 0;

  const initialFormData = {
    name: '',
    surname: '',
    gender: 'male',
    dob: '',
    district: '',
    country: 'Nepal',

    placeOfBirth: '',
    bloodGroup: 'unknown',
    isAlive: true,
    dod: '',
    occupation: '',
    education: '',
    religion: '',
    casteEthnicity: '',
    nationality: 'Nepali',
    spouse: '',
    wifeName: '',
    wifeDob: '',
    husbandName: '',
    husbandDob: '',
    personStatus: 'known',
    unknownNameNote: '',
    phone: '',
    alternatePhone: '',
    email: '',
    wardNumber: '',
    toleVillage: '',
    municipality: '',
    province: '',
    currentAddress: '',
    permanentAddress: '',
    postalCode: '',
    family: '',
    familyNumber: '',
    vanshaGenerationNumber: '',
    generation: 1,
    generationMode: 'auto',
    relationship: '',
    father: '',
    mother: '',
    grandfather: '',
    grandmother: '',
    guardian: '',
    childBirthOrder: '',
    lineageRole: 'lineage_member',
    familyContact: '',
    maritalStatus: 'single',
    sons: [],
    daughters: [],
    citizenshipNumber: '',
    citizenshipIssueDate: '',
    citizenshipIssueDistrict: '',
    nationalIdNumber: '',
    nationalIdIssueDate: '',
    passportNumber: '',
    passportIssueDate: '',
    passportExpiryDate: '',
    drivingLicenseNumber: '',
    drivingLicenseCategory: '',
    drivingLicenseIssueDate: '',
    drivingLicenseExpiryDate: '',
    birthCertificate: '',
    marriageCertificate: '',
    deathCertificate: '',
    panCard: '',
    voterId: '',
    biography: '',
    notes: '',
    specialRemarks: '',
    medicalNotes: '',
    disabilityInfo: '',
  };

  const [formData, setFormData] = useState(initialFormData);
  const [photos, setPhotos] = useState({
    photo: null, photoPreview: '',
    citizenshipFront: null, citizenshipFrontPreview: '',
    citizenshipBack: null, citizenshipBackPreview: '',
    nationalIdFront: null, nationalIdFrontPreview: '',
    passportPhoto: null, passportPhotoPreview: '',
    drivingLicensePhoto: null, drivingLicensePhotoPreview: '',
  });

  const [documents, setDocuments] = useState({
    birthCertificate: null, marriageCertificate: null,
    deathCertificate: null, panCard: null, voterId: null,
  });


  const { data: familiesData, isLoading: familiesLoading } = useQuery({
    queryKey: ['families'],
    queryFn: () => getFamilies({ limit: 1000 }),
    staleTime: 5 * 60 * 1000,
  });


  const { data: membersData } = useQuery({
    queryKey: ['members-dropdown'],
    queryFn: getMemberOptions,
    staleTime: 5 * 60 * 1000,
  });

  const refreshMemberData = () => {
    [
      'members', 'members-dropdown', 'members-tree', 'members-for-families',
      'familyTree', 'member', 'families', 'dashboardStats', 'family-bansha',
    ].forEach((key) => queryClient.invalidateQueries({ queryKey: [key] }));
  };

  const createMutation = useMutation({
    mutationFn: createMember,
    onSuccess: (created) => {
      toast.success(t('de_member_created'));
      refreshMemberData();
      resetForm();
      if (onSuccess) {
        onSuccess(created);
      } else if (!member) {
        const identifier = created?.memberNumber || created?.name || '';
        navigate(`/members${identifier ? `?search=${encodeURIComponent(identifier)}` : ''}`);
      }
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => updateMember(id, data),
    onSuccess: () => {
      toast.success(t('de_member_updated'));
      refreshMemberData();
      onSuccess?.();
    },
  });

  const saveDraft = () => {
    const files = {};
    PHOTO_FIELDS.forEach((field) => {
      if (photos[field] instanceof File) files[field] = photos[field];
    });
    Object.entries(documents).forEach(([field, file]) => {
      if (file instanceof File) files[field] = file;
    });
    window[DRAFT_KEY] = { formData: { ...formData }, files };
    toast.success(t('de_draft_saved'));
  };


  const loadDraft = () => {
    const draft = window[DRAFT_KEY];
    if (!draft) {
      toast.error(t('de_no_draft_found'));
      return;
    }
    setFormData({ ...initialFormData, ...draft.formData });

    const files = draft.files || {};
    setPhotos((prev) => {
      const next = { ...prev };
      PHOTO_FIELDS.forEach((field) => {
        next[field] = files[field] || null;
        next[`${field}Preview`] = files[field] ? URL.createObjectURL(files[field]) : '';
      });
      return next;
    });
    setDocuments((prev) => {
      const next = { ...prev };
      Object.keys(next).forEach((field) => {
        next[field] = files[field] || null;
      });
      return next;
    });

    toast.success(t('de_draft_loaded'));
  };

  useEffect(() => {
    if (member) {
      const populatedData = { ...initialFormData };
      const fieldsToPopulate = { ...member };

      if (member.family && typeof member.family === 'object') {
        fieldsToPopulate.family = member.family._id || '';
        fieldsToPopulate.familyNumber = member.family.familyNumber || '';
        fieldsToPopulate.vanshaGenerationNumber = member.vanshaGenerationNumber || '';
      }

      const relationFields = ['father', 'mother', 'grandfather', 'grandmother', 'spouse', 'guardian'];
      relationFields.forEach(field => {
        if (member[field] && typeof member[field] === 'object') {
          fieldsToPopulate[field] = member[field]._id || '';
        }
      });

      // The date picker works in BS: show the date exactly as it was entered
      if (member.dobNepali) {
        fieldsToPopulate.dob = member.dobNepali;
      }
      BS_DATE_FIELDS.forEach(field => {
        if (member[field]) fieldsToPopulate[field] = getBsDateLabel(member, field);
      });

      if (member.sons && Array.isArray(member.sons)) {
        fieldsToPopulate.sons = member.sons.map(s => typeof s === 'object' ? s._id : s);
      }
      if (member.daughters && Array.isArray(member.daughters)) {
        fieldsToPopulate.daughters = member.daughters.map(d => typeof d === 'object' ? d._id : d);
      }

      Object.keys(fieldsToPopulate).forEach(key => {
        if (fieldsToPopulate[key] !== undefined && fieldsToPopulate[key] !== null) {
          populatedData[key] = fieldsToPopulate[key];
        }
      });

      setFormData(populatedData);

      setPhotos(prev => ({
        ...prev,
        photoPreview: member.photo || '',
        citizenshipFrontPreview: member.citizenshipFront || '',
        citizenshipBackPreview: member.citizenshipBack || '',
        nationalIdFrontPreview: member.nationalIdFront || '',
        passportPhotoPreview: member.passportPhoto || '',
        drivingLicensePhotoPreview: member.drivingLicensePhoto || '',
      }));
    }
  }, [member]);

  const resetForm = () => {
    Object.values(photos).forEach(value => {
      if (typeof value === 'string' && value.startsWith('blob:')) {
        URL.revokeObjectURL(value);
      }
    });

    setFormData(initialFormData);
    setPhotos({
      photo: null, photoPreview: '',
      citizenshipFront: null, citizenshipFrontPreview: '',
      citizenshipBack: null, citizenshipBackPreview: '',
      nationalIdFront: null, nationalIdFrontPreview: '',
      passportPhoto: null, passportPhotoPreview: '',
      drivingLicensePhoto: null, drivingLicensePhotoPreview: '',
    });
    setDocuments({
      birthCertificate: null, marriageCertificate: null,
      deathCertificate: null, panCard: null, voterId: null,
    });
    setActiveTab('personal');
    setValidationErrors({});
    delete window[DRAFT_KEY];
    localStorage.removeItem('memberDraft');
    localStorage.removeItem('memberDraftPhotos');
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
    if (validationErrors[name]) {
      setValidationErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleSelectChange = (name, value) => {
    if (name === 'sons' || name === 'daughters') {
      if (Array.isArray(value)) {
        setFormData(prev => ({ ...prev, [name]: value }));
      } else {
        setFormData(prev => {
          const current = prev[name] || [];
          if (current.includes(value)) {
            return { ...prev, [name]: current.filter(v => v !== value) };
          } else {
            return { ...prev, [name]: [...current, value] };
          }
        });
      }
      return;
    }

    if (name === 'family') {
      const familyId = typeof value === 'object' && value !== null
        ? (value._id || value.value || String(value))
        : String(value || '');

      setFormData(prev => ({
        ...prev,
        [name]: familyId,
        familyNumber: '',
        vanshaGenerationNumber: '',
      }));

      if (familyId) {
        const selectedFamily = familiesData?.data?.find(f => f._id === familyId);
        if (selectedFamily) {
          setFormData(prev => ({
            ...prev,
            familyNumber: selectedFamily.familyNumber || '',
            vanshaGenerationNumber: selectedFamily.vanshaGenerationNumber || '',
          }));
          toast.success(t('de_family_selected', { name: selectedFamily.familyName }));
        }
      }

      if (validationErrors[name]) {
        setValidationErrors(prev => ({ ...prev, [name]: '' }));
      }
      return;
    }


    if (name === 'maritalStatus') {
      setFormData((prev) => ({
        ...prev,
        [name]: value || '',
        spouse: value !== 'single' ? prev.spouse : '',
        wifeName: value !== 'single' ? prev.wifeName : '',
        wifeDob: value !== 'single' ? prev.wifeDob : '',
        husbandName: value !== 'single' ? prev.husbandName : '',
        husbandDob: value !== 'single' ? prev.husbandDob : '',
      }));
      return;
    }


    if (name === 'personStatus') {
      setFormData((prev) => ({
        ...prev,
        [name]: value || 'known',
        name: value === 'unknown_name' ? '' : prev.name,
        unknownNameNote: value === 'unknown_name' ? prev.unknownNameNote : '',
      }));
      return;
    }

    setFormData((prev) => ({
      ...prev,
      [name]: value || '',
    }));

    if (validationErrors[name]) {
      setValidationErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleImageSelect = (type, file, preview) => {
    const existingPreview = photos[`${type}Preview`];
    if (typeof existingPreview === 'string' && existingPreview.startsWith('blob:')) {
      URL.revokeObjectURL(existingPreview);
    }

    setPhotos((prev) => ({
      ...prev,
      [type]: file,
      [`${type}Preview`]: preview || (file ? URL.createObjectURL(file) : ''),
    }));
  };

  const handlePhotoRemove = (type) => {
    const preview = photos[`${type}Preview`];
    if (typeof preview === 'string' && preview.startsWith('blob:')) {
      URL.revokeObjectURL(preview);
    }

    setPhotos((prev) => ({
      ...prev,
      [type]: null,
      [`${type}Preview`]: '',
    }));
  };

  const handleDocumentUpload = (type, file) => {
    setDocuments(prev => ({ ...prev, [type]: file }));
  };

  const validateForm = () => {
    const errors = {};

    if (formData.personStatus !== 'unknown_name') {
      if (!formData.name?.trim()) {
        errors.name = t('de_full_name_required');
      }
    }

    if (!formData.gender) {
      errors.gender = t('de_gender_required');
    }

    if (formData.personStatus !== 'unknown_name') {
      if (!formData.dob) {
        errors.dob = t('de_dob_required');
      }
    }

    if (!formData.district) {
      errors.district = t('de_district_required');
    }

    if (!formData.country?.trim()) {
      errors.country = t('de_country_required');
    }

    if (!formData.family) {
      errors.family = t('de_family_required');
    }

    setValidationErrors(errors);
    return errors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const errors = validateForm();
    if (Object.keys(errors).length > 0) {
      Object.values(errors).forEach(msg => toast.error(msg));
      return;
    }

    setLoading(true);

    const buildSubmitData = (confirmDuplicate = false) => {
      const submitData = new FormData();

      Object.keys(formData).forEach((key) => {
        const value = formData[key];
        // files are added below, from what was picked on this form
        if (PHOTO_FIELDS.includes(key)) return;
        if (value === undefined || value === null || value === '') return;

        if (key === 'generation' || key === 'childBirthOrder') {
          submitData.append(key, Number(value));
        } else if (typeof value === 'boolean') {
          submitData.append(key, String(value));
        } else if (Array.isArray(value)) {
          value.forEach((item, index) => {
            submitData.append(`${key}[${index}]`, item);
          });
        } else if (typeof value === 'object' && value._id) {
          submitData.append(key, value._id);
        } else {
          submitData.append(key, value);
        }
      });

      PHOTO_FIELDS.forEach(field => {
        if (photos[field] && photos[field] instanceof File) {
          submitData.append(field, photos[field]);
        }
      });

      Object.entries(documents).forEach(([key, file]) => {
        if (file && file instanceof File) {
          submitData.append(key, file);
        }
      });

      // Editing: a field or photo that had a value and was emptied is sent as
      // empty, which tells the server to remove it.
      if (member) {
        Object.keys(initialFormData)
          .filter(key => !NEVER_CLEARED.includes(key))
          .forEach(key => {
            if (formData[key] === '' && member[key]) submitData.append(key, '');
          });
        if (formData.personStatus === 'unknown_name' && formData.dob === '' && member.dob) {
          submitData.append('dob', '');
        }
        PHOTO_FIELDS.forEach(field => {
          if (member[field] && !photos[`${field}Preview`] && !(photos[field] instanceof File)) {
            submitData.append(field, '');
          }
        });
      }

      if (confirmDuplicate) submitData.append('confirmDuplicate', 'true');
      return submitData;
    };

    const save = (submitData) =>
      member
        ? updateMutation.mutateAsync({ id: member._id, data: submitData })
        : createMutation.mutateAsync(submitData);

    try {
      await save(buildSubmitData());
    } catch (error) {
      // Someone with the same name is already in this family: the same person
      // entered twice, or a different person with the same name? The user decides.
      const data = error.response?.data;
      if (error.response?.status === 409 && data?.code === 'POSSIBLE_DUPLICATE') {
        const isDifferentPerson = window.confirm(
          t('de_different_person_confirm', { message: data.message })
        );
        if (isDifferentPerson) {
          await save(buildSubmitData(true)).catch((retryError) => console.error('Submit error:', retryError));
        }
      } else {
        console.error('Submit error:', error);
      }
    } finally {
      setLoading(false);
    }
  };

  const goToNextTab = () => {
    if (activeTab === 'personal') {
      const personalErrors = {};
      if (formData.personStatus !== 'unknown_name' && !formData.name?.trim()) personalErrors.name = t('de_full_name_required');
      if (!formData.gender) personalErrors.gender = t('de_gender_required');
      if (formData.personStatus !== 'unknown_name' && !formData.dob) personalErrors.dob = t('de_dob_required');

      if (Object.keys(personalErrors).length > 0) {
        setValidationErrors(personalErrors);
        Object.values(personalErrors).forEach(msg => toast.error(msg));
        return;
      }
    }

    if (activeTab === 'contact') {
      const contactErrors = {};
      if (!formData.district) contactErrors.district = t('de_district_required');
      if (!formData.country?.trim()) contactErrors.country = t('de_country_required');

      if (Object.keys(contactErrors).length > 0) {
        setValidationErrors(contactErrors);
        Object.values(contactErrors).forEach(msg => toast.error(msg));
        return;
      }
    }

    const nextIndex = currentTabIndex + 1;
    if (nextIndex < tabOrder.length) {
      setActiveTab(tabOrder[nextIndex]);
      setValidationErrors({});
    }
  };

  const goToPrevTab = () => {
    const prevIndex = currentTabIndex - 1;
    if (prevIndex >= 0) {
      setActiveTab(tabOrder[prevIndex]);
      setValidationErrors({});
    }
  };

  const handleTabClick = (tabId) => {
    setActiveTab(tabId);
    setValidationErrors({});
  };

  const tabs = [
    { id: 'personal', label: t('de_personal_info'), icon: FaUser },
    { id: 'contact', label: t('de_contact_address'), icon: FaAddressCard },
    { id: 'family', label: t('de_family'), icon: FaUsers },
    { id: 'identification', label: t('de_id_cards'), icon: FaIdCard },
    { id: 'passport', label: t('de_passport_license'), icon: FaPassport },
    { id: 'documents', label: t('de_documents'), icon: FaFile },
    { id: 'additional', label: t('de_additional'), icon: FaInfoCircle },
  ];

  const renderTabContent = () => {
    switch (activeTab) {
      case 'personal': return renderPersonalInfo();
      case 'contact': return renderContactAddress();
      case 'family': return renderFamilyInfo();
      case 'identification': return renderIdentification();
      case 'passport': return renderPassportLicense();
      case 'documents': return renderDocuments();
      case 'additional': return renderAdditionalInfo();
      default: return null;
    }
  };

  const renderPhotoUpload = (type, label, preview, size = 'md') => {
    const sizeClasses = { sm: 'w-32 h-32', md: 'w-40 h-40', lg: 'w-48 h-48', xl: 'w-56 h-56' };
    const hasError = validationErrors[type];

    return (
      <div className="flex flex-col items-center">
        {preview ? (
          <div className="relative group">
            <div className={`${sizeClasses[size]} overflow-hidden rounded-xl border-2 ${hasError ? 'border-red-500' : 'border-emerald-200'} shadow-sm transition-all duration-300 hover:shadow-md`}>
              <img src={preview} alt={label} className="h-full w-full object-cover" />
            </div>
            <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-black/40 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
              <button type="button" onClick={() => handlePhotoRemove(type)} className="rounded-full bg-white/90 p-2 hover:bg-white transition-colors" title={t('de_remove_photo')}>
                <FaTrash className="h-5 w-5 text-red-500" />
              </button>
            </div>
          </div>
        ) : (
          <div className={`${sizeClasses[size]}`}>
            <ImageUpload onImageSelect={(file, preview) => handleImageSelect(type, file, preview)} label={label} maxSize={5} />
          </div>
        )}
        {hasError && <span className="text-xs text-red-500 mt-1">{validationErrors[type]}</span>}
      </div>
    );
  };

  const renderPersonalInfo = () => (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
      <div className="space-y-3 md:col-span-2">
        <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-3">
          <label className="mb-2 block text-xs font-medium text-emerald-900">{t('de_person_status')}</label>
          <div className="flex flex-wrap gap-2">
            {[
              ['known', 'de_known_person', FaUser],
              ['missing', 'de_missing_person', FaUserSlash],
              ['unknown_name', 'de_unknown_name', FaQuestionCircle],
            ].map(([value, labelKey, Icon]) => {
              const active = formData.personStatus === value;
              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => handleSelectChange('personStatus', value)}
                  className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-all ${active ? 'bg-emerald-800 text-white shadow-sm' : 'border border-slate-200 bg-white text-slate-600 hover:border-emerald-400'}`}
                >
                  <Icon className="h-4 w-4" /> {t(labelKey)}
                </button>
              );
            })}
          </div>
          {formData.personStatus === 'unknown_name' && <p className="mt-2 text-xs text-emerald-800">{t('de_unknown_name_hint')}</p>}
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <div className="md:col-span-2">
            <FloatingInput label={formData.personStatus === 'unknown_name' ? t('de_name_unknown') : t('de_full_name')} name="name" value={formData.name} onChange={handleChange} required={formData.personStatus !== 'unknown_name'} icon={FaUser} error={validationErrors.name} disabled={formData.personStatus === 'unknown_name'} placeholder={formData.personStatus === 'unknown_name' ? t('de_name_unknown') : ''} />
          </div>

          {formData.personStatus === 'unknown_name' && (
            <div className="md:col-span-2">
              <FloatingInput label={t('de_additional_note')} name="unknownNameNote" value={formData.unknownNameNote} onChange={handleChange} icon={FaInfoCircle} placeholder={t('de_additional_note_placeholder')} />
            </div>
          )}

          <FloatingInput label={t('de_surname_optional')} name="surname" value={formData.surname} onChange={handleChange} icon={FaUser} />

          <SearchableSelect label={t('de_gender')} name="gender" value={formData.gender} onChange={handleSelectChange} options={[{ value: 'male', label: t('male') }, { value: 'female', label: t('female') }, { value: 'other', label: t('de_other') }]} icon={FaMale} required error={validationErrors.gender} />

          <NepaliDatePickerComponent label={t('de_dob_bs')} name="dob" value={formData.dob} onChange={handleSelectChange} required={formData.personStatus !== 'unknown_name'} error={validationErrors.dob} />

          <FloatingInput label={t('de_place_of_birth')} name="placeOfBirth" value={formData.placeOfBirth} onChange={handleChange} icon={FaMapPin} />

          <SearchableSelect label={t('de_blood_group_optional')} name="bloodGroup" value={formData.bloodGroup} onChange={handleSelectChange} options={translatedOptions.bloodGroups} />

          <div className="md:col-span-2">
            <label className="flex cursor-pointer items-center gap-2">
              <input type="checkbox" name="isAlive" checked={formData.isAlive} onChange={handleChange} className="h-4 w-4 rounded border-slate-300 text-emerald-800 focus:ring-emerald-700" />
              <span className="text-sm text-slate-700">{t('de_is_alive')}</span>
            </label>
          </div>
          {!formData.isAlive && (
            <div className="md:col-span-2">
              <NepaliDatePickerComponent label={t('de_date_of_death_optional')} name="dod" value={formData.dod} onChange={handleSelectChange} placeholder={t('de_death_date_placeholder')} required={false} />
            </div>
          )}

          <SearchableSelect label={t('de_occupation')} name="occupation" value={formData.occupation} onChange={handleSelectChange} options={translatedOptions.jobTitles} creatable placeholder={t('de_search_or_enter_occupation')} />
          <SearchableSelect label={t('de_education')} name="education" value={formData.education} onChange={handleSelectChange} options={translatedOptions.educationLevels} creatable placeholder={t('de_search_or_enter_education')} />

          <FloatingInput label={t('de_religion')} name="religion" value={formData.religion} onChange={handleChange} icon={FaHeart} />
          <FloatingInput label={t('de_caste_ethnicity')} name="casteEthnicity" value={formData.casteEthnicity} onChange={handleChange} icon={FaUsers} />
          <FloatingInput label={t('de_nationality')} name="nationality" value={formData.nationality} onChange={handleChange} icon={FaAddressCard} />
        </div>
      </div>

      <div className="md:col-span-1">
        <div className="sticky top-4 rounded-xl border-2 border-dashed border-emerald-200 p-4 transition-all duration-300 hover:border-emerald-400">
          <div className="mb-4 text-center">
            <div className="mx-auto mb-2 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-800">
              <FaCamera className="h-7 w-7" />
            </div>
            <h4 className="text-sm font-semibold text-slate-900">{t('de_passport_photo_optional')}</h4>
            <p className="text-xs text-slate-500">{t('de_photo_spec')}</p>
          </div>
          <div className="flex justify-center">
            {renderPhotoUpload('photo', t('de_passport_photo_optional'), photos.photoPreview, 'xl')}
          </div>
          <div className="mt-3 flex justify-center gap-2 text-xs text-slate-400">
            <span>PNG</span><span>•</span><span>JPG</span><span>•</span><span>JPEG</span><span>•</span><span>5MB</span>
          </div>
        </div>
      </div>
    </div>
  );

  const renderContactAddress = () => (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
      <FloatingInput label={t('de_mobile_number')} name="phone" value={formData.phone} onChange={handleChange} type="tel" icon={FaPhone} />
      <FloatingInput label={t('de_alternate_mobile')} name="alternatePhone" value={formData.alternatePhone} onChange={handleChange} type="tel" icon={FaPhone} />
      <FloatingInput label={t('de_email')} name="email" value={formData.email} onChange={handleChange} type="email" icon={FaEnvelope} />
      <LocationSelect label={t('de_province')} type="province" value={formData.province} onChange={(type, value) => handleSelectChange('province', value)} />
      <LocationSelect label={t('district')} type="district" province={formData.province} value={formData.district} onChange={(type, value) => handleSelectChange('district', value)} required error={validationErrors.district} />
      <LocationSelect label={t('de_municipality')} type="municipality" district={formData.district} value={formData.municipality} onChange={(type, value) => handleSelectChange('municipality', value)} />
      <FloatingInput label={t('de_tole_village')} name="toleVillage" value={formData.toleVillage} onChange={handleChange} icon={FaMapPin} />
      <LocationSelect label={t('de_ward')} type="ward" value={formData.wardNumber} onChange={(type, value) => handleSelectChange('wardNumber', value)} />
      <FloatingInput label={t('de_country')} name="country" value={formData.country} onChange={handleChange} icon={FaMapPin} required error={validationErrors.country} />
      <FloatingInput label={t('de_postal_code')} name="postalCode" value={formData.postalCode} onChange={handleChange} icon={FaMapPin} />
      <div className="md:col-span-2"><FloatingInput label={t('current_address')} name="currentAddress" value={formData.currentAddress} onChange={handleChange} type="textarea" rows={2} icon={FaMapPin} /></div>
      <div className="md:col-span-2"><FloatingInput label={t('de_permanent_address')} name="permanentAddress" value={formData.permanentAddress} onChange={handleChange} type="textarea" rows={2} icon={FaMapPin} /></div>
    </div>
  );

  const renderFamilyInfo = () => {
    const allMembers = (membersData?.data || []).filter(m => m._id !== member?._id);
    const maleMembers = allMembers.filter(m => m.gender === 'male');
    const femaleMembers = allMembers.filter(m => m.gender === 'female');
    const spouseCandidates =
      formData.gender === 'male' ? femaleMembers : formData.gender === 'female' ? maleMembers : allMembers;

    const familyOptions = (familiesData?.data || []).map(f => ({
      value: f._id,
      label: `${f.familyName} (${t('ft_house_short')}: ${f.house?.houseNumber || 'N/A'})${f.vanshaGenerationNumber ? ` - ${t('ft_generation')}: ${f.vanshaGenerationNumber}` : ''}`,
    }));

    const createMemberOptions = (members) => members.map(m => ({
      value: m._id,
      label: `${m.name}${m.surname ? ` ${m.surname}` : ''} (${m.memberNumber || 'N/A'})`,
    }));

    const selectedFamily = familiesData?.data?.find(f => f._id === formData.family);

    return (
      <div className="space-y-4">
        <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-4">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-800">
              <FaInfoCircle className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-medium text-emerald-900">{t('de_select_family')}</p>
              <p className="text-xs text-emerald-800">{t('de_select_family_hint')}</p>
            </div>
          </div>
        </div>

        <SearchableSelect
          label={t('de_family')}
          name="family"
          value={formData.family}
          onChange={handleSelectChange}
          options={familyOptions}
          placeholder={t('de_search_family')}
          required
          error={validationErrors.family}
          disabled={familiesLoading}
        />

        {selectedFamily && (
          <div className="space-y-4 border-t border-slate-200 pt-4">

            <div className="grid grid-cols-1 gap-3 rounded-lg bg-slate-50 p-3 md:grid-cols-3">
              <FloatingInput label={t('de_house_no')} value={selectedFamily.house?.houseNumber || 'N/A'} disabled />
              <FloatingInput label={t('family_number')} value={formData.familyNumber} disabled />
              <FloatingInput label={t('house_id')} value={selectedFamily.houseIdentifier || 'N/A'} disabled />
            </div>


            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <VanshNoAutocomplete
                label={t('de_bansha_no')}
                name="vanshaGenerationNumber"
                value={formData.vanshaGenerationNumber}
                onChange={handleSelectChange}
                placeholder={t('de_search_or_enter_bansha')}
                familyId={formData.family}
                required={false}
              />
              <SearchableSelect label={t('de_relationship')} name="relationship" value={formData.relationship} onChange={handleSelectChange} options={translatedOptions.relationships} placeholder={t('de_select_relationship')} />

              <div className="flex items-end gap-2">
                <FloatingInput label={t('generation')} name="generation" value={formData.generation} onChange={handleChange} type="number" icon={FaUsers} />
                <Button
                  type="button"
                  variant={formData.generationMode === 'manual' ? 'primary' : 'outline'}
                  size="sm"
                  onClick={() => setFormData(prev => ({ ...prev, generationMode: prev.generationMode === 'manual' ? 'auto' : 'manual' }))}
                  className="mb-1"
                >
                  {formData.generationMode === 'manual' ? t('de_manual') : t('de_auto')}
                </Button>
              </div>

              <SearchableSelect label={t('de_father')} name="father" value={formData.father} onChange={handleSelectChange} options={createMemberOptions(maleMembers)} placeholder={`${t('de_father')}...`} />
              <SearchableSelect label={t('de_mother')} name="mother" value={formData.mother} onChange={handleSelectChange} options={createMemberOptions(femaleMembers)} placeholder={`${t('de_mother')}...`} />
              <SearchableSelect label={t('de_grandfather')} name="grandfather" value={formData.grandfather} onChange={handleSelectChange} options={createMemberOptions(maleMembers)} placeholder={`${t('de_grandfather')}...`} />
              <SearchableSelect label={t('de_grandmother')} name="grandmother" value={formData.grandmother} onChange={handleSelectChange} options={createMemberOptions(femaleMembers)} placeholder={`${t('de_grandmother')}...`} />


              <div className="mt-2 rounded-xl border border-emerald-200 bg-emerald-50/50 p-4 md:col-span-2">
                <h4 className="mb-3 flex items-center gap-2 text-sm font-medium text-emerald-900">
                  <FaHeart className="h-4 w-4 text-emerald-800" /> {t('de_marital_info')}
                </h4>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <SearchableSelect label={t('de_marital_status')} name="maritalStatus" value={formData.maritalStatus} onChange={handleSelectChange} options={translatedOptions.maritalStatuses} />
                  {formData.maritalStatus && formData.maritalStatus !== 'single' && (
                    <>
                      <SearchableSelect label={t('de_select_spouse')} name="spouse" value={formData.spouse} onChange={handleSelectChange} options={createMemberOptions(spouseCandidates)} placeholder={t('de_search_spouse')} />
                      {!formData.spouse && formData.gender === 'male' && (
                        <>
                          <FloatingInput label={t('de_wife_name')} name="wifeName" value={formData.wifeName} onChange={handleChange} placeholder={t('de_full_name')} icon={FaUser} />
                          <NepaliDatePickerComponent label={t('de_wife_dob')} name="wifeDob" value={formData.wifeDob} onChange={handleSelectChange} placeholder={t('de_wife_dob')} />
                        </>
                      )}
                      {!formData.spouse && formData.gender === 'female' && (
                        <>
                          <FloatingInput label={t('de_husband_name')} name="husbandName" value={formData.husbandName} onChange={handleChange} placeholder={t('de_full_name')} icon={FaUser} />
                          <NepaliDatePickerComponent label={t('de_husband_dob')} name="husbandDob" value={formData.husbandDob} onChange={handleSelectChange} placeholder={t('de_husband_dob')} />
                        </>
                      )}
                    </>
                  )}
                </div>
                <p className="mt-2 text-xs text-slate-600">{t('de_spouse_hint')}</p>
                <p className="mt-1 text-xs text-slate-600">{t('de_second_spouse_hint')}</p>
              </div>


              <div className="pt-2 md:col-span-2">
                <SearchableSelect label={t('de_sons')} name="sons" value={formData.sons || []} onChange={handleSelectChange} options={createMemberOptions(maleMembers)} placeholder={t('de_select_sons')} isMulti />
              </div>
              <div className="md:col-span-2">
                <SearchableSelect label={t('de_daughters')} name="daughters" value={formData.daughters || []} onChange={handleSelectChange} options={createMemberOptions(femaleMembers)} placeholder={t('de_select_daughters')} isMulti />
              </div>

              <SearchableSelect label={t('de_guardian')} name="guardian" value={formData.guardian} onChange={handleSelectChange} options={createMemberOptions(allMembers)} placeholder={t('de_search_guardian')} />
              <FloatingInput label={t('de_child_birth_order')} name="childBirthOrder" value={formData.childBirthOrder} onChange={handleChange} type="number" icon={FaChild} />
              <SearchableSelect label={t('de_lineage_role')} name="lineageRole" value={formData.lineageRole} onChange={handleSelectChange} options={[{ value: 'lineage_head', label: t('de_lineage_head') }, { value: 'lineage_member', label: t('de_lineage_member') }, { value: 'spouse', label: t('de_spouse') }, { value: 'other', label: t('de_other_short') }]} />
              <FloatingInput label={t('de_family_contact')} name="familyContact" value={formData.familyContact} onChange={handleChange} type="tel" icon={FaPhone} />
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderIdentification = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <FloatingInput label={t('de_citizenship_number')} name="citizenshipNumber" value={formData.citizenshipNumber} onChange={handleChange} icon={FaIdCard} />
        <NepaliDatePickerComponent label={t('de_citizenship_issue_date')} name="citizenshipIssueDate" value={formData.citizenshipIssueDate} onChange={handleSelectChange} />
        <LocationSelect label={t('de_citizenship_issue_district')} type="district" value={formData.citizenshipIssueDistrict} onChange={(type, value) => handleSelectChange('citizenshipIssueDistrict', value)} />
        <FloatingInput label={t('de_national_id_number')} name="nationalIdNumber" value={formData.nationalIdNumber} onChange={handleChange} icon={FaIdCard} />
        <NepaliDatePickerComponent label={t('de_nid_issue_date')} name="nationalIdIssueDate" value={formData.nationalIdIssueDate} onChange={handleSelectChange} />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border-2 border-dashed border-green-200 p-4 hover:border-green-400 transition-all duration-300">
          <h5 className="text-xs font-medium text-green-700 mb-2 text-center">{t('de_citizenship_front')}</h5>
          <div className="flex justify-center">{renderPhotoUpload('citizenshipFront', t('de_citizenship_front'), photos.citizenshipFrontPreview, 'md')}</div>
        </div>
        <div className="bg-white rounded-xl border-2 border-dashed border-green-200 p-4 hover:border-green-400 transition-all duration-300">
          <h5 className="text-xs font-medium text-green-700 mb-2 text-center">{t('de_citizenship_back')}</h5>
          <div className="flex justify-center">{renderPhotoUpload('citizenshipBack', t('de_citizenship_back'), photos.citizenshipBackPreview, 'md')}</div>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-1 gap-4">
        <div className="bg-white rounded-xl border-2 border-dashed border-green-200 p-4 hover:border-green-400 transition-all duration-300 max-w-md mx-auto">
          <h5 className="text-xs font-medium text-green-700 mb-2 text-center">{t('de_national_id_front')}</h5>
          <div className="flex justify-center">{renderPhotoUpload('nationalIdFront', t('de_national_id_front'), photos.nationalIdFrontPreview, 'md')}</div>
        </div>
      </div>
    </div>
  );

  const renderPassportLicense = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <FloatingInput label={t('de_passport_number')} name="passportNumber" value={formData.passportNumber} onChange={handleChange} icon={FaPassport} />
        <NepaliDatePickerComponent label={t('de_passport_issue_date')} name="passportIssueDate" value={formData.passportIssueDate} onChange={handleSelectChange} />
        <NepaliDatePickerComponent label={t('de_passport_expiry_date')} name="passportExpiryDate" value={formData.passportExpiryDate} onChange={handleSelectChange} />
      </div>
      <div className="bg-white rounded-xl border-2 border-dashed border-green-200 p-4 hover:border-green-400 transition-all duration-300 max-w-md mx-auto">
        <h5 className="text-xs font-medium text-green-700 mb-2 text-center">{t('de_passport_photo')}</h5>
        <div className="flex justify-center">{renderPhotoUpload('passportPhoto', t('de_passport_photo'), photos.passportPhotoPreview, 'lg')}</div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <FloatingInput label={t('de_driving_license_number')} name="drivingLicenseNumber" value={formData.drivingLicenseNumber} onChange={handleChange} icon={FaCar} />
        <FloatingInput label={t('de_dl_category')} name="drivingLicenseCategory" value={formData.drivingLicenseCategory} onChange={handleChange} icon={FaCar} />
        <NepaliDatePickerComponent label={t('de_dl_issue_date')} name="drivingLicenseIssueDate" value={formData.drivingLicenseIssueDate} onChange={handleSelectChange} />
        <NepaliDatePickerComponent label={t('de_dl_expiry_date')} name="drivingLicenseExpiryDate" value={formData.drivingLicenseExpiryDate} onChange={handleSelectChange} />
      </div>
      <div className="bg-white rounded-xl border-2 border-dashed border-green-200 p-4 hover:border-green-400 transition-all duration-300 max-w-md mx-auto">
        <h5 className="text-xs font-medium text-green-700 mb-2 text-center">{t('de_driving_license_photo')}</h5>
        <div className="flex justify-center">{renderPhotoUpload('drivingLicensePhoto', t('de_driving_license_photo'), photos.drivingLicensePhotoPreview, 'lg')}</div>
      </div>
    </div>
  );

  const renderDocuments = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="bg-white rounded-xl border-2 border-dashed border-green-200 p-4 hover:border-green-400 transition-all duration-300">
        <h5 className="text-xs font-medium text-green-700 mb-2 text-center">{t('de_birth_certificate')}</h5>
        <div className="flex justify-center"><ImageUpload onImageSelect={(file) => handleDocumentUpload('birthCertificate', file)} label={t('de_upload_birth_certificate')} maxSize={5} /></div>
        {documents.birthCertificate && <p className="text-xs text-green-600 mt-1 text-center">✓ {t('de_file_ready')}</p>}
      </div>
      <div className="bg-white rounded-xl border-2 border-dashed border-green-200 p-4 hover:border-green-400 transition-all duration-300">
        <h5 className="text-xs font-medium text-green-700 mb-2 text-center">{t('de_marriage_certificate')}</h5>
        <div className="flex justify-center"><ImageUpload onImageSelect={(file) => handleDocumentUpload('marriageCertificate', file)} label={t('de_upload_marriage_certificate')} maxSize={5} /></div>
        {documents.marriageCertificate && <p className="text-xs text-green-600 mt-1 text-center">✓ {t('de_file_ready')}</p>}
      </div>
      <div className="bg-white rounded-xl border-2 border-dashed border-green-200 p-4 hover:border-green-400 transition-all duration-300">
        <h5 className="text-xs font-medium text-green-700 mb-2 text-center">{t('de_death_certificate')}</h5>
        <div className="flex justify-center"><ImageUpload onImageSelect={(file) => handleDocumentUpload('deathCertificate', file)} label={t('de_upload_death_certificate')} maxSize={5} /></div>
        {documents.deathCertificate && <p className="text-xs text-green-600 mt-1 text-center">✓ {t('de_file_ready')}</p>}
      </div>
      <div className="bg-white rounded-xl border-2 border-dashed border-green-200 p-4 hover:border-green-400 transition-all duration-300">
        <h5 className="text-xs font-medium text-green-700 mb-2 text-center">{t('de_pan_card')}</h5>
        <div className="flex justify-center"><ImageUpload onImageSelect={(file) => handleDocumentUpload('panCard', file)} label={t('de_upload_pan_card')} maxSize={5} /></div>
        {documents.panCard && <p className="text-xs text-green-600 mt-1 text-center">✓ {t('de_file_ready')}</p>}
      </div>
      <div className="bg-white rounded-xl border-2 border-dashed border-green-200 p-4 hover:border-green-400 transition-all duration-300 md:col-span-2 max-w-md mx-auto">
        <h5 className="text-xs font-medium text-green-700 mb-2 text-center">{t('de_voter_id')}</h5>
        <div className="flex justify-center"><ImageUpload onImageSelect={(file) => handleDocumentUpload('voterId', file)} label={t('de_upload_voter_id')} maxSize={5} /></div>
        {documents.voterId && <p className="text-xs text-green-600 mt-1 text-center">✓ {t('de_file_ready')}</p>}
      </div>
    </div>
  );

  const renderAdditionalInfo = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      <div className="md:col-span-2"><FloatingInput label={t('de_biography')} name="biography" value={formData.biography} onChange={handleChange} type="textarea" rows={3} icon={FaInfoCircle} /></div>
      <div className="md:col-span-2"><FloatingInput label={t('de_notes')} name="notes" value={formData.notes} onChange={handleChange} type="textarea" rows={2} icon={FaInfoCircle} /></div>
      <div className="md:col-span-2"><FloatingInput label={t('de_special_remarks')} name="specialRemarks" value={formData.specialRemarks} onChange={handleChange} type="textarea" rows={2} icon={FaInfoCircle} /></div>
      <div className="md:col-span-2"><FloatingInput label={t('de_medical_notes')} name="medicalNotes" value={formData.medicalNotes} onChange={handleChange} type="textarea" rows={2} icon={FaInfoCircle} /></div>
      <div className="md:col-span-2"><FloatingInput label={t('de_disability_information')} name="disabilityInfo" value={formData.disabilityInfo} onChange={handleChange} type="textarea" rows={2} icon={FaInfoCircle} /></div>
    </div>
  );

  const isSubmitting = loading || createMutation.isPending || updateMutation.isPending;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="dashboard-surface p-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
          <div>
            <h2 className="flex items-center gap-2 text-xl font-bold text-slate-900 md:text-2xl">
              {member ? t('de_edit_member') : t('de_add_new_member')}
            </h2>
            <p className="mt-0.5 text-xs text-slate-600">
              {member ? t('de_update_member_info') : t('de_enter_member_details')} • {t('de_step_x_of_y', { current: currentTabIndex + 1, total: tabOrder.length })}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {!member && (
              <>
                <Button type="button" variant="outline" size="sm" onClick={saveDraft} className="flex items-center">
                  <FaClone className="mr-1.5 h-4 w-4" /> {t('de_save_draft')}
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={loadDraft} className="flex items-center">
                  <FaFile className="mr-1.5 h-4 w-4" /> {t('de_load_draft')}
                </Button>
              </>
            )}
            <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-800">
              {member ? t('de_editing') : t('de_new')}
            </span>
          </div>
        </div>
      </div>

      <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200">
        <div className="h-full bg-emerald-700 transition-all duration-500" style={{ width: `${((currentTabIndex + 1) / tabOrder.length) * 100}%` }} />
      </div>

      <div className="grid grid-cols-1 gap-4">
        <div className="dashboard-surface overflow-hidden">
          <div className="overflow-x-auto rounded-t-xl bg-slate-50 px-3 pt-2">
            <div className="flex min-w-max gap-1">
              {tabs.map((tab, index) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => handleTabClick(tab.id)}
                  className={`relative flex items-center gap-1.5 whitespace-nowrap rounded-t-lg px-3 py-2 text-xs font-medium transition-all duration-300 ${activeTab === tab.id ? 'bg-white text-emerald-800 shadow-sm' : 'text-slate-500 hover:bg-slate-100 hover:text-emerald-800'} ${index < currentTabIndex ? 'text-emerald-700' : ''}`}
                >
                  {index < currentTabIndex && <span className="mr-0.5 text-emerald-700">✓</span>}
                  <tab.icon className={`h-3.5 w-3.5 ${activeTab === tab.id ? 'text-emerald-800' : ''}`} />
                  <span className="hidden sm:inline">{tab.label}</span>
                  <span className="sm:hidden">{tab.label.slice(0, 4)}</span>
                  {activeTab === tab.id && <motion.div layoutId="activeTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-700" transition={{ duration: 0.3 }} />}
                </button>
              ))}
            </div>
          </div>
          <div className="p-3 md:p-4">
            <AnimatePresence mode="wait">
              <motion.div key={activeTab} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} transition={{ duration: 0.2 }}>
                {renderTabContent()}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        <div className="dashboard-surface p-3">
          <div className="flex flex-col sm:flex-row justify-between gap-2">
            <div className="order-2 flex gap-2 sm:order-1">
              <Button type="button" variant="outline" onClick={onCancel} size="sm" className="px-4">
                <FaTimes className="mr-1.5 h-4 w-4" /> {t('de_cancel')}
              </Button>
            </div>
            <div className="order-1 flex gap-2 sm:order-2">
              {!isFirstTab && (
                <Button type="button" variant="secondary" onClick={goToPrevTab} size="sm" className="px-4">
                  <FaChevronLeft className="mr-1.5 h-4 w-4" /> {t('de_previous')}
                </Button>
              )}
              {isLastTab ? (
                <Button key="save" type="submit" disabled={isSubmitting} variant="primary" size="sm" className="px-5">
                  {isSubmitting ? (
                    <span className="flex items-center">
                      <svg className="animate-spin -ml-1 mr-1.5 h-3.5 w-3.5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      {t('de_saving')}
                    </span>
                  ) : (
                    <>
                      <FaSave className="mr-1.5 h-4 w-4" />
                      {member ? t('de_update_member') : t('de_save_member')}
                    </>
                  )}
                </Button>
              ) : (
                <Button key="next" type="button" variant="primary" onClick={goToNextTab} size="sm" className="px-5">
                  {t('de_next')} <FaChevronRight className="ml-1.5 h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </form>
  );
};

export default DataEntry;