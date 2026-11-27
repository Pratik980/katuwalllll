// src/components/settings/SystemSettings.jsx
import { useState, useEffect } from 'react';
import Button from '../Button';
import { useMutation } from '@tanstack/react-query';
import { updateSystemSettings } from '../../api/settings';
import toast from 'react-hot-toast';
import { getAppVersion } from '../../api/system';
import { useLanguage } from '../../context/LanguageContext';

const SystemSettings = ({ data, onDataChange }) => {
  const { t } = useLanguage();
  const [settings, setSettings] = useState({
    language: 'en',
    timeZone: 'Asia/Kathmandu',
    dateFormat: 'YYYY-MM-DD',
    timeFormat: '24',
    currency: 'NPR',
    country: 'Nepal',
  });
  const [appVersion, setAppVersion] = useState('1.0.0');

  const updateMutation = useMutation({
    mutationFn: updateSystemSettings,
    onSuccess: () => {
      toast.success(t('set_system_updated'));
      onDataChange();
    },
  });

  useEffect(() => {
    if (data.settings?.system) {
      setSettings(data.settings.system);
    }
    // Get app version
    getAppVersion().then(version => setAppVersion(version));
  }, [data.settings]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setSettings(prev => ({ ...prev, [name]: value }));
    onDataChange();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    await updateMutation.mutateAsync(settings);
  };

  const languages = [
    { code: 'en', label: t('english') },
    { code: 'ne', label: t('nepali') },
    { code: 'hi', label: t('sys_hindi') },
  ];

  const timeZones = [
    'Asia/Kathmandu',
    'Asia/Kolkata',
    'Asia/Dhaka',
    'Asia/Shanghai',
    'America/New_York',
    'Europe/London',
  ];

  const dateFormats = [
    'YYYY-MM-DD',
    'DD/MM/YYYY',
    'MM/DD/YYYY',
    'DD-MM-YYYY',
  ];

  const timeFormats = [
    { value: '12', label: t('sys_time_12') },
    { value: '24', label: t('sys_time_24') },
  ];

  const currencies = [
    { code: 'NPR', label: t('sys_npr') },
    { code: 'USD', label: t('sys_usd') },
    { code: 'EUR', label: t('sys_eur') },
    { code: 'GBP', label: t('sys_gbp') },
    { code: 'INR', label: t('sys_inr') },
  ];

  const countries = [
    { value: 'Nepal', labelKey: 'sys_country_nepal' },
    { value: 'India', labelKey: 'sys_country_india' },
    { value: 'China', labelKey: 'sys_country_china' },
    { value: 'United States', labelKey: 'sys_country_us' },
    { value: 'United Kingdom', labelKey: 'sys_country_uk' },
    { value: 'Australia', labelKey: 'sys_country_australia' },
  ];

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t('sys_language')}
          </label>
          <select
            name="language"
            value={settings.language}
            onChange={handleChange}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
          >
            {languages.map((lang) => (
              <option key={lang.code} value={lang.code}>
                {lang.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t('sys_time_zone')}
          </label>
          <select
            name="timeZone"
            value={settings.timeZone}
            onChange={handleChange}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
          >
            {timeZones.map((tz) => (
              <option key={tz} value={tz}>
                {tz}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t('sys_date_format')}
          </label>
          <select
            name="dateFormat"
            value={settings.dateFormat}
            onChange={handleChange}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
          >
            {dateFormats.map((format) => (
              <option key={format} value={format}>
                {format}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t('sys_time_format')}
          </label>
          <select
            name="timeFormat"
            value={settings.timeFormat}
            onChange={handleChange}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
          >
            {timeFormats.map((format) => (
              <option key={format.value} value={format.value}>
                {format.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t('sys_currency')}
          </label>
          <select
            name="currency"
            value={settings.currency}
            onChange={handleChange}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
          >
            {currencies.map((curr) => (
              <option key={curr.code} value={curr.code}>
                {curr.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t('sys_country')}
          </label>
          <select
            name="country"
            value={settings.country}
            onChange={handleChange}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
          >
            {countries.map((country) => (
              <option key={country.value} value={country.value}>
                {t(country.labelKey)}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="border-t border-gray-200 pt-6">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="font-medium text-gray-900">{t('sys_app_version')}</h4>
            <p className="text-sm text-gray-600">{t('sys_app_version_hint')}</p>
          </div>
          <span className="px-3 py-1 bg-gray-100 rounded-lg font-mono text-sm">
            v{appVersion}
          </span>
        </div>
      </div>

      <div className="flex justify-end">
        <Button type="submit" disabled={updateMutation.isPending}>
          {updateMutation.isPending ? t('saving') : t('sys_save')}
        </Button>
      </div>
    </form>
  );
};

export default SystemSettings;