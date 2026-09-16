/**
 * M01 XLSX TEMPLATE EXPORTER
 * ------------------------------------------------------------
 * Mục đích:
 * - Xuất Mẫu 01-A / 01-B trực tiếp từ template Excel chính thức.
 * - Giữ nguyên merge cell, font, độ rộng cột, chiều cao dòng, border,
 *   công thức và page setup của template.
 * - Không đọc thêm Firestore, không phát sinh quota Firebase.
 * - Không can thiệp logic KPI/scoring.
 *
 * Template:
 *   ../templates/mau-01A.xlsx
 *   ../templates/mau-01B.xlsx
 *
 * Excel engine:
 * - Chỉ tải khi người dùng bấm Xuất Excel Mẫu 01-A/01-B.
 * - Có 3 CDN dự phòng; không ảnh hưởng luồng ứng dụng nếu export không dùng.
 */

const EXPORTER_VERSION = '20260916.V1_24_7_HTXH_1';

const EXCELJS_URLS = Object.freeze([
  'https://cdn.jsdelivr.net/npm/exceljs@4.4.0/dist/exceljs.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/exceljs/4.4.0/exceljs.min.js',
  'https://unpkg.com/exceljs@4.4.0/dist/exceljs.min.js'
]);

const FORM_CONFIG = Object.freeze({
  '01A': Object.freeze({
    templateFile: 'mau-01A.xlsx',
    sheetName: 'MẪU TỰ ĐÁNH GIÁ LĐ, QL',
    totalARow: 35,
    bTotalRow: 38,
    bonusRow: 39,
    grandTotalRow: 40,
    proposalRow: 41,
    criterionRows: Object.freeze({
      '1.1': 16, '1.2': 17, '1.3': 18, '1.4': 19, '1.5': 20,
      '1.6': 21, '1.7': 22, '1.8': 23, '1.9': 24,
      '2.1': 26, '2.2': 27, '2.3': 28, '2.4': 29,
      '3.1': 31, '3.2': 32, '3.3': 33, '3.4': 34
    })
  }),
  '01B': Object.freeze({
    templateFile: 'mau-01B.xlsx',
    sheetName: 'MẪU TỰ ĐÁNH GIÁ CC, VC',
    totalARow: 34,
    bTotalRow: 37,
    bonusRow: 38,
    grandTotalRow: 39,
    proposalRow: 40,
    criterionRows: Object.freeze({
      '1.1': 16, '1.2': 17, '1.3': 18, '1.4': 19, '1.5': 20,
      '1.6': 21, '1.7': 22, '1.8': 23, '1.9': 24,
      '2.1': 26, '2.2': 27, '2.3': 28,
      '3.1': 30, '3.2': 31, '3.3': 32, '3.4': 33
    })
  })
});

let excelJsPromise = null;

function clean(value) {
  return String(value ?? '').trim();
}

function numberOrBlank(value) {
  if (value === '' || value === null || value === undefined) return '';
  const number = Number(value);
  return Number.isFinite(number) ? number : '';
}

function safeFileName(value) {
  return String(value || 'Mau_01.xlsx')
    .replace(/[\\/:*?"<>|]+/g, '_')
    .replace(/\s+/g, '_')
    .replace(/_+/g, '_');
}

function loadScript(url) {
  return new Promise((resolve, reject) => {
    const existing = Array.from(document.scripts).find(script => script.src === url);
    if (existing?.dataset.loaded === 'true') {
      resolve();
      return;
    }

    const script = existing || document.createElement('script');
    script.src = url;
    script.async = true;
    script.crossOrigin = 'anonymous';

    const cleanup = () => {
      script.removeEventListener('load', onLoad);
      script.removeEventListener('error', onError);
    };
    const onLoad = () => {
      script.dataset.loaded = 'true';
      cleanup();
      resolve();
    };
    const onError = () => {
      cleanup();
      if (!existing) script.remove();
      reject(new Error(`Không tải được ExcelJS từ ${url}`));
    };

    script.addEventListener('load', onLoad, { once: true });
    script.addEventListener('error', onError, { once: true });
    if (!existing) document.head.appendChild(script);
  });
}

async function ensureExcelJs() {
  if (window.ExcelJS?.Workbook) return window.ExcelJS;
  if (excelJsPromise) return excelJsPromise;

  excelJsPromise = (async () => {
    let lastError = null;
    for (const url of EXCELJS_URLS) {
      try {
        await loadScript(url);
        if (window.ExcelJS?.Workbook) return window.ExcelJS;
      } catch (error) {
        lastError = error;
        console.warn('ExcelJS CDN fallback:', error);
      }
    }
    throw lastError || new Error('Không thể tải thư viện ExcelJS.');
  })();

  try {
    return await excelJsPromise;
  } catch (error) {
    excelJsPromise = null;
    throw error;
  }
}

async function fetchTemplate(config) {
  const url = new URL(`../templates/${config.templateFile}`, import.meta.url);
  url.searchParams.set('v', EXPORTER_VERSION);

  const response = await fetch(url.toString(), { cache: 'no-store' });
  if (!response.ok) {
    throw new Error(`Không tải được template ${config.templateFile} (${response.status}).`);
  }
  const bytes = new Uint8Array(await response.arrayBuffer());
  if (bytes.length < 4 || bytes[0] !== 0x50 || bytes[1] !== 0x4b || bytes[2] !== 0x03 || bytes[3] !== 0x04) {
    throw new Error(`Template ${config.templateFile} không phải tệp XLSX (ZIP) hợp lệ.`);
  }
  return bytes;
}

function setCellValue(sheet, address, value) {
  sheet.getCell(address).value = value === null || value === undefined ? '' : value;
}

function setScoreCell(sheet, address, value) {
  const cell = sheet.getCell(address);
  const normalized = numberOrBlank(value);
  cell.value = normalized === '' ? null : normalized;
}

function styleBonusValueCell(sheet, address) {
  const cell = sheet.getCell(address);
  cell.alignment = {
    ...(cell.alignment || {}),
    horizontal: 'center',
    vertical: 'middle',
    wrapText: true
  };
  cell.font = {
    ...(cell.font || {}),
    name: cell.font?.name || 'Times New Roman',
    bold: true
  };
}

function downloadWorkbook(buffer, fileName) {
  const blob = new Blob(
    [buffer],
    { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }
  );
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = safeFileName(fileName);
  anchor.style.display = 'none';
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1500);
}

export async function exportM01TemplateWorkbook({
  formType = '01B',
  fileName = '',
  organizationName = 'TRUNG TÂM HỖ TRỢ XÃ HỘI',
  quarterText = '',
  reportDateLine = '',
  profile = {},
  criteriaScores = [],
  selfCommonTotal = 0,
  confirmedCommonTotal = '',
  kpiScore = '',
  bonusScore = 0,
  bonusPending = false,
  totalScore = '',
  rating = ''
} = {}) {
  const normalizedForm = clean(formType).toUpperCase() === '01A' ? '01A' : '01B';
  const config = FORM_CONFIG[normalizedForm];

  const ExcelJS = await ensureExcelJs();
  const templateBuffer = await fetchTemplate(config);

  const workbook = new ExcelJS.Workbook();
  try {
    await workbook.xlsx.load(templateBuffer);
  } catch (error) {
    console.error('[HTXH M01] Không đọc được template Excel:', config.templateFile, error);
    throw new Error(`Không đọc được Mẫu ${normalizedForm}. Kiểm tra cấu trúc XLSX: ${error?.message || error}`);
  }

  const sheet = workbook.getWorksheet(config.sheetName) || workbook.worksheets[0];
  if (!sheet) {
    throw new Error(`Template ${normalizedForm} không có worksheet hợp lệ.`);
  }

  workbook.creator = 'Trung tâm Hỗ trợ xã hội';
  workbook.lastModifiedBy = 'Nhiệm vụ và đánh giá KPI';
  workbook.subject = `Bản tự đánh giá ${normalizedForm}`;
  workbook.title = `Bản tự đánh giá, xếp loại của cá nhân - Mẫu ${normalizedForm}`;
  workbook.description = 'Xuất từ hệ thống Nhiệm vụ và đánh giá KPI';
  workbook.company = 'Trung tâm Hỗ trợ xã hội';

  // Bắt Excel tính lại các công thức tổng khi mở tệp.
  workbook.calcProperties = workbook.calcProperties || {};
  workbook.calcProperties.calcMode = 'auto';
  workbook.calcProperties.fullCalcOnLoad = true;
  workbook.calcProperties.forceFullCalc = true;

  // Header / thông tin cá nhân.
  setCellValue(
    sheet,
    'A2',
    `SỞ Y TẾ\nTHÀNH PHỐ HỒ CHÍ MINH\n${clean(organizationName) || 'TRUNG TÂM HỖ TRỢ XÃ HỘI'}`
  );
  setCellValue(sheet, 'E3', reportDateLine);
  setCellValue(sheet, 'A5', quarterText);

  setCellValue(
    sheet,
    'B6',
    `Họ và tên: ${clean(profile.fullName)}`
      + `    Ngày sinh: ${clean(profile.birthDate)}`
  );
  setCellValue(sheet, 'B7', `Chức vụ Đảng: ${clean(profile.partyPosition)}`);
  setCellValue(sheet, 'B8', `Chức vụ chính quyền: ${clean(profile.governmentPosition)}`);
  setCellValue(sheet, 'B9', `Chức vụ đoàn thể: ${clean(profile.unionPosition)}`);
  setCellValue(sheet, 'B10', `Đơn vị công tác: ${clean(profile.departmentName)}`);

  // Xóa dữ liệu mẫu mặc định trong các ô người dùng tự chấm / lãnh đạo chấm / ghi chú.
  Object.values(config.criterionRows).forEach(row => {
    setCellValue(sheet, `F${row}`, '');
    setCellValue(sheet, `G${row}`, '');
    setCellValue(sheet, `H${row}`, '');
  });

  const scoreByCode = new Map(
    (criteriaScores || [])
      .filter(item => clean(item?.code))
      .map(item => [clean(item.code), item])
  );

  Object.entries(config.criterionRows).forEach(([code, row]) => {
    const item = scoreByCode.get(code) || {};
    setScoreCell(sheet, `F${row}`, item.selfScore);
    setScoreCell(sheet, `G${row}`, item.confirmedScore);
    setCellValue(sheet, `H${row}`, clean(item.note));
  });

  // Tổng A.
  if (normalizedForm === '01A') {
    // Template 01-A dùng tổng A tĩnh ở F35/G35.
    setScoreCell(sheet, `F${config.totalARow}`, selfCommonTotal);
  }
  setScoreCell(sheet, `G${config.totalARow}`, confirmedCommonTotal);

  // B = KPI 70.
  if (kpiScore === '' || kpiScore === null || kpiScore === undefined) {
    setCellValue(sheet, `G${config.bTotalRow}`, 'Chưa đủ cơ sở tính');
  } else {
    setScoreCell(sheet, `G${config.bTotalRow}`, kpiScore);
  }

  // C = điểm thưởng.
  // Template chuẩn không có một dòng TOTAL(C) riêng.
  // Giữ nguyên layout; sử dụng ô H tại dòng C để hiển thị giá trị thưởng.
  const bonusValue = numberOrBlank(bonusScore);
  if (bonusValue !== '') {
    setScoreCell(sheet, `H${config.bonusRow}`, bonusValue);
    styleBonusValueCell(sheet, `H${config.bonusRow}`);
  } else {
    setCellValue(sheet, `H${config.bonusRow}`, '');
  }
  if (bonusPending) {
    const current = clean(sheet.getCell(`H${config.bonusRow}`).value);
    setCellValue(
      sheet,
      `H${config.bonusRow}`,
      current ? `${current} (đã xác nhận); còn đề nghị chưa duyệt` : 'Điểm thưởng đề nghị chưa xác nhận'
    );
  }

  // Tổng A+B+C: template gốc có công thức F40/F39 chỉ A+B nên khắc phục
  // nhất quán với chỉ số chính thức trong snapshot; không cộng bonus PENDING.
  // Không tự tạo điểm khi chưa có cơ sở tính KPI.
  if (totalScore === '' || totalScore === null || totalScore === undefined) {
    setCellValue(sheet, `G${config.grandTotalRow}`, '');
    setCellValue(sheet, `F${config.grandTotalRow}`, '');
  } else {
    setScoreCell(sheet, `G${config.grandTotalRow}`, totalScore);
    // Ô F là cột tự đánh giá trong template; không được giữ công thức A+B sai nhãn A+B+C.
    setCellValue(sheet, `F${config.grandTotalRow}`, '');
  }
  sheet.pageSetup = {
    ...(sheet.pageSetup || {}),
    paperSize: 9, orientation: 'portrait', fitToPage: true, fitToWidth: 1, fitToHeight: 0
  };

  // Tự đề xuất xếp loại.
  setCellValue(
    sheet,
    `B${config.proposalRow}`,
    `II. Tự đề xuất xếp loại mức chất lượng: ${clean(rating)}`
  );

  const buffer = await workbook.xlsx.writeBuffer();
  const finalName = fileName
    || `Mau_${normalizedForm}_${clean(profile.fullName) || 'ca_nhan'}.xlsx`;

  downloadWorkbook(buffer, finalName);

  return {
    ok: true,
    formType: normalizedForm,
    fileName: safeFileName(finalName),
    sheetName: sheet.name
  };
}
