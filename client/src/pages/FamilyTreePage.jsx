import React, { useState, useMemo, useRef, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getFamilies, getFamilyTreeByFamily } from '../api/families';
import { motion } from 'framer-motion';
import {
  ArrowsPointingInIcon,
  ArrowsPointingOutIcon,
  DocumentArrowDownIcon,
  DocumentIcon,
  HomeIcon,
  MagnifyingGlassIcon,
  MinusIcon,
  PhotoIcon,
  PlusIcon,
  PrinterIcon,
  UserGroupIcon,
  UserIcon,
} from '@heroicons/react/24/outline';
import * as XLSX from 'xlsx';
import html2canvas from 'html2canvas-pro';
import jsPDF from 'jspdf';
import Modal from '../components/Modal';
import Button from '../components/Button';
import TreeChart from '../components/tree/TreeChart';
import MemberProfileModal from '../components/tree/MemberProfileModal';
import { collectParentIds } from '../utils/treeLayout';
import { getRelationLabel, getSpouseLabel } from '../utils/treeLabels';
import toast from 'react-hot-toast';
import { useLanguage } from '../context/LanguageContext';

const CARD_WIDTH = 192; // w-48
const MAX_CANVAS_SIDE = 16000;

// Without photos the tree is drawn like a page of the printed vanshawali:
// names only, arrows down to the children, the generation number beside each row.
const BOOK = { cardWidth: 92, linkWidth: 14, siblingGap: 10, rootGap: 40 };

const toNepaliDigits = (value) => String(value).replace(/[0-9]/g, (digit) => '०१२३४५६७८९'[digit]);

// The generation number of a row: the one most of its people carry
const generationOfRow = (row) => {
  const counts = {};
  row.forEach((box) => {
    const generation = box.node.generation;
    if (generation) counts[generation] = (counts[generation] || 0) + 1;
  });
  const [generation] = Object.entries(counts).sort((a, b) => b[1] - a[1])[0] || [];
  return generation ? toNepaliDigits(generation) : '';
};

const BookName = ({ member, isSpouse, onClick }) => {
  const { t } = useLanguage();
  const isPlaceholder = member.isPlaceholder === true;
  return (
    <div
      role={isPlaceholder ? undefined : 'button'}
      onClick={isPlaceholder ? undefined : onClick}
      title={member.memberNumber ? `${member.name} (${member.memberNumber})` : member.name}
      className={`
        book-name w-full px-0.5 text-center text-[13px] leading-5 break-words
        ${isSpouse ? 'text-gray-600' : 'font-semibold text-gray-900'}
        ${isPlaceholder ? 'italic cursor-default' : 'cursor-pointer hover:underline'}
      `}
    >
      {member.name || t('ft_unknown_name')}
    </div>
  );
};

