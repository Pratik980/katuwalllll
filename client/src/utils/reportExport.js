import * as XLSX from 'xlsx';

const isRecord = (value) => value && typeof value === 'object' && !Array.isArray(value);

const valueToString = (value) => {
  if (value === undefined || value === null) return '';
  if (value instanceof Date) return value.toLocaleDateString();
  if (Array.isArray(value)) return value.map(valueToString).filter(Boolean).join(', ');
  if (isRecord(value)) return value.name || value.familyName || value.title || '';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  return String(value);
};

const cleanRow = (row) => {
  const clean = {};
  Object.entries(row || {}).forEach(([key, value]) => {
    if (key === 'Verification') return;
    clean[key] = valueToString(value);
  });
  return clean;
};

const recordExists = (row) => Object.values(row || {}).some((value) => value !== '' && value !== null && value !== undefined);

export const normalizeReportRows = (payload, reportId = '') => {
  if (Array.isArray(payload)) return payload.map(cleanRow).filter(recordExists);

  if (!isRecord(payload)) return [];

  if (Array.isArray(payload.data)) return payload.data.map(cleanRow).filter(recordExists);

  if (Array.isArray(payload.Members)) return payload.Members.map(cleanRow).filter(recordExists);

  const sections = Object.entries(payload).filter(([, value]) => Array.isArray(value));
  if (sections.length === 0) return [];

  if (reportId === 'demographic' || sections.length > 1) {
    return sections
      .flatMap(([category, rows]) => rows.map((row) => ({ Category: category, Group: row.Group ?? row._id ?? '', Count: row.count ?? '' })))
      .map(cleanRow);
  }

  return sections[0][1].map(cleanRow).filter(recordExists);
};

export const reportFilename = (reportId, familyName = '', extension = 'xlsx') => {
  const base = [reportId, familyName].filter(Boolean).join('-');
  const slug = String(base)
    .trim()
    .replace(/[^\p{L}\p{M}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/g, '') || 'report';
  return `${slug}-${new Date().toISOString().split('T')[0]}.${extension}`;
};

const collectColumns = (rows, includePhotos = false) => {
  const columns = [];
  rows.forEach((row) => {
    Object.keys(row || {}).forEach((key) => {
      if (key === 'Photo' || columns.includes(key)) return;
      columns.push(key);
    });
  });
  if (includePhotos && rows.some((row) => row.Photo)) columns.unshift('Photo');
  return columns.length ? columns : ['No records'];
};

const safeSheetName = (title) => String(title || 'Report').replace(/[:\\/?*[\]]/g, ' ').slice(0, 31) || 'Report';

export const downloadReportExcel = async ({ title = 'Report', rows = [], filename }) => {
  const columns = collectColumns(rows, false);
  const plainRows = rows.map((row) => {
    const next = {};
    columns.forEach((column) => { next[column] = valueToString(row[column]); });
    return next;
  });

  const worksheet = XLSX.utils.json_to_sheet(plainRows, { header: columns });
  worksheet['!cols'] = columns.map((column) => {
    const longest = plainRows.reduce((max, row) => Math.max(max, String(row[column] || '').length), column.length);
    return { wch: Math.min(Math.max(longest + 2, 12), 42) };
  });
  if (plainRows.length) {
    worksheet['!autofilter'] = {
      ref: XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: plainRows.length, c: columns.length - 1 } }),
    };
  }

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, safeSheetName(title));
  XLSX.writeFile(workbook, filename || reportFilename(title));
};

