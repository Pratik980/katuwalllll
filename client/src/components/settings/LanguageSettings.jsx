import React from 'react';
import { LANGUAGES, useLanguage } from '../../context/LanguageContext';
import { CheckIcon } from '@heroicons/react/24/solid';
import { GlobeAltIcon } from '@heroicons/react/24/outline';

const LanguageSettings = ({ onDataChange }) => {
  const { language, setLanguage, t } = useLanguage();

  const languageOptions = [
    { 
      id: LANGUAGES.EN, 
      label: t('english'),
      nativeLabel: t('english'),
      flag: '🇬🇧',
      description: t('lang_switch_english')
    },
    { 
      id: LANGUAGES.NE, 
      label: t('nepali'),
      nativeLabel: t('nepali'),
      flag: '🇳🇵',
      description: t('lang_switch_nepali')
    },
  ];

  const handleLanguageChange = (newLanguage) => {
    setLanguage(newLanguage);
    if (onDataChange) onDataChange();
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900">
          {t('settings.language.title')}
        </h3>
        <p className="text-sm text-gray-500">
          {t('settings.language.description')}
        </p>
      </div>

      {/* Language Options */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {languageOptions.map((option) => {
          const isActive = language === option.id;
          
          return (
            <button
              key={option.id}
              onClick={() => handleLanguageChange(option.id)}
              className={`relative p-4 rounded-xl border-2 transition-all duration-200 text-left ${
                isActive
                  ? 'border-green-500 bg-green-50 ring-2 ring-green-500 ring-offset-2'
                  : 'border-gray-200 hover:border-gray-300 hover:shadow-md'
              }`}
            >
              <div className="flex items-center gap-4">
                <div className="text-3xl">{option.flag}</div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className={`font-medium ${
                      isActive ? 'text-green-700' : 'text-gray-700'
                    }`}>
                      {option.nativeLabel}
                    </span>
                    {isActive && (
                      <CheckIcon className="w-4 h-4 text-green-600" />
                    )}
                  </div>
                  <p className="text-sm text-gray-500">{option.description}</p>
                </div>
                {isActive && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    {t('lang_active')}
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Language Preview */}
      <div className="mt-4 p-4 rounded-lg bg-gray-50 border border-gray-200">
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <GlobeAltIcon className="w-5 h-5 text-gray-400" />
          <span>{t('lang_current')}</span>
          <span className="font-medium">
            {language === LANGUAGES.EN ? `${t('english')} 🇬🇧` : `${t('nepali')} 🇳🇵`}
          </span>
        </div>
        <div className="mt-2 flex flex-wrap gap-2">
          <span className="text-xs px-2 py-1 bg-gray-200 rounded">{t('lang_preview_dashboard')}</span>
          <span className="text-xs px-2 py-1 bg-gray-200 rounded">{t('lang_preview_members')}</span>
          <span className="text-xs px-2 py-1 bg-gray-200 rounded">{t('lang_preview_settings')}</span>
        </div>
        <p className="mt-2 text-xs text-gray-400">
          {language === LANGUAGES.EN ? t('lang_hint_english') : t('lang_hint_nepali')}
        </p>
      </div>
    </div>
  );
};

export default LanguageSettings;