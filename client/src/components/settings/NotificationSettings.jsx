// src/components/settings/NotificationSettings.jsx
import { useState, useEffect } from 'react';
import Toggle from '../Toggle';
import { useMutation } from '@tanstack/react-query';
import { updateNotificationSettings } from '../../api/settings';
import toast from 'react-hot-toast';
import { useLanguage } from '../../context/LanguageContext';

const NotificationSettings = ({ data, onDataChange }) => {
  const { t } = useLanguage();
  const [settings, setSettings] = useState({
    emailNotifications: true,
    browserNotifications: true,
    donationNotifications: true,
    newMemberNotifications: true,
    birthdayNotifications: true,
    familyUpdateNotifications: true,
    chatNotifications: true,
    soundNotifications: true,
  });

  const updateMutation = useMutation({
    mutationFn: updateNotificationSettings,
    onSuccess: () => {
      toast.success(t('set_notification_updated'));
      onDataChange();
    },
  });

  useEffect(() => {
    if (data.settings?.notifications) {
      setSettings(data.settings.notifications);
    }
  }, [data.settings]);

  const handleToggle = async (key) => {
    const newSettings = { ...settings, [key]: !settings[key] };
    setSettings(newSettings);
    await updateMutation.mutateAsync(newSettings);
  };

  const notificationItems = [
    { key: 'emailNotifications', labelKey: 'notif_email_label', descriptionKey: 'notif_email_desc' },
    { key: 'browserNotifications', labelKey: 'notif_browser_label', descriptionKey: 'notif_browser_desc' },
    { key: 'donationNotifications', labelKey: 'notif_donation_label', descriptionKey: 'notif_donation_desc' },
    { key: 'newMemberNotifications', labelKey: 'notif_member_label', descriptionKey: 'notif_member_desc' },
    { key: 'birthdayNotifications', labelKey: 'notif_birthday_label', descriptionKey: 'notif_birthday_desc' },
    { key: 'familyUpdateNotifications', labelKey: 'notif_family_label', descriptionKey: 'notif_family_desc' },
    { key: 'chatNotifications', labelKey: 'notif_chat_label', descriptionKey: 'notif_chat_desc' },
    { key: 'soundNotifications', labelKey: 'notif_sound_label', descriptionKey: 'notif_sound_desc' },
  ];

  return (
    <div className="space-y-6">
      {notificationItems.map((item) => (
        <div key={item.key} className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
          <div>
            <h4 className="font-medium text-gray-900">{t(item.labelKey)}</h4>
            <p className="text-sm text-gray-600">{t(item.descriptionKey)}</p>
          </div>
          <Toggle
            enabled={settings[item.key]}
            onChange={() => handleToggle(item.key)}
            disabled={updateMutation.isPending}
          />
        </div>
      ))}
    </div>
  );
};

export default NotificationSettings;