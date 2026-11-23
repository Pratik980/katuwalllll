// src/components/settings/GeneralSettings.jsx
import { useState, useEffect } from 'react';
import ImageUpload from '../ImageUpload';
import Button from '../Button';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { uploadLogo, updateOrganization } from '../../api/organization';
import toast from 'react-hot-toast';
import { UploadCloud, CheckCircle2 } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';

const GeneralSettings = ({ data, onDataChange }) => {
  const { t } = useLanguage();
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    address: '',
    phone: '',
    email: '',
    website: '',
    mission: '',
    vision: '',
    registrationNumber: '',
    establishedDate: '',
  });
  const [logoPreview, setLogoPreview] = useState('');
  const queryClient = useQueryClient();

  const saveMutation = useMutation({
    mutationFn: (payload) => {
      const form = new FormData();
      Object.entries(payload).forEach(([key, value]) => {
        if (value !== undefined && value !== null) form.append(key, value);
      });
      return updateOrganization(form);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organization'] });
      toast.success('Organization settings saved');
    },
    onError: (error) => toast.error(error.response?.data?.message || 'Could not save organization settings'),
  });

  const logoMutation = useMutation({
    mutationFn: uploadLogo,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organization'] });
      toast.success('Logo uploaded successfully');
      onDataChange();
    },
  });

  useEffect(() => {
    if (data.organization) {
      setFormData({
        name: data.organization.name || '',
        description: data.organization.description || '',
        address: data.organization.address || '',
        phone: data.organization.phone || '',
        email: data.organization.email || '',
        website: data.organization.website || '',
        mission: data.organization.mission || '',
        vision: data.organization.vision || '',
        registrationNumber: data.organization.registrationNumber || '',
        establishedDate: data.organization.establishedDate 
          ? new Date(data.organization.establishedDate).toISOString().split('T')[0] 
          : '',
      });
      if (data.organization.logo) {
        setLogoPreview(data.organization.logo);
      }
    }
  }, [data.organization]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    onDataChange();
  };

  const handleLogoUpload = async (file) => {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error('File size exceeds 5MB limit');
      return;
    }
    const form = new FormData();
    form.append('logo', file);
    try {
      const res = await logoMutation.mutateAsync(form);
      if (res?.logo) {
        setLogoPreview(res.logo);
      } else {
        setLogoPreview(URL.createObjectURL(file));
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to upload logo');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col items-center p-4 bg-slate-50/80 rounded-2xl border border-slate-200">
        <div className="text-center mb-3">
          <h4 className="text-sm font-semibold text-slate-800">{t('brand_identity') || 'Brand Identity / Logo'}</h4>
          <p className="text-xs text-slate-500 mt-0.5">{t('logo_preview_desc') || 'Displays in header and sidebar across the portal'}</p>
        </div>
        {logoPreview ? (
          <div className="relative group">
            <img
              src={logoPreview}
              alt="Organization Logo"
              className="h-32 w-32 object-contain border-2 border-emerald-500 rounded-2xl bg-white p-2 shadow-md"
            />
            <span className="absolute -top-2 -right-2 bg-emerald-600 text-white rounded-full p-1 text-xs shadow">
              <CheckCircle2 className="h-4 w-4" />
            </span>
          </div>
        ) : (
          <div className="h-32 w-32 rounded-2xl bg-gradient-to-br from-green-500 to-emerald-600 flex flex-col items-center justify-center shadow-lg text-white">
            <span className="text-4xl font-black tracking-wider">KB</span>
            <span className="text-xs font-semibold mt-1 opacity-90">Katuwal Bansha</span>
          </div>
        )}
        <div className="mt-4 flex flex-col items-center gap-1.5">
          <label className="cursor-pointer inline-flex items-center gap-2 rounded-xl bg-emerald-800 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 active:scale-95 transition disabled:opacity-50">
            <UploadCloud className="h-4 w-4" />
            {logoMutation.isPending ? (t('uploading') || 'Uploading...') : (t('upload_logo') || 'Upload Logo')}
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp,image/svg+xml"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleLogoUpload(file);
              }}
              className="hidden"
              disabled={logoMutation.isPending}
            />
          </label>
          <span className="text-xs text-slate-500">
            PNG, JPG, WEBP, SVG (Max 5MB)
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Organization Name *
          </label>
          <input
            type="text"
            name="name"
            value={formData.name}
            onChange={handleChange}
            required
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Registration Number
          </label>
          <input
            type="text"
            name="registrationNumber"
            value={formData.registrationNumber}
            onChange={handleChange}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Phone
          </label>
          <input
            type="tel"
            name="phone"
            value={formData.phone}
            onChange={handleChange}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Email
          </label>
          <input
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Website
          </label>
          <input
            type="url"
            name="website"
            value={formData.website}
            onChange={handleChange}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Established Date
          </label>
          <input
            type="date"
            name="establishedDate"
            value={formData.establishedDate}
            onChange={handleChange}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        <div className="col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Address
          </label>
          <input
            type="text"
            name="address"
            value={formData.address}
            onChange={handleChange}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        <div className="col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Description
          </label>
          <textarea
            name="description"
            value={formData.description}
            onChange={handleChange}
            rows="3"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        <div className="col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Mission
          </label>
          <textarea
            name="mission"
            value={formData.mission}
            onChange={handleChange}
            rows="2"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        <div className="col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Vision
          </label>
          <textarea
            name="vision"
            value={formData.vision}
            onChange={handleChange}
            rows="2"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
      </div>

      <div className="flex justify-end">
        <Button
          type="button"
          onClick={() => saveMutation.mutate(formData)}
          disabled={saveMutation.isPending}
        >
          {saveMutation.isPending ? 'Saving...' : 'Save Organization Settings'}
        </Button>
      </div>
    </div>
  );
};

export default GeneralSettings;