const createPageNode = ({ title, subtitle, columns, rows, includePhotos }) => {
  const root = document.createElement('div');
  Object.assign(root.style, {
    position: 'fixed',
    left: '-10000px',
    top: '0',
    width: '900px',
    padding: '28px 32px',
    boxSizing: 'border-box',
    background: '#ffffff',
    color: '#111827',
    fontFamily: '"Noto Sans Devanagari", Inter, system-ui, sans-serif',
  });

  const heading = document.createElement('h1');
  heading.textContent = title;
  Object.assign(heading.style, { fontSize: '22px', margin: '0 0 4px', fontWeight: '700' });
  root.appendChild(heading);

  if (subtitle) {
    const note = document.createElement('p');
    note.textContent = subtitle;
    Object.assign(note.style, { fontSize: '11px', color: '#4b5563', margin: '0 0 16px' });
    root.appendChild(note);
  }

  const table = document.createElement('table');
  Object.assign(table.style, { width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed', fontSize: '10px' });

  const head = document.createElement('thead');
  const headRow = document.createElement('tr');
  columns.forEach((column) => {
    const cell = document.createElement('th');
    cell.textContent = column;
    Object.assign(cell.style, {
      border: '1px solid #d1d5db',
      background: '#f3f4f6',
      padding: '6px',
      textAlign: 'left',
      wordBreak: 'break-word',
    });
    headRow.appendChild(cell);
  });
  head.appendChild(headRow);
  table.appendChild(head);

  const body = document.createElement('tbody');
  rows.forEach((row) => {
    const tr = document.createElement('tr');
    columns.forEach((column) => {
      const cell = document.createElement('td');
      Object.assign(cell.style, { border: '1px solid #e5e7eb', padding: '5px', verticalAlign: 'top', wordBreak: 'break-word' });
      if (includePhotos && column === 'Photo' && row.Photo) {
        const image = document.createElement('img');
        image.src = row.Photo;
        image.crossOrigin = 'anonymous';
        Object.assign(image.style, { width: '48px', height: '48px', objectFit: 'cover', borderRadius: '4px' });
        cell.appendChild(image);
      } else {
        cell.textContent = valueToString(row[column]);
      }
      tr.appendChild(cell);
    });
    body.appendChild(tr);
  });
  table.appendChild(body);
  root.appendChild(table);
  return root;
};

const waitForImages = async (node) => {
  const images = Array.from(node.querySelectorAll('img'));
  await Promise.all(images.map((image) => new Promise((resolve) => {
    if (image.complete && image.naturalWidth) return resolve();
    const done = () => resolve();
    image.addEventListener('load', done, { once: true });
    image.addEventListener('error', done, { once: true });
    setTimeout(done, 1500);
  })));
};

export const downloadReportPdf = async ({ title = 'Report', subtitle = '', rows = [], filename, includePhotos = false }) => {
  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
    import('html2canvas-pro'),
    import('jspdf'),
  ]);

  const columns = collectColumns(rows, includePhotos);
  const pageWidth = 900;
  const margin = 12;
  const contentWidth = 210 - margin * 2;
  const contentHeight = 297 - margin * 2;
  const scaleMmPerPx = contentWidth / pageWidth;
  const availablePx = contentHeight / scaleMmPerPx;

  const measureNode = createPageNode({ title, subtitle, columns, rows, includePhotos });
  document.body.appendChild(measureNode);
  const rowHeights = Array.from(measureNode.querySelectorAll('tbody tr')).map((row) => row.getBoundingClientRect().height + 2);
  const chromeHeight = measureNode.getBoundingClientRect().height - rowHeights.reduce((sum, height) => sum + height, 0);
  document.body.removeChild(measureNode);

  const usableHeight = Math.max(availablePx - chromeHeight, 320);
  const groups = [];
  let group = [];
  let height = 0;
  rows.forEach((row, index) => {
    const rowHeight = rowHeights[index] || 24;
    if (group.length && height + rowHeight > usableHeight) {
      groups.push(group);
      group = [];
      height = 0;
    }
    group.push(row);
    height += rowHeight;
  });
  if (group.length || groups.length === 0) groups.push(group);

  const pdf = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });

  for (let index = 0; index < groups.length; index += 1) {
    if (index > 0) pdf.addPage();
    const node = createPageNode({ title, subtitle, columns, rows: groups[index], includePhotos });
    document.body.appendChild(node);
    await waitForImages(node);
    const canvas = await html2canvas(node, {
      scale: 2,
      backgroundColor: '#ffffff',
      useCORS: true,
      scrollX: 0,
      scrollY: 0,
      windowWidth: pageWidth,
      windowHeight: node.scrollHeight,
    });
    document.body.removeChild(node);

    const ratio = Math.min(contentWidth / canvas.width, contentHeight / canvas.height);
    const width = canvas.width * ratio;
    const height = canvas.height * ratio;
    pdf.addImage(canvas.toDataURL('image/jpeg', 0.95), 'JPEG', margin + (contentWidth - width) / 2, margin, width, height);
    pdf.setFontSize(8);
    pdf.text(`${index + 1} / ${groups.length}`, 210 - margin, 297 - 5, { align: 'right' });
  }

  pdf.save(filename || reportFilename(title, '', 'pdf'));
};
