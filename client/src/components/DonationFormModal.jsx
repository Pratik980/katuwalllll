import { useEffect, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import Modal from './Modal';
import QRCodeDisplay from './QRCodeDisplay';
import { createDonation, updateDonation } from '../api/donations';
import { getMembers } from '../api/members';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';

const today = () => new Date().toISOString().split('T')[0];

const emptyForm = () => ({
  donorType: 'external',
  donorId: '',
  donorName: '',
  donorPhone: '',
  donorEmail: '',
  amount: '',
  paymentMethod: 'cash',
  category: 'general',
  donationDate: today(),
  remarks: '',
  isAnonymous: false,
  qrPaymentCompleted: false,
  qrPaymentReference: '',
  paymentStatus: 'pending',
});

const DonationFormModal = ({ isOpen, onClose, donation, mode = 'create' }) => {
  const queryClient = useQueryClient();
  const { t } = useLanguage();
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [formData, setFormData] = useState(emptyForm);
  const [members, setMembers] = useState([]);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (!isOpen) return;
    if (donation && mode === 'edit') {
      setFormData({
        donorType: donation.donorType || 'external',
        donorId: donation.donorId?._id || donation.donorId || '',
        donorName: donation.donorName || '',
        donorPhone: donation.donorPhone || '',
        donorEmail: donation.donorEmail || '',
        amount: donation.amount ?? '',
        paymentMethod: donation.paymentMethod || 'cash',
        category: donation.category || 'general',
        donationDate: donation.donationDate ? new Date(donation.donationDate).toISOString().split('T')[0] : today(),
        remarks: donation.remarks || '',
        isAnonymous: Boolean(donation.isAnonymous),
        qrPaymentCompleted: Boolean(donation.qrPaymentCompleted),
        qrPaymentReference: donation.qrPaymentReference || '',
        paymentStatus: donation.paymentStatus || 'pending',
      });
    } else {
      setFormData(emptyForm());
    }
    setErrors({});
  }, [donation, isOpen, mode]);

  useEffect(() => {
    if (!isOpen) return;
    let active = true;
    getMembers({ limit: 1000 })
      .then((data) => {
        if (active) setMembers(data.data || []);
      })
      .catch(() => {
        if (active) setMembers([]);
      });
    return () => { active = false; };
  }, [isOpen]);

  const mutation = useMutation({
    mutationFn: (data) => (mode === 'edit' ? updateDonation(donation._id, data) : createDonation(data)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['donations'] });
      queryClient.invalidateQueries({ queryKey: ['donationStats'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
      toast.success(mode === 'edit' ? t('donation_updated') : t('donation_created'));
      onClose();
    },
    onError: (error) => toast.error(error.response?.data?.message || t('error_saving_donation')),
  });

  const setField = (field, value) => {
    setFormData((previous) => ({ ...previous, [field]: value }));
    setErrors((previous) => ({ ...previous, [field]: '' }));
  };

  const handleMemberChange = (memberId) => {
    const member = members.find((row) => row._id === memberId);
    setFormData((previous) => ({
      ...previous,
      donorId: memberId,
      donorName: member?.name || previous.donorName,
      donorPhone: member?.phone || previous.donorPhone,
      donorEmail: member?.email || previous.donorEmail,
    }));
    setErrors((previous) => ({ ...previous, donorId: '', donorName: '', donorPhone: '', donorEmail: '' }));
  };

  const validate = () => {
    const nextErrors = {};
    if (!formData.donorName.trim()) nextErrors.donorName = t('donor_name_required');
    if (!/^[0-9+\-\s()]{7,20}$/.test(formData.donorPhone.trim())) nextErrors.donorPhone = t('donor_phone_required');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.donorEmail.trim())) nextErrors.donorEmail = t('donor_email_required');
    if (!(Number(formData.amount) > 0)) nextErrors.amount = t('donation_amount_required');
    if (['member', 'family'].includes(formData.donorType) && !formData.donorId) nextErrors.donorId = t('select_member_required');
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!validate()) return;

    const payload = {
      ...formData,
      donorName: formData.donorName.trim(),
      donorPhone: formData.donorPhone.trim(),
      donorEmail: formData.donorEmail.trim(),
      amount: Number(formData.amount),
      remarks: formData.remarks.trim(),
      qrPaymentReference: formData.qrPaymentReference.trim(),
    };
    if (!['member', 'family'].includes(payload.donorType)) {
      delete payload.donorId;
    }
    mutation.mutate(payload);
  };

  const inputClass = 'mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-green-600 focus:outline-none focus:ring-2 focus:ring-green-100';
  const errorText = (field) => errors[field] && <p className="mt-1 text-xs text-green-800">{errors[field]}</p>;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={mode === 'edit' ? t('edit_donation') : t('add_donation')}
      size="lg"
    >
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_16rem]">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="text-sm font-medium text-slate-700">
              {t('donor_type')} *
              <select
                value={formData.donorType}
                onChange={(event) => setField('donorType', event.target.value)}
                className={inputClass}
              >
                <option value="external">{t('external_donor')}</option>
                <option value="member">{t('member')}</option>
                <option value="family">{t('family')}</option>
              </select>
            </label>

            {['member', 'family'].includes(formData.donorType) && (
              <label className="text-sm font-medium text-slate-700">
                {t('select')} {formData.donorType === 'member' ? t('member') : t('family')} *
                <select
                  value={formData.donorId}
                  onChange={(event) => handleMemberChange(event.target.value)}
                  className={inputClass}
                >
                  <option value="">{t('select')} {formData.donorType}</option>
                  {members.map((member) => (
                    <option key={member._id} value={member._id}>
                      {member.name}{member.phone ? ` (${member.phone})` : ''}
                    </option>
                  ))}
                </select>
                {errorText('donorId')}
              </label>
            )}

            <label className="text-sm font-medium text-slate-700">
              {t('full_name')} *
              <input
                value={formData.donorName}
                onChange={(event) => setField('donorName', event.target.value)}
                className={inputClass}
                required
              />
              {errorText('donorName')}
            </label>
            <label className="text-sm font-medium text-slate-700">
              {t('phone')} *
              <input
                type="tel"
                inputMode="tel"
                value={formData.donorPhone}
                onChange={(event) => setField('donorPhone', event.target.value)}
                className={inputClass}
                required
              />
              {errorText('donorPhone')}
            </label>
            <label className="text-sm font-medium text-slate-700 sm:col-span-2">
              {t('email')} *
              <input
                type="email"
                value={formData.donorEmail}
                onChange={(event) => setField('donorEmail', event.target.value)}
                className={inputClass}
                required
              />
              {errorText('donorEmail')}
            </label>
          </div>

          <div className="grid gap-4 border-t border-slate-200 pt-4 sm:grid-cols-2">
            <label className="text-sm font-medium text-slate-700">
              {t('amount')} *
              <input
                type="number"
                min="0.01"
                step="0.01"
                value={formData.amount}
                onChange={(event) => setField('amount', event.target.value)}
                className={inputClass}
                required
              />
              {errorText('amount')}
            </label>
            <label className="text-sm font-medium text-slate-700">
              {t('donation_date')} *
              <input
                type="date"
                value={formData.donationDate}
                onChange={(event) => setField('donationDate', event.target.value)}
                className={inputClass}
                required
              />
            </label>
            <label className="text-sm font-medium text-slate-700">
              {t('payment_method')} *
              <select
                value={formData.paymentMethod}
                onChange={(event) => setField('paymentMethod', event.target.value)}
                className={inputClass}
              >
                <option value="cash">{t('cash')}</option>
                <option value="qr">{t('qr_code')}</option>
                <option value="bank_transfer">{t('bank_transfer')}</option>
                <option value="cheque">{t('cheque')}</option>
              </select>
            </label>
            <label className="text-sm font-medium text-slate-700">
              {t('category')} *
              <select
                value={formData.category}
                onChange={(event) => setField('category', event.target.value)}
                className={inputClass}
              >
                {['general', 'temple', 'education', 'emergency', 'event', 'other'].map((category) => (
                  <option key={category} value={category}>{t(category)}</option>
                ))}
              </select>
            </label>
            <label className="text-sm font-medium text-slate-700">
              {t('payment_status')}
              <select
                value={formData.paymentStatus}
                onChange={(event) => setField('paymentStatus', event.target.value)}
                className={inputClass}
              >
                <option value="pending">{t('pending')}</option>
                <option value="paid">{t('paid')}</option>
                <option value="failed">{t('failed')}</option>
              </select>
            </label>
            {formData.paymentMethod === 'qr' && (
              <label className="text-sm font-medium text-slate-700">
                {t('qr_reference')}
                <input
                  value={formData.qrPaymentReference}
                  onChange={(event) => setField('qrPaymentReference', event.target.value)}
                  className={inputClass}
                  maxLength={120}
                />
              </label>
            )}
            <label className="text-sm font-medium text-slate-700 sm:col-span-2">
              {t('remarks')}
              <textarea
                rows={3}
                value={formData.remarks}
                onChange={(event) => setField('remarks', event.target.value)}
                className={inputClass}
                maxLength={500}
              />
            </label>
          </div>

          {isAdmin && (
            <div className="flex flex-wrap gap-5 border-t border-slate-200 pt-4 text-sm text-slate-700">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.isAnonymous}
                  onChange={(event) => setField('isAnonymous', event.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-green-700 focus:ring-green-600"
                />
                {t('anonymous_donation')}
              </label>
              {formData.paymentMethod === 'qr' && (
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.qrPaymentCompleted}
                    onChange={(event) => setField('qrPaymentCompleted', event.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-green-700 focus:ring-green-600"
                  />
                  {t('qr_payment_completed')}
                </label>
              )}
            </div>
          )}

          <div className="flex justify-end gap-2 border-t border-slate-200 pt-4">
            <button type="button" onClick={onClose} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
              {t('cancel')}
            </button>
            <button
              type="submit"
              disabled={mutation.isPending}
              className="rounded-lg bg-green-700 px-4 py-2 text-sm font-medium text-white hover:bg-green-800 disabled:opacity-60"
            >
              {mutation.isPending ? t('saving') : (mode === 'edit' ? t('update_donation') : t('save_donation'))}
            </button>
          </div>
        </form>

        {formData.paymentMethod === 'qr' && (
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
            <QRCodeDisplay />
          </div>
        )}
      </div>
    </Modal>
  );
};

export default DonationFormModal;
