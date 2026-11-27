// src/components/settings/SecuritySettings.jsx
import { useState, useEffect } from 'react';
import Toggle from '../Toggle';
import Button from '../Button';
import { useMutation, useQuery } from '@tanstack/react-query';
import { 
  getLoginHistory, 
  getActiveDevices, 
  forceLogoutAll,
  updateSecuritySettings 
} from '../../api/security';
import toast from 'react-hot-toast';
import * as Icons from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';

const SecuritySettings = ({ data, onDataChange }) => {
  const { t, language } = useLanguage();
  const [settings, setSettings] = useState({
    sessionTimeout: 60,
    passwordPolicy: {
      minLength: 8,
      requireUppercase: true,
      requireLowercase: true,
      requireNumbers: true,
      requireSpecialChars: true,
    },
    twoFactorEnabled: false,
  });

  const [loginHistory, setLoginHistory] = useState([]);
  const [activeDevices, setActiveDevices] = useState([]);

  const updateSettingsMutation = useMutation({
    mutationFn: updateSecuritySettings,
    onSuccess: () => {
      toast.success(t('set_security_updated'));
      onDataChange();
    },
  });

  const forceLogoutMutation = useMutation({
    mutationFn: forceLogoutAll,
    onSuccess: () => {
      toast.success(t('set_logout_all_success'));
      refetchActiveDevices();
    },
  });

  const { data: historyData, refetch: refetchHistory } = useQuery({
    queryKey: ['loginHistory'],
    queryFn: getLoginHistory,
    enabled: false, // Fetch on demand
  });

  const { data: devicesData, refetch: refetchActiveDevices } = useQuery({
    queryKey: ['activeDevices'],
    queryFn: getActiveDevices,
  });

  useEffect(() => {
    if (data.settings?.security) {
      setSettings(data.settings.security);
    }
  }, [data.settings]);

  useEffect(() => {
    if (devicesData) {
      setActiveDevices(devicesData);
    }
  }, [devicesData]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    if (type === 'checkbox') {
      setSettings(prev => ({
        ...prev,
        [name]: checked
      }));
    } else {
      setSettings(prev => ({
        ...prev,
        [name]: value
      }));
    }
    onDataChange();
  };

  const handlePasswordPolicyChange = (e) => {
    const { name, checked } = e.target;
    setSettings(prev => ({
      ...prev,
      passwordPolicy: {
        ...prev.passwordPolicy,
        [name]: checked
      }
    }));
    onDataChange();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    await updateSettingsMutation.mutateAsync(settings);
  };

  const handleForceLogout = () => {
    if (confirm(t('set_confirm_logout_all'))) {
      forceLogoutMutation.mutate();
    }
  };

  const loadLoginHistory = () => {
    refetchHistory();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {t('set_session_timeout')}
        </label>
        <input
          type="number"
          name="sessionTimeout"
          value={settings.sessionTimeout}
          onChange={handleChange}
          min={5}
          max={480}
          className="w-full max-w-xs px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
        />
        <p className="text-sm text-gray-600 mt-1">{t('set_session_timeout_hint')}</p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {t('set_password_policy')}
        </label>
        <div className="space-y-2">
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              name="requireUppercase"
              checked={settings.passwordPolicy.requireUppercase}
              onChange={handlePasswordPolicyChange}
              className="rounded border-gray-300 text-primary focus:ring-primary"
            />
            <label className="text-sm text-gray-700">{t('set_require_uppercase')}</label>
          </div>
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              name="requireLowercase"
              checked={settings.passwordPolicy.requireLowercase}
              onChange={handlePasswordPolicyChange}
              className="rounded border-gray-300 text-primary focus:ring-primary"
            />
            <label className="text-sm text-gray-700">{t('set_require_lowercase')}</label>
          </div>
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              name="requireNumbers"
              checked={settings.passwordPolicy.requireNumbers}
              onChange={handlePasswordPolicyChange}
              className="rounded border-gray-300 text-primary focus:ring-primary"
            />
            <label className="text-sm text-gray-700">{t('set_require_numbers')}</label>
          </div>
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              name="requireSpecialChars"
              checked={settings.passwordPolicy.requireSpecialChars}
              onChange={handlePasswordPolicyChange}
              className="rounded border-gray-300 text-primary focus:ring-primary"
            />
            <label className="text-sm text-gray-700">{t('set_require_special')}</label>
          </div>
          <div>
            <label className="text-sm text-gray-700 block mb-1">{t('set_min_length')}</label>
            <input
              type="number"
              name="minLength"
              value={settings.passwordPolicy.minLength}
              onChange={(e) => {
                setSettings(prev => ({
                  ...prev,
                  passwordPolicy: {
                    ...prev.passwordPolicy,
                    minLength: parseInt(e.target.value)
                  }
                }));
                onDataChange();
              }}
              min={6}
              max={20}
              className="w-24 px-3 py-1 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between py-2 border-t border-gray-200">
        <div>
          <h4 className="font-medium text-gray-900">{t('set_two_factor')}</h4>
          <p className="text-sm text-gray-600">{t('set_two_factor_hint')}</p>
        </div>
        <Toggle
          enabled={settings.twoFactorEnabled}
          onChange={(value) => {
            setSettings(prev => ({ ...prev, twoFactorEnabled: value }));
            onDataChange();
          }}
        />
      </div>

      <div className="border-t border-gray-200 pt-6">
        <h4 className="font-medium text-gray-900 mb-4">{t('set_active_devices')}</h4>
        {activeDevices.length > 0 ? (
          <div className="space-y-2">
            {activeDevices.map((device, index) => (
              <div key={index} className="flex items-center justify-between py-2 border-b border-gray-100">
                <div className="flex items-center space-x-3">
                  <Icons.MonitorSmartphone className="w-5 h-5 text-gray-400" />
                  <div>
                    <p className="text-sm font-medium">{device.name}</p>
                    <p className="text-xs text-gray-500">
                      {t('set_on_platform', { browser: device.browser, os: device.os })} • {t('set_last_active', { date: new Date(device.lastActive).toLocaleString(language === 'ne' ? 'ne-NP' : 'en-US') })}
                    </p>
                  </div>
                </div>
                <span className={`text-xs px-2 py-1 rounded-full ${
                  device.current ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
                }`}>
                  {device.current ? t('set_current_device') : t('set_active_device')}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500 text-sm">{t('set_no_active_devices')}</p>
        )}
        
        <div className="mt-4">
          <Button
            type="button"
            variant="danger"
            onClick={handleForceLogout}
            disabled={forceLogoutMutation.isPending}
          >
            {forceLogoutMutation.isPending ? t('set_logging_out') : t('set_logout_all_devices')}
          </Button>
        </div>
      </div>

      <div className="border-t border-gray-200 pt-6">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="font-medium text-gray-900">{t('set_login_history')}</h4>
            <p className="text-sm text-gray-600">{t('set_login_history_hint')}</p>
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={loadLoginHistory}
          >
            <Icons.History className="w-4 h-4 mr-2" />
            {t('set_view_history')}
          </Button>
        </div>
        {historyData?.data?.length > 0 && (
          <div className="mt-4 max-h-64 space-y-2 overflow-y-auto">
            {historyData.data.map((entry) => (
              <div key={entry.id} className="flex items-center justify-between rounded-lg border border-gray-100 px-3 py-2">
                <div>
                  <p className="text-sm font-medium">{t('set_on_platform', { browser: entry.browser, os: entry.os })}</p>
                  <p className="text-xs text-gray-500">{entry.ip || t('set_unknown_ip')} · {new Date(entry.createdAt).toLocaleString(language === 'ne' ? 'ne-NP' : 'en-US')}</p>
                </div>
                <span className={`text-xs px-2 py-1 rounded-full ${entry.success ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-700'}`}>
                  {entry.success ? t('set_success_status') : t('set_failed_status')}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex justify-end">
        <Button type="submit" disabled={updateSettingsMutation.isPending}>
          {updateSettingsMutation.isPending ? t('saving') : t('set_save_security')}
        </Button>
      </div>
    </form>
  );
};

export default SecuritySettings;