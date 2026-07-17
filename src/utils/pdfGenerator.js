import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { hasFilledTable } from './graphUtils';

const escapeHtml = (value) => String(value ?? '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;');

const buildTableHtml = (table) => {
  if (!hasFilledTable(table)) return '';
  const header = table.columns.map((column) => `<th>${escapeHtml(column)}</th>`).join('');
  const rows = table.rows
    .filter((row) => row.some((cell) => String(cell || '').trim()))
    .map((row) => `<tr>${table.columns.map((_, index) => `<td>${escapeHtml(row[index])}</td>`).join('')}</tr>`)
    .join('');

  return `<h3>${escapeHtml(table.tableName || 'Observation Table')}</h3><table><thead><tr>${header}</tr></thead><tbody>${rows}</tbody></table>`;
};

const buildImagesHtml = (images = []) => {
  if (!images.length) return '';
  return `<h3>Captured Signal Images</h3>${images.map((image) => `<div class="image-block"><p>${escapeHtml(image.caption || 'Captured signal')}</p><img src="${image.uri}" /></div>`).join('')}`;
};

const buildGraphHtml = (graph) => {
  if (!graph?.generated) return '';
  return `<h3>Graph</h3><p><strong>Type:</strong> ${escapeHtml(graph.graphType)} | <strong>X-Axis:</strong> ${escapeHtml(graph.xAxis)} | <strong>Y-Axis:</strong> ${escapeHtml(graph.yAxis)}</p>`;
};

export const buildPdfHtml = ({ user, product, experiment, draft }) => {
  const userRows = user?.userType === 'student'
    ? ['fullName', 'mobile', 'email', 'collegeName', 'course', 'rollNumber', 'semesterYear']
    : ['fullName', 'mobile', 'email'];
  const labels = {
    fullName: user?.userType === 'student' ? 'Student Name' : 'Guest Name',
    mobile: 'Mobile Number',
    email: 'Email ID',
    collegeName: 'College Name',
    course: 'Course',
    rollNumber: 'Roll Number',
    semesterYear: 'Semester / Year',
  };

  return `
    <html>
      <head>
        <style>
          body { font-family: Arial; padding: 24px; color: #152238; }
          h1 { color: #0B5CAD; }
          table { border-collapse: collapse; width: 100%; margin-top: 8px; }
          th, td { border: 1px solid #D9E2EC; padding: 8px; text-align: left; }
          th { background: #EAF2FB; }
          img { max-width: 100%; margin-top: 8px; border: 1px solid #D9E2EC; }
          .image-block { margin-bottom: 16px; }
        </style>
      </head>
      <body>
        <h1>Akademika Learning Workbook</h1>
        <h2>${escapeHtml(experiment.title)}</h2>
        <p><strong>Product:</strong> ${escapeHtml(product.name)}</p>
        <h3>User Details</h3>
        ${userRows.map((key) => `<p><strong>${labels[key]}:</strong> ${escapeHtml(user?.[key])}</p>`).join('')}
        <h3>Objective</h3><p>${escapeHtml(experiment.sections.objective)}</p>
        <h3>Theory</h3><p>${escapeHtml(experiment.sections.theory)}</p>
        ${buildImagesHtml(draft.capturedImages)}
        ${buildTableHtml(draft.table)}
        ${buildGraphHtml(draft.graph)}
        <h3>Observation</h3><p>${escapeHtml(draft.observation)}</p>
        <h3>Result / Conclusion</h3><p>${escapeHtml(draft.result)}</p>
      </body>
    </html>
  `;
};

export const generateWorkbookPdf = async (payload) => {
  const result = await Print.printToFileAsync({ html: buildPdfHtml(payload) });
  return result.uri;
};

export const sharePdf = async (uri) => {
  if (uri && await Sharing.isAvailableAsync()) await Sharing.shareAsync(uri);
};
