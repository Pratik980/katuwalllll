import { formatDate } from '../utils/formatters';
import { getBsDateLabel, getRelationLabel } from '../utils/treeLabels';
import { useLanguage } from '../context/LanguageContext';
import {
  User,
  Mail,
  Phone,
  MapPin,
  Briefcase,
  Calendar,
  BookOpen,
  Heart,
  Smartphone,
  FileText,
  Home,
  Users,
  IdCard,
  CreditCard,
  BookMarked,
} from "lucide-react";

const MemberProfile = ({ member }) => {
  const { t } = useLanguage();
  if (!member) return null;

  // Date of birth: the BS date that was typed, with the AD date after it
  const birthDate = member.dob
    ? (member.dobNepali ? `${member.dobNepali} ${t('mp_bs')} (${formatDate(member.dob)})` : formatDate(member.dob))
    : '';
  const bsDate = (field) => {
    const label = getBsDateLabel(member, field);
    return label ? `${label} ${t('mp_bs')}` : '';
  };


  const hasValue = (value) => {
    if (value === undefined || value === null) return false;
    if (typeof value === 'string') return value.trim().length > 0;
    if (typeof value === 'object') {
      if (Array.isArray(value)) return value.length > 0;
      if (value._id) return true;
      return Object.keys(value).some(key => hasValue(value[key]));
    }
    return true;
  };

  const renderSection = (title, icon, children, condition = true) => {
    if (!condition) return null;
    return (
      <div className="border-b border-gray-200 pb-4 last:border-b-0">
        <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2 mb-3">
          {icon}
          {title}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {children}
        </div>
      </div>
    );
  };

  const renderField = (label, value) => {
    if (!hasValue(value)) return null;
    return (
      <div className="flex flex-col">
        <span className="text-xs text-gray-500">{label}</span>
        <span className="text-sm text-gray-900">{typeof value === 'object' && value.name ? value.name : value}</span>
      </div>
    );
  };

  const hasSectionData = (fields) => {
    return fields.some(field => hasValue(member[field]));
  };

  return (
    <div className="space-y-6 max-h-[80vh] overflow-y-auto px-2">

      <div className="flex items-center gap-4">
        <img
          src={member.photo || '/default-avatar.png'}
          alt={member.name}
          className="w-20 h-20 rounded-full object-cover border-2 border-gray-200"
          onError={(e) => {
            if (e.target.dataset.fallback) return;
            e.target.dataset.fallback = 'true';
            e.target.src = '/default-avatar.png';
          }}
        />
        <div className="flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <h2 className="text-xl font-bold text-gray-900">{member.name}</h2>
            {hasValue(member.surname) && (
              <span className="text-sm text-gray-600">{member.surname}</span>
            )}
            {hasValue(member.memberNumber) && (
              <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full text-xs font-medium">
                #{member.memberNumber}
              </span>
            )}
          </div>
          <div className="flex flex-wrap gap-3 text-sm text-gray-600 mt-1">
            {hasValue(member.gender) && <span className="capitalize">{t(member.gender)}</span>}
            {hasValue(member.gender) && <span>•</span>}
            <span className={member.isAlive === false ? 'text-red-600' : 'text-green-600'}>
              {member.isAlive === false ? t('mp_deceased') : t('mp_living')}
            </span>
            {hasValue(member.generation) && (
              <>
                <span>•</span>
                <span>{t('mp_generation_value', { number: member.generation })}</span>
              </>
            )}
            {hasValue(member.familyNumber) && (
              <>
                <span>•</span>
                <span>{t('mp_family_number_value', { number: member.familyNumber })}</span>
              </>
            )}
          </div>
        </div>
      </div>


      {renderSection(t('de_personal_info'), <User className="h-4 w-4 text-gray-500" />,
        <>
          {renderField(t('de_dob_bs'), birthDate)}
          {renderField(t('de_place_of_birth'), member.placeOfBirth)}
          {renderField(t('de_blood_group_optional'), member.bloodGroup)}
          {renderField(t('de_marital_status'), member.maritalStatus)}
          {renderField(t('de_occupation'), member.occupation)}
          {renderField(t('de_education'), member.education)}
          {renderField(t('de_religion'), member.religion)}
          {renderField(t('de_caste_ethnicity'), member.casteEthnicity)}
          {renderField(t('de_nationality'), member.nationality)}

          {member.isAlive === false && member.dod && renderField(t('de_date_of_death_optional'), bsDate('dod'))}
        </>,

        hasSectionData(['dob', 'placeOfBirth', 'bloodGroup', 'maritalStatus', 'occupation', 'education', 'religion', 'casteEthnicity', 'nationality', 'dod'])
      )}


      {renderSection(t('mp_contact_information'), <Smartphone className="h-4 w-4 text-gray-500" />,
        <>
          {renderField(t('de_mobile_number'), member.phone)}
          {renderField(t('de_alternate_mobile'), member.alternatePhone)}
          {renderField(t('de_email'), member.email)}
        </>,
        hasSectionData(['phone', 'alternatePhone', 'email'])
      )}

      {renderSection(t('mp_address_information'), <Home className="h-4 w-4 text-gray-500" />,
        <>
          {renderField(t('mp_house_number'), member.houseNumber)}
          {renderField(t('mp_ward_number'), member.wardNumber)}
          {renderField(t('de_tole_village'), member.toleVillage)}
          {renderField(t('de_municipality'), member.municipality)}
          {renderField(t('district'), member.district)}
          {renderField(t('de_province'), member.province)}
          {renderField(t('de_country'), member.country)}
          {renderField(t('current_address'), member.currentAddress)}
          {renderField(t('de_permanent_address'), member.permanentAddress)}
          {renderField(t('de_postal_code'), member.postalCode)}
        </>,
        hasSectionData(['houseNumber', 'wardNumber', 'toleVillage', 'municipality', 'district', 'province', 'country', 'currentAddress', 'permanentAddress', 'postalCode'])
      )}


      {renderSection(t('mp_family_information'), <Users className="h-4 w-4 text-gray-500" />,
        <>
          {renderField(t('mp_family'), member.family?.familyName)}
          {renderField(t('family_number'), member.familyNumber)}
          {renderField(t('mp_roll_number'), member.rollNumber)}
          {renderField(t('generation'), member.generation)}
          {renderField(t('de_relationship'), getRelationLabel(member, t))}
          {renderField(t('de_father'), member.father?.name)}
          {renderField(t('de_mother'), member.mother?.name)}
          {renderField(t('de_grandfather'), member.grandfather?.name)}
          {renderField(t('de_grandmother'), member.grandmother?.name)}
          {renderField(t('de_spouse'), member.spouse?.name)}
          {renderField(t('de_guardian'), member.guardian?.name)}
          {renderField(t('de_family_contact'), member.familyContact)}
        </>,
        hasSectionData(['family', 'familyNumber', 'rollNumber', 'generation', 'relationship', 'father', 'mother', 'grandfather', 'grandmother', 'spouse', 'guardian', 'familyContact'])
      )}


      {renderSection(t('mp_identification'), <IdCard className="h-4 w-4 text-gray-500" />,
        <>
          {renderField(t('de_citizenship_number'), member.citizenshipNumber)}
          {renderField(t('de_citizenship_issue_date'), bsDate('citizenshipIssueDate'))}
          {renderField(t('de_citizenship_issue_district'), member.citizenshipIssueDistrict)}
          {renderField(t('de_national_id_number'), member.nationalIdNumber)}
          {renderField(t('de_nid_issue_date'), bsDate('nationalIdIssueDate'))}
        </>,
        hasSectionData(['citizenshipNumber', 'citizenshipIssueDate', 'citizenshipIssueDistrict', 'nationalIdNumber', 'nationalIdIssueDate'])
      )}


      {renderSection(t('mp_passport'), <IdCard className="h-4 w-4 text-gray-500" />,
        <>
          {renderField(t('de_passport_number'), member.passportNumber)}
          {renderField(t('de_passport_issue_date'), bsDate('passportIssueDate'))}
          {renderField(t('de_passport_expiry_date'), bsDate('passportExpiryDate'))}
        </>,
        hasSectionData(['passportNumber', 'passportIssueDate', 'passportExpiryDate'])
      )}


      {renderSection(t('mp_driving_license'), <CreditCard className="h-4 w-4 text-gray-500" />,
        <>
          {renderField(t('mp_license_number'), member.drivingLicenseNumber)}
          {renderField(t('mp_license_category'), member.drivingLicenseCategory)}
          {renderField(t('mp_license_issue_date'), bsDate('drivingLicenseIssueDate'))}
          {renderField(t('mp_license_expiry_date'), bsDate('drivingLicenseExpiryDate'))}
        </>,
        hasSectionData(['drivingLicenseNumber', 'drivingLicenseCategory', 'drivingLicenseIssueDate', 'drivingLicenseExpiryDate'])
      )}


      {renderSection(t('mp_additional_information'), <BookMarked className="h-4 w-4 text-gray-500" />,
        <>
          {member.biography && (
            <div className="col-span-2">
              <span className="text-xs text-gray-500">{t('de_biography')}</span>
              <p className="text-sm text-gray-900 whitespace-pre-wrap">{member.biography}</p>
            </div>
          )}
          {member.notes && (
            <div className="col-span-2">
              <span className="text-xs text-gray-500">{t('de_notes')}</span>
              <p className="text-sm text-gray-900 whitespace-pre-wrap">{member.notes}</p>
            </div>
          )}
          {member.specialRemarks && (
            <div className="col-span-2">
              <span className="text-xs text-gray-500">{t('de_special_remarks')}</span>
              <p className="text-sm text-gray-900 whitespace-pre-wrap">{member.specialRemarks}</p>
            </div>
          )}
          {member.medicalNotes && (
            <div className="col-span-2">
              <span className="text-xs text-gray-500">{t('de_medical_notes')}</span>
              <p className="text-sm text-gray-900 whitespace-pre-wrap">{member.medicalNotes}</p>
            </div>
          )}
          {member.disabilityInfo && (
            <div className="col-span-2">
              <span className="text-xs text-gray-500">{t('de_disability_information')}</span>
              <p className="text-sm text-gray-900 whitespace-pre-wrap">{member.disabilityInfo}</p>
            </div>
          )}
        </>,
        hasSectionData(['biography', 'notes', 'specialRemarks', 'medicalNotes', 'disabilityInfo'])
      )}


    </div>
  );
};

export default MemberProfile;