const TreeMemberCard = ({ member, isSpouse, showPhotos, onClick }) => {
  const { t } = useLanguage();
  const [photoFailed, setPhotoFailed] = useState(false);

  const isDeceased = member.isAlive === false;
  const isPlaceholder = member.isPlaceholder === true;
  const relationship = member.lineageRole === 'lineage_head'
    ? t('ft_household_head')
    : getRelationLabel(member, t);
  const spouseLabel = getSpouseLabel(member, t);

  return (
    <div
      className={`
        h-full bg-white rounded-xl shadow-md hover:shadow-xl transition-all duration-300
        border-2 ${isDeceased ? 'border-slate-300' : isSpouse ? 'border-slate-300' : 'border-emerald-300'}
        ${isPlaceholder ? 'border-dashed cursor-default' : 'cursor-pointer'} w-48 hover:border-emerald-500
        ${isSpouse ? 'bg-slate-50' : ''}
      `}
      onClick={isPlaceholder ? undefined : onClick}
    >
      <div className="p-2.5">
        {/* Photo & Info */}
        <div className="flex items-start gap-2">
          <div className="flex-shrink-0">
            <div className={`
              w-12 h-12 rounded-full overflow-hidden border-2
              ${isDeceased ? 'border-slate-300' : isSpouse ? 'border-slate-300' : 'border-emerald-200'}
              bg-slate-100
            `}>
              {showPhotos && member.photo && !photoFailed ? (
                <img
                  src={member.photo}
                  alt={member.name}
                  className="w-full h-full object-cover"
                  onError={() => setPhotoFailed(true)}
                />
              ) : (
                <div className={`
                  w-full h-full flex items-center justify-center text-xl
                  ${isDeceased ? 'bg-slate-200' : isSpouse ? 'bg-slate-100' : 'bg-emerald-100 text-emerald-800'}
                `}>
                  <UserIcon className="h-5 w-5" />
                </div>
              )}
            </div>
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1 flex-wrap">
              {(!isSpouse || relationship !== t('ft_member')) && (
                <span className="text-[9px] bg-emerald-50 text-emerald-800 px-1.5 py-0.5 rounded-full truncate max-w-[60px]">
                  {relationship}
                </span>
              )}
              {isSpouse && relationship !== spouseLabel && (
                <span className="text-[9px] bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded-full">
                  {spouseLabel}
                </span>
              )}
              {isDeceased && <span className="text-[9px] text-red-500">✝</span>}
            </div>
            <p className="font-semibold text-xs text-gray-800 truncate mt-0.5" title={member.name}>
              {member.name || t('ft_unknown_name')}
            </p>
            {member.vanshaGenerationNumber && (
              <p className="text-[9px] text-slate-500">{t('ft_vansha')}: {member.vanshaGenerationNumber}</p>
            )}
          </div>
        </div>

        {/* Generation */}
        {member.generation && (
          <div className="mt-1.5 pt-1.5 border-t border-slate-100 text-[9px] text-slate-500">
            {t('ft_generation')}: {member.generation}
          </div>
        )}
      </div>
    </div>
  );
};

const FamilyTreePage = () => {
  const { t, language } = useLanguage();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFamily, setSelectedFamily] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [showPhotos, setShowPhotos] = useState(true);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [collapsedNodes, setCollapsedNodes] = useState(new Set());
  const [profileMemberId, setProfileMemberId] = useState(null);

  const treeRef = useRef(null);

  const { data: familiesData, isLoading: familiesLoading } = useQuery({
    queryKey: ['families'],
    queryFn: () => getFamilies({ limit: 1000 }),
  });

  const { data: treeData, isLoading: treeLoading } = useQuery({
    queryKey: ['familyTree', selectedFamily?._id],
    queryFn: () => getFamilyTreeByFamily(selectedFamily._id),
    enabled: !!selectedFamily,
  });

  const filteredFamilies = useMemo(() => {
    if (!familiesData?.data) return [];
    if (!searchTerm) return familiesData.data;

    const search = String(searchTerm ?? '').toLowerCase();
    return familiesData.data.filter(family =>
      String(family.familyName ?? '').toLowerCase().includes(search) ||
      String(family.familyNumber ?? '').toLowerCase().includes(search) ||
      String(family.vanshaGenerationNumber ?? '').toLowerCase().includes(search) ||
      String(family.clan ?? '').toLowerCase().includes(search)
    );
  }, [familiesData, searchTerm]);

  const getFamilyMemberCount = (familyId) =>
    familiesData?.data?.find(family => family._id === familyId)?.memberCount ?? 0;

  const handleFamilyClick = (family) => {
    setSelectedFamily(family);
    setCollapsedNodes(new Set());
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedFamily(null);
    setProfileMemberId(null);
  };

  const handleMemberClick = (member) => {
    if (member.isPlaceholder) return;
    setProfileMemberId(member._id);
  };

  const toggleNode = (nodeId) => {
    setCollapsedNodes(prev => {
      const newSet = new Set(prev);
      if (newSet.has(nodeId)) newSet.delete(nodeId);
      else newSet.add(nodeId);
      return newSet;
    });
  };

  const toggleAllNodes = () => {
    if (collapsedNodes.size > 0) {
      setCollapsedNodes(new Set());
    } else {
      setCollapsedNodes(new Set(collectParentIds(treeData?.data)));
    }
  };

  const handleZoomIn = () => setZoomLevel(prev => Math.min(prev + 0.1, 2.5));
  const handleZoomOut = () => setZoomLevel(prev => Math.max(prev - 0.1, 0.3));
  const handleResetZoom = () => setZoomLevel(1);

  const exportToExcel = () => {
    if (!treeData?.data) {
      toast.error(t('ft_no_data'));
      return;
    }

    setExporting(true);
    try {
      const toRow = (person, level, parent, spouseOf = '') => ({
        [t('ft_generation_col')]: person.generation || level + 1,
        [t('ft_name_col')]: person.name || '',
        [t('ft_relationship_col')]: person.relationship ? getRelationLabel(person, t) : (spouseOf ? getSpouseLabel(person, t) : t('ft_member')),
        [t('ft_spouse_col')]: spouseOf,
        [t('ft_vansha_col')]: person.vanshaGenerationNumber || '',
        [t('ft_family_number_col')]: person.familyNumber || selectedFamily?.familyNumber || '',
        [t('ft_dob_col')]: person.dobNepali || (person.dob ? new Date(person.dob).toLocaleDateString(language === 'ne' ? 'ne-NP' : 'en-US') : ''),
        [t('ft_alive_col')]: person.isAlive !== false ? t('ft_yes') : t('ft_no'),
        [t('ft_gender_col')]: person.gender === 'male' ? t('male') : person.gender === 'female' ? t('female') : t('de_other'),
        [t('ft_parent_col')]: parent || '',
      });

      const flattenTree = (nodes, level = 0, parent = '') => {
        let result = [];
        nodes.forEach(node => {
          const spouses = node.spouses || [];
          result.push(toRow(node, level, parent, spouses.map(s => s.name).join(', ')));
          spouses.forEach(spouse => result.push(toRow(spouse, level, '', node.name)));
          if (node.children && node.children.length > 0) {
            result = result.concat(flattenTree(node.children, level + 1, node.name));
          }
        });
        return result;
      };

      const data = flattenTree(treeData.data);
      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Family Tree');
      XLSX.writeFile(wb, `Family_Tree_${selectedFamily?.familyName || 'All'}_${new Date().toISOString().split('T')[0]}.xlsx`);
      toast.success(t('ft_excel_success'));
    } catch (error) {
      console.error('Export error:', error);
      toast.error(t('ft_excel_failed'));
    } finally {
      setExporting(false);
    }
  };

  const captureTree = async () => {
    const stage = document.createElement('div');
    stage.style.cssText = 'position:fixed;left:-100000px;top:0;padding:24px;background:#ffffff;';
    const copy = treeRef.current.cloneNode(true);
    copy.querySelectorAll('[data-tree-control]').forEach((control) => control.remove());
    stage.appendChild(copy);
    document.body.appendChild(stage);

    try {
      const longestSide = Math.max(stage.offsetWidth, stage.offsetHeight, 1);
      return await html2canvas(stage, {
        scale: Math.min(2, MAX_CANVAS_SIDE / longestSide),
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false,
      });
    } finally {
      stage.remove();
    }
  };

  const exportToPDF = async () => {
    if (!treeRef.current) {
      toast.error(t('ft_tree_not_ready'));
      return;
    }
    setExporting(true);
    try {
      const canvas = await captureTree();
      const imgData = canvas.toDataURL('image/jpeg', 0.92);
      const pdf = new jsPDF({
        orientation: canvas.width > canvas.height ? 'landscape' : 'portrait',
        unit: 'px', format: [canvas.width, canvas.height],
      });
      pdf.addImage(imgData, 'JPEG', 0, 0, canvas.width, canvas.height);
      pdf.save(`Family_Tree_${selectedFamily?.familyName || 'All'}_${new Date().toISOString().split('T')[0]}.pdf`);
      toast.success(t('ft_pdf_success'));
    } catch (error) {
      console.error('PDF export error:', error);
      toast.error(t('ft_pdf_failed'));
    } finally {
      setExporting(false);
    }
  };

  const exportToImage = async () => {
    if (!treeRef.current) {
      toast.error(t('ft_tree_not_ready'));
      return;
    }
    setExporting(true);
    try {
      const canvas = await captureTree();
      const link = document.createElement('a');
      link.download = `Family_Tree_${selectedFamily?.familyName || 'All'}_${new Date().toISOString().split('T')[0]}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
      toast.success(t('ft_image_success'));
    } catch (error) {
      console.error('Image export error:', error);
      toast.error(t('ft_image_failed'));
    } finally {
      setExporting(false);
    }
  };

  const handlePrint = useCallback(() => {
    if (!treeRef.current) {
      toast.error(t('ft_tree_not_ready'));
      return;
    }

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast.error(t('ft_allow_popups'));
      return;
    }

    const printable = treeRef.current.cloneNode(true);
    printable.querySelectorAll('[data-tree-control]').forEach((control) => control.remove());
    const familyName = selectedFamily?.familyName || t('ft_title');

    // A3 landscape minus margins is about 1500px wide at 96dpi
    const fitScale = Math.min(1, 1500 / Math.max(treeRef.current.offsetWidth, 1));

    const doc = printWindow.document;
    doc.open();
    const html = doc.createElement('html');
    const head = doc.createElement('head');
    const body = doc.createElement('body');
    html.appendChild(head);
    html.appendChild(body);
    doc.appendChild(html);
    doc.title = `${familyName} - ${t('ft_title')}`;

    document.querySelectorAll('style, link[rel="stylesheet"]').forEach((node) => {
      const clone = node.tagName === 'LINK' ? doc.createElement('link') : doc.createElement('style');
      if (clone.tagName === 'LINK') {
        clone.rel = 'stylesheet';
        clone.href = node.href;
      } else {
        clone.textContent = node.textContent;
      }
      head.appendChild(clone);
    });

    const printStyles = doc.createElement('style');
    printStyles.textContent = `
      @page { size: A3 landscape; margin: 10mm; }
      * { box-sizing: border-box; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
      body { font-family: system-ui, -apple-system, sans-serif; margin: 0; padding: 0; background: white; }
      body, body * { visibility: visible !important; }
      .tree-print-title { text-align: center; font-size: 20px; font-weight: bold; margin: 0 0 20px; color: #333; }
    `;
    head.appendChild(printStyles);

    const title = doc.createElement('div');
    title.className = 'tree-print-title';
    title.textContent = familyName;
    body.appendChild(title);

    const wrapper = doc.createElement('div');
    wrapper.style.zoom = String(fitScale);
    wrapper.appendChild(doc.importNode(printable, true));
    body.appendChild(wrapper);
    doc.close();

    printWindow.focus();

    setTimeout(() => {
      printWindow.print();
      setTimeout(() => printWindow.close(), 1000);
    }, 500);
  }, [selectedFamily, t]);

  const FamilyCard = ({ family }) => {
    const memberCount = getFamilyMemberCount(family._id);
    const isClosed = family.status === 'closed';

    return (
      <motion.div
        whileHover={{ y: -2 }}
        className={`dashboard-surface cursor-pointer p-4 ${isClosed ? 'bg-slate-50' : ''}`}
        onClick={() => handleFamilyClick(family)}
      >
        <div className="flex items-center gap-3">
          <div className={`flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl ${
            isClosed ? 'bg-slate-200 text-slate-600' : 'bg-emerald-50 text-emerald-800'
          }`}>
            {family.familyPhoto ? (
              <img src={family.familyPhoto} alt={family.familyName} className="h-full w-full object-cover" />
            ) : (
              <HomeIcon className="h-6 w-6" />
            )}
          </div>
          <div className="min-w-0">
            <h3 className="truncate font-bold text-slate-900">
              {family.familyName || t('ft_unnamed_family')}
            </h3>
            <p className="truncate text-sm text-slate-600">
              {t('ft_house_short')} {family.house?.houseNumber || 'N/A'} • {t('family_number')} {family.familyNumber}
            </p>
            {family.vanshaGenerationNumber && (
              <p className="mt-0.5 text-xs text-slate-500">
                {t('ft_vansha_col')}: {family.vanshaGenerationNumber}
              </p>
            )}
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-4 border-t border-slate-100 pt-3 text-sm text-slate-700">
          <span className="flex items-center gap-1.5">
            <UserIcon className={`h-4 w-4 ${isClosed ? 'text-slate-400' : 'text-emerald-800'}`} />
            {t('ft_members_count', { count: memberCount })}
          </span>
          {family.totalGenerations > 0 && (
            <span className="flex items-center gap-1.5">
              <UserGroupIcon className={`h-4 w-4 ${isClosed ? 'text-slate-400' : 'text-emerald-800'}`} />
              {t('ft_generations_count', { count: family.totalGenerations })}
            </span>
          )}
          {isClosed && (
            <span className="rounded-full bg-slate-200 px-2 py-0.5 text-xs font-medium text-slate-600">
              {t('ft_closed')}
            </span>
          )}
        </div>

        <div className="mt-3">
          <span className={`flex items-center gap-1 text-xs font-semibold ${isClosed ? 'text-slate-400' : 'text-emerald-800'}`}>
            <UserGroupIcon className="h-4 w-4" />
            {t('ft_view_tree')}
          </span>
        </div>
      </motion.div>
    );
  };


  if (familiesLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-800"></div>
      </div>
    );
  }

  return (
    <div className="space-y-5">

      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-900">
          <UserGroupIcon className="h-6 w-6 text-emerald-800" />
          {t('ft_title')}
        </h1>
        <p className="text-slate-600">{t('ft_subtitle')}</p>
      </div>


      <div className="relative max-w-md">
        <MagnifyingGlassIcon className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          placeholder={t('ft_search_placeholder')}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full rounded-xl border border-slate-300 py-2.5 pl-10 pr-4 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/15"
        />
      </div>


      {filteredFamilies.length === 0 ? (
        <div className="dashboard-surface py-12 text-center">
          <HomeIcon className="mx-auto mb-3 h-10 w-10 text-slate-300" />
          <p className="text-slate-600">{t('ft_no_families')}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredFamilies.map((family) => (
            <FamilyCard key={family._id} family={family} />
          ))}
        </div>
      )}

      <Modal
        isOpen={isModalOpen}
        onClose={profileMemberId ? () => setProfileMemberId(null) : handleCloseModal}
        title={selectedFamily?.familyName || t('ft_title')}
        size="xl"
      >
        {selectedFamily && (
          <div className="space-y-4">

            <div className="no-print flex flex-wrap items-center gap-3 rounded-xl bg-slate-50 p-3">

              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" onClick={exportToExcel} disabled={exporting}>
                  <DocumentArrowDownIcon className="mr-1.5 h-4 w-4 text-emerald-800" />
                  {t('ft_export_excel')}
                </Button>
                <Button variant="outline" size="sm" onClick={exportToPDF} disabled={exporting}>
                  <DocumentIcon className="mr-1.5 h-4 w-4 text-emerald-800" />
                  {t('ft_export_pdf')}
                </Button>
                <Button variant="outline" size="sm" onClick={exportToImage} disabled={exporting}>
                  <PhotoIcon className="mr-1.5 h-4 w-4 text-emerald-800" />
                  {t('ft_export_image')}
                </Button>
                <Button variant="primary" size="sm" onClick={handlePrint}>
                  <PrinterIcon className="mr-1.5 h-4 w-4" />
                  {t('ft_print')}
                </Button>
              </div>


              <div className="hidden h-6 w-px bg-slate-300 sm:block" />


              <label className="flex cursor-pointer items-center gap-2">
                <input
                  type="checkbox"
                  checked={showPhotos}
                  onChange={(e) => setShowPhotos(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-emerald-800 focus:ring-emerald-700"
                />
                <span className="text-xs text-slate-700" title={t('ft_photos_hint')}>{t('ft_photos')}</span>
              </label>


              <div className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white p-1">
                <button onClick={handleZoomOut} className="rounded p-1 hover:bg-slate-100" aria-label={t('ft_expand_all')}>
                  <MinusIcon className="h-3 w-3 text-slate-600" />
                </button>
                <span className="min-w-[40px] text-center text-xs text-slate-600">
                  {Math.round(zoomLevel * 100)}%
                </span>
                <button onClick={handleZoomIn} className="rounded p-1 hover:bg-slate-100" aria-label={t('ft_collapse_all')}>
                  <PlusIcon className="h-3 w-3 text-slate-600" />
                </button>
                <button onClick={handleResetZoom} className="ml-1 rounded p-1 hover:bg-slate-100" aria-label={t('reset')}>
                  <ArrowsPointingOutIcon className="h-3 w-3 text-slate-600" />
                </button>
              </div>


              <button
                onClick={toggleAllNodes}
                className="flex items-center gap-1 text-xs font-medium text-emerald-800 hover:text-emerald-900"
              >
                {collapsedNodes.size > 0 ? (
                  <><ArrowsPointingOutIcon className="h-4 w-4" /> {t('ft_expand_all')}</>
                ) : (
                  <><ArrowsPointingInIcon className="h-4 w-4" /> {t('ft_collapse_all')}</>
                )}
              </button>
            </div>


            <div
              className="min-h-[400px] max-h-[calc(70vh-5.5rem)] overflow-auto rounded-xl border border-slate-200 bg-white p-4"
            >
              {treeLoading ? (
                <div className="flex items-center justify-center h-64">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-800"></div>
                </div>
              ) : treeData?.data && treeData.data.length > 0 ? (
                <div className="w-max min-w-full p-4" style={{ zoom: zoomLevel }}>
                  {showPhotos ? (
                    <TreeChart
                      ref={treeRef}
                      className="mx-auto"
                      roots={treeData.data}
                      cardWidth={CARD_WIDTH}
                      collapsedIds={collapsedNodes}
                      onToggle={toggleNode}
                      renderCard={(member, { isSpouse }) => (
                        <TreeMemberCard
                          member={member}
                          isSpouse={isSpouse}
                          showPhotos={showPhotos}
                          onClick={() => handleMemberClick(member)}
                        />
                      )}
                    />
                  ) : (
                    <TreeChart
                      ref={treeRef}
                      className="mx-auto"
                      variant="book"
                      roots={treeData.data}
                      {...BOOK}
                      rowLabel={generationOfRow}
                      collapsedIds={collapsedNodes}
                      onToggle={toggleNode}
                      renderCard={(member, { isSpouse }) => (
                        <BookName
                          member={member}
                          isSpouse={isSpouse}
                          onClick={() => handleMemberClick(member)}
                        />
                      )}
                    />
                  )}
                </div>
              ) : (
                <div className="py-12 text-center">
                  <UserGroupIcon className="mx-auto mb-3 h-10 w-10 text-slate-300" />
                  <p className="text-slate-600">{t('ft_no_tree_data')}</p>
                  <p className="text-sm text-slate-400">{t('ft_add_members_hint')}</p>
                </div>
              )}
            </div>

            <MemberProfileModal memberId={profileMemberId} onClose={() => setProfileMemberId(null)} />
          </div>
        )}
      </Modal>


      <style>{`
        @media print {
          .no-print,
          header, nav, .sidebar, .toolbar,
          button, .modal-controls, .export-buttons,
          .family-info-bar, .controls-bar {
            display: none !important;
          }
          body * {
            visibility: hidden;
          }
          .tree-print-title,
          .tree-print-title *,
          .tree-content,
          .tree-content * {
            visibility: visible;
          }
        }
      `}</style>
    </div>
  );
};

export default FamilyTreePage;