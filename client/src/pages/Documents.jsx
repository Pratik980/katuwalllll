import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getDocuments, deleteDocument, verifyDocument } from '../api/documents';
import { getMembers } from '../api/members';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import Table from '../components/Table';
import Button from '../components/Button';
import Modal from '../components/Modal';
import DocumentUpload from '../components/DocumentUpload';
import { PlusIcon, CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

const Documents = () => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const canManage = user?.role === 'admin';
  const [page, setPage] = useState(1);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState('');
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['documents', page, selectedMember],
    queryFn: () => getDocuments({ page, limit: 10, memberId: selectedMember }),
  });

  const { data: membersData } = useQuery({
    queryKey: ['members-dropdown'],
    queryFn: () => getMembers({ limit: 1000 }),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteDocument,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      toast.success(t('document_deleted'));
    },
  });

  const verifyMutation = useMutation({
    mutationFn: verifyDocument,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      toast.success(t('document_verified'));
    },
  });

  const handleDelete = (id) => {
    if (window.confirm(t('delete_document_confirm'))) {
      deleteMutation.mutate(id);
    }
  };

  const handleVerify = (id) => {
    verifyMutation.mutate(id);
  };

  const columns = [
    { key: 'title', label: t('document_title') },
    { key: 'documentType', label: t('document_type') },
    { key: 'member', label: t('member'), type: 'member' },
    { key: 'isVerified', label: t('verified'), type: 'verified' },
    { key: 'createdAt', label: t('uploaded'), type: 'date' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{t('documents')}</h1>
          <p className="text-slate-600">{t('documents_description')}</p>
        </div>
        {canManage && (
          <Button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center shadow-lg shadow-green-200"
          >
            <PlusIcon className="mr-2 h-5 w-5" />
            {t('upload_document')}
          </Button>
        )}
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-4 border-b border-gray-200 flex flex-wrap gap-4">
          <select
            value={selectedMember}
            onChange={(e) => {
              setSelectedMember(e.target.value);
              setPage(1);
            }}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="">{t('all_members')}</option>
            {membersData?.data?.map((member) => (
              <option key={member._id} value={member._id}>
                {member.name}
              </option>
            ))}
          </select>
        </div>

        <Table
          columns={columns}
          data={data?.data || []}
          loading={isLoading}
          onDelete={canManage ? handleDelete : undefined}
          customActions={canManage ? (item) => (
            <>
              {!item.isVerified && (
                <button
                  onClick={() => handleVerify(item._id)}
                  className="text-green-600 hover:text-green-900 mr-3"
                  title={t('verify_document')}
                >
                  <CheckCircleIcon className="h-5 w-5" />
                </button>
              )}
            </>
          ) : undefined}
          pagination={{
            currentPage: data?.pagination?.page || 1,
            totalPages: data?.pagination?.pages || 1,
            onPageChange: setPage,
          }}
        />
      </div>

      {canManage && (
        <Modal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title={t('upload_document')}
          size="md"
        >
          <DocumentUpload
            onSuccess={() => {
              setIsModalOpen(false);
              queryClient.invalidateQueries({ queryKey: ['documents'] });
            }}
            onCancel={() => setIsModalOpen(false)}
          />
        </Modal>
      )}
    </div>
  );
};

export default Documents;