import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

/**
 * Enhanced Excel Export Class
 * Menggabungkan fitur terbaik dari kedua implementasi sebelumnya
 */
class ExcelExport {
  constructor() {
    this.workbook = null;
  }

  /**
   * Reset workbook untuk menghindari konflik
   */
  resetWorkbook() {
    this.workbook = new ExcelJS.Workbook();
    this.workbook.creator = 'Work Sessions Dashboard';
    this.workbook.lastModifiedBy = 'System';
    this.workbook.created = new Date();
    this.workbook.modified = new Date();
  }

  /**
   * Format waktu dari detik ke HH:MM:SS
   */
  formatTime(seconds) {
    if (!seconds || seconds === 0) return '00:00:00';
    const h = Math.floor(seconds / 3600).toString().padStart(2, '0');
    const m = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${h}:${m}:${s}`;
  }

  /**
   * Format waktu langkah ke MM:SS
   */
  formatStepTime(seconds) {
    if (!seconds || seconds === 0) return '00:00';
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  }

  /**
   * Mendapatkan nama bulan dalam Bahasa Indonesia
   */
  getMonthName(monthNumber) {
    const months = [
      'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ];
    return months[monthNumber - 1] || 'Invalid Month';
  }

  /**
   * Mendapatkan nama status dalam Bahasa Indonesia
   */
  getStatusName(status) {
    const statusNames = {
      'pending': 'Menunggu Persetujuan',
      'approved': 'Disetujui',
      'rejected': 'Ditolak'
    };
    return statusNames[status] || 'Menunggu Persetujuan';
  }

  /**
   * Mendapatkan nama status langkah dalam Bahasa Indonesia
   */
  getStepStatusName(status) {
    const stepStatusNames = {
      'completed': 'Selesai',
      'skipped': 'Dilewati',
      'pending': 'Menunggu'
    };
    return stepStatusNames[status] || 'Menunggu';
  }

  /**
   * Menghitung statistik lengkap
   */
  getComprehensiveStats(data) {
    const totalSessions = data.length;
    
    // Status statistics
    const approvedSessions = data.filter(s => s.status === 'approved').length;
    const rejectedSessions = data.filter(s => s.status === 'rejected').length;
    const pendingSessions = data.filter(s => s.status === 'pending' || !s.status).length;

    // Step statistics
    const totalSteps = data.reduce((acc, session) => acc + session.stepTimes.length, 0);
    const completedSteps = data.reduce((acc, session) => 
      acc + session.stepTimes.filter(step => step.status === 'completed').length, 0
    );
    const skippedSteps = data.reduce((acc, session) => 
      acc + session.stepTimes.filter(step => step.status === 'skipped').length, 0
    );
    const pendingSteps = totalSteps - completedSteps - skippedSteps;

    // Efficiency statistics
    const sessionsWithTarget = data.filter(s => s.hasTargetTime).length;
    const efficientSessions = data.filter(s => s.isEfficient && s.hasTargetTime).length;

    // Time statistics
    const totalTime = data.reduce((acc, s) => acc + s.totalTime, 0);
    const avgActualTime = totalSessions > 0 ? totalTime / totalSessions : 0;
    const avgTargetTime = sessionsWithTarget > 0 ? 
      data.filter(s => s.hasTargetTime).reduce((acc, s) => acc + s.targetTime, 0) / sessionsWithTarget : 0;

    return {
      // Session stats
      totalSessions,
      approvedSessions,
      rejectedSessions,
      pendingSessions,
      approvalRate: totalSessions > 0 ? (approvedSessions / totalSessions * 100) : 0,
      
      // Step stats
      totalSteps,
      completedSteps,
      skippedSteps,
      pendingSteps,
      completionRate: totalSteps > 0 ? (completedSteps / totalSteps * 100) : 0,
      
      // Efficiency stats
      sessionsWithTarget,
      efficientSessions,
      efficiencyRate: sessionsWithTarget > 0 ? (efficientSessions / sessionsWithTarget * 100) : 0,
      
      // Time stats
      totalTime,
      avgActualTime,
      avgTargetTime
    };
  }

  /**
   * Membuat worksheet ringkasan yang komprehensif
   */
  createSummarySheet(data, bulan, tahun, selectedUser, selectedStatus) {
    const worksheet = this.workbook.addWorksheet('Ringkasan');
    const stats = this.getComprehensiveStats(data);

    // Header utama
    worksheet.mergeCells('A1:G2');
    const titleCell = worksheet.getCell('A1');
    titleCell.value = 'LAPORAN WORK SESSIONS';
    titleCell.font = { bold: true, size: 18, color: { argb: 'FFFFFF' } };
    titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
    titleCell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: '667EEA' }
    };

    // Informasi filter dan periode
    let row = 4;
    const filterInfo = [
      ['Periode Export', new Date().toLocaleString('id-ID')],
      ['Filter Bulan', bulan ? this.getMonthName(bulan) : 'Semua Bulan'],
      ['Filter Tahun', tahun || 'Semua Tahun'],
      ['Filter User', selectedUser || 'Semua User'],
      ['Filter Status', selectedStatus ? this.getStatusName(selectedStatus) : 'Semua Status']
    ];

    filterInfo.forEach(([label, value]) => {
      worksheet.getCell(`A${row}`).value = label;
      worksheet.getCell(`B${row}`).value = value;
      worksheet.getCell(`A${row}`).font = { bold: true };
      row++;
    });

    // Statistik umum
    row += 2;
    worksheet.getCell(`A${row}`).value = 'STATISTIK UMUM';
    worksheet.getCell(`A${row}`).font = { bold: true, size: 14, color: { argb: '1F2937' } };
    row++;

    const generalStats = [
      ['Total Work Sessions', stats.totalSessions],
      ['Total Langkah', stats.totalSteps],
      ['Langkah Selesai', `${stats.completedSteps} (${stats.completionRate.toFixed(1)}%)`],
      ['Langkah Dilewati', `${stats.skippedSteps} (${((stats.skippedSteps / stats.totalSteps) * 100).toFixed(1)}%)`],
      ['Langkah Pending', `${stats.pendingSteps} (${((stats.pendingSteps / stats.totalSteps) * 100).toFixed(1)}%)`]
    ];

    this.addStatsRows(worksheet, generalStats, row);
    row += generalStats.length + 1;

    // Statistik status approval
    worksheet.getCell(`A${row}`).value = 'STATISTIK STATUS APPROVAL';
    worksheet.getCell(`A${row}`).font = { bold: true, size: 14, color: { argb: '1F2937' } };
    row++;

    const statusStats = [
      ['Sessions Disetujui', `${stats.approvedSessions} (${stats.approvalRate.toFixed(1)}%)`],
      ['Sessions Ditolak', `${stats.rejectedSessions} (${((stats.rejectedSessions / stats.totalSessions) * 100).toFixed(1)}%)`],
      ['Sessions Menunggu', `${stats.pendingSessions} (${((stats.pendingSessions / stats.totalSessions) * 100).toFixed(1)}%)`]
    ];

    this.addStatsRows(worksheet, statusStats, row);
    row += statusStats.length + 1;

    // Statistik efisiensi
    worksheet.getCell(`A${row}`).value = 'STATISTIK EFISIENSI';
    worksheet.getCell(`A${row}`).font = { bold: true, size: 14, color: { argb: '1F2937' } };
    row++;

    const efficiencyStats = [
      ['Sessions dengan Target Waktu', stats.sessionsWithTarget],
      ['Sessions Efisien', `${stats.efficientSessions} (${stats.efficiencyRate.toFixed(1)}%)`],
      ['Rata-rata Waktu Aktual', this.formatTime(stats.avgActualTime)],
      ['Rata-rata Waktu Target', stats.avgTargetTime > 0 ? this.formatTime(stats.avgTargetTime) : 'N/A'],
      ['Total Waktu Keseluruhan', this.formatTime(stats.totalTime)]
    ];

    this.addStatsRows(worksheet, efficiencyStats, row);

    // Set column widths
    worksheet.columns = [
      { width: 30 },
      { width: 25 },
      { width: 15 },
      { width: 15 },
      { width: 15 },
      { width: 15 },
      { width: 15 }
    ];

    return worksheet;
  }

  /**
   * Helper method untuk menambahkan baris statistik dengan styling
   */
  addStatsRows(worksheet, statsArray, startRow) {
    statsArray.forEach((stat, index) => {
      const row = startRow + index;
      worksheet.getCell(`A${row}`).value = stat[0];
      worksheet.getCell(`B${row}`).value = stat[1];
      
      // Styling
      worksheet.getCell(`A${row}`).font = { bold: true };
      worksheet.getCell(`B${row}`).font = { color: { argb: '2563EB' } };
      
      // Border
      ['A', 'B'].forEach(col => {
        worksheet.getCell(`${col}${row}`).border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
        };
      });
    });
  }

  /**
   * Membuat worksheet data utama dengan informasi lengkap
   */
  createMainDataSheet(data) {
    const worksheet = this.workbook.addWorksheet('Data Work Sessions');

    // Header columns
    const headers = [
      'No', 'Nama User', 'Instruksi Kerja', 'Tanggal Selesai', 'Waktu Mulai', 'Waktu Selesai',
      'Waktu Aktual (detik)', 'Waktu Aktual (HH:MM:SS)', 'Waktu Target (detik)', 'Waktu Target (HH:MM:SS)',
      'Efisiensi (%)', 'Status Efisiensi', 'Total Langkah', 'Langkah Selesai', 'Langkah Dilewati',
      'Tingkat Penyelesaian (%)', 'Status Approval', 'Tanggal Update Status', 'Diupdate Oleh'
    ];

    // Write headers dengan styling
    headers.forEach((header, index) => {
      const cell = worksheet.getCell(1, index + 1);
      cell.value = header;
      cell.font = { bold: true, color: { argb: 'FFFFFF' } };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: '667EEA' }
      };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      };
    });

    // Write data
    data.forEach((session, index) => {
      const row = index + 2;
      const completedSteps = session.stepTimes.filter(step => step.status === 'completed').length;
      const skippedSteps = session.stepTimes.filter(step => step.status === 'skipped').length;
      const totalSteps = session.stepTimes.length;
      const completionRate = totalSteps > 0 ? ((completedSteps / totalSteps) * 100).toFixed(1) : '0';

      const rowData = [
        index + 1,
        session.nama,
        session.workInstructionTitle,
        session.tanggal.toLocaleDateString('id-ID'),
        session.startTime ? session.startTime.toLocaleTimeString('id-ID') : '-',
        session.tanggal.toLocaleTimeString('id-ID'),
        session.totalTime,
        this.formatTime(session.totalTime),
        session.targetTime || 0,
        session.hasTargetTime ? this.formatTime(session.targetTime) : 'Tidak ada',
        session.hasTargetTime ? session.efficiency : 'N/A',
        session.isEfficient && session.hasTargetTime ? 'Efisien' : 'Tidak Efisien',
        totalSteps,
        completedSteps,
        skippedSteps,
        completionRate + '%',
        this.getStatusName(session.status),
        session.statusUpdatedAt ? session.statusUpdatedAt.toLocaleDateString('id-ID') : '-',
        session.statusUpdatedBy || '-'
      ];

      rowData.forEach((data, colIndex) => {
        const cell = worksheet.getCell(row, colIndex + 1);
        cell.value = data;
        
        // Alternating row colors
        if (row % 2 === 0) {
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'F8FAFC' }
          };
        }

        // Special formatting
        if (colIndex === 15) { // Completion rate
          const rate = parseFloat(completionRate);
          if (rate >= 90) {
            cell.font = { color: { argb: '10B981' }, bold: true };
          } else if (rate >= 70) {
            cell.font = { color: { argb: 'F59E0B' }, bold: true };
          } else {
            cell.font = { color: { argb: 'EF4444' }, bold: true };
          }
        }

        if (colIndex === 16) { // Status approval
          const status = session.status;
          if (status === 'approved') {
            cell.font = { color: { argb: '10B981' }, bold: true };
          } else if (status === 'rejected') {
            cell.font = { color: { argb: 'EF4444' }, bold: true };
          } else {
            cell.font = { color: { argb: 'F59E0B' }, bold: true };
          }
        }

        // Border
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
        };
      });
    });

    // Auto-fit columns
    worksheet.columns = [
      { width: 5 }, { width: 20 }, { width: 25 }, { width: 15 }, { width: 12 },
      { width: 12 }, { width: 18 }, { width: 15 }, { width: 18 }, { width: 15 },
      { width: 12 }, { width: 15 }, { width: 12 }, { width: 12 }, { width: 12 },
      { width: 20 }, { width: 18 }, { width: 18 }, { width: 15 }
    ];

    return worksheet;
  }

  /**
   * Membuat worksheet detail langkah
   */
  createStepDetailsSheet(data) {
    const worksheet = this.workbook.addWorksheet('Detail Langkah');

    const headers = [
      'Session No', 'User', 'Instruksi Kerja', 'Tanggal', 'Session Status',
      'Langkah No', 'Nama Langkah', 'Status Langkah', 'Waktu Aktual (detik)',
      'Waktu Aktual (MM:SS)', 'Waktu Target (detik)', 'Waktu Target (MM:SS)',
      'Efisiensi (%)', 'Status Efisiensi'
    ];

    // Write headers
    headers.forEach((header, index) => {
      const cell = worksheet.getCell(1, index + 1);
      cell.value = header;
      cell.font = { bold: true, color: { argb: 'FFFFFF' } };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: '764BA2' }
      };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      };
    });

    let currentRow = 2;

    data.forEach((session, sessionIndex) => {
      session.stepTimes.forEach((step, stepIndex) => {
        const rowData = [
          sessionIndex + 1,
          session.nama,
          session.workInstructionTitle,
          session.tanggal.toLocaleDateString('id-ID'),
          this.getStatusName(session.status),
          stepIndex + 1,
          step.step,
          this.getStepStatusName(step.status),
          step.duration,
          this.formatStepTime(step.duration),
          step.targetTime || 0,
          step.targetTime > 0 ? this.formatStepTime(step.targetTime) : 'N/A',
          step.efficiency || 'N/A',
          step.targetTime > 0 && step.duration <= step.targetTime ? 'Efisien' : 'Tidak Efisien'
        ];

        rowData.forEach((data, colIndex) => {
          const cell = worksheet.getCell(currentRow, colIndex + 1);
          cell.value = data;

          // Session alternating colors
          if (sessionIndex % 2 === 0) {
            cell.fill = {
              type: 'pattern',
              pattern: 'solid',
              fgColor: { argb: 'F8FAFC' }
            };
          }

          // Status color coding
          if (colIndex === 7) { // Step status
            if (step.status === 'completed') {
              cell.font = { color: { argb: '10B981' }, bold: true };
            } else if (step.status === 'skipped') {
              cell.font = { color: { argb: 'F59E0B' }, bold: true };
            } else {
              cell.font = { color: { argb: 'EF4444' }, bold: true };
            }
          }

          // Border
          cell.border = {
            top: { style: 'thin' },
            left: { style: 'thin' },
            bottom: { style: 'thin' },
            right: { style: 'thin' }
          };
        });

        currentRow++;
      });
    });

    // Auto-fit columns
    worksheet.columns = [
      { width: 10 }, { width: 20 }, { width: 25 }, { width: 12 }, { width: 15 },
      { width: 10 }, { width: 20 }, { width: 12 }, { width: 15 }, { width: 12 },
      { width: 15 }, { width: 12 }, { width: 12 }, { width: 15 }
    ];

    return worksheet;
  }

  /**
   * Membuat worksheet analisis status
   */
  createStatusAnalysisSheet(data) {
    const worksheet = this.workbook.addWorksheet('Analisis Status');
    
    // Group data by user
    const userStatusMap = {};
    data.forEach(session => {
      if (!userStatusMap[session.nama]) {
        userStatusMap[session.nama] = {
          approved: 0,
          rejected: 0,
          pending: 0,
          total: 0
        };
      }
      
      userStatusMap[session.nama][session.status || 'pending']++;
      userStatusMap[session.nama].total++;
    });

    const headers = [
      'Nama User', 'Total Sessions', 'Disetujui', 'Ditolak', 'Menunggu',
      'Tingkat Persetujuan (%)', 'Tingkat Penolakan (%)'
    ];

    // Write headers
    headers.forEach((header, index) => {
      const cell = worksheet.getCell(1, index + 1);
      cell.value = header;
      cell.font = { bold: true, color: { argb: 'FFFFFF' } };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: '059669' }
      };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      };
    });

    // Write data
    let row = 2;
    Object.keys(userStatusMap).forEach(userName => {
      const userData = userStatusMap[userName];
      const approvalRate = userData.total > 0 ? ((userData.approved / userData.total) * 100).toFixed(1) : 0;
      const rejectionRate = userData.total > 0 ? ((userData.rejected / userData.total) * 100).toFixed(1) : 0;
      
      const rowData = [
        userName,
        userData.total,
        userData.approved,
        userData.rejected,
        userData.pending,
        approvalRate + '%',
        rejectionRate + '%'
      ];

      rowData.forEach((data, colIndex) => {
        const cell = worksheet.getCell(row, colIndex + 1);
        cell.value = data;
        
        // Alternating colors
        if (row % 2 === 0) {
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'F0FDF4' }
          };
        }

        // Border
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
        };
      });

      row++;
    });

    // Auto-fit columns
    worksheet.columns = [
      { width: 20 }, { width: 15 }, { width: 12 }, { width: 10 },
      { width: 12 }, { width: 20 }, { width: 20 }
    ];

    return worksheet;
  }

  /**
   * Main export function - Export lengkap dengan semua sheet
   */
  async exportWorkSessions(data, bulan = '', tahun = new Date().getFullYear(), selectedUser = '', selectedStatus = '') {
    if (!data || data.length === 0) {
      throw new Error('Tidak ada data untuk diekspor');
    }

    try {
      this.resetWorkbook();

      // Create all worksheets
      this.createSummarySheet(data, bulan, tahun, selectedUser, selectedStatus);
      this.createMainDataSheet(data);
      this.createStepDetailsSheet(data);
      this.createStatusAnalysisSheet(data);

      // Generate buffer
      const buffer = await this.workbook.xlsx.writeBuffer();

      // Create filename
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      let filename = `WorkSessions_${timestamp}`;
      
      if (selectedUser) filename += `_${selectedUser.replace(/\s+/g, '_')}`;
      if (selectedStatus) filename += `_${selectedStatus}`;
      if (bulan) filename += `_${this.getMonthName(bulan)}`;
      if (tahun) filename += `_${tahun}`;
      
      filename += '.xlsx';

      // Save file
      const blob = new Blob([buffer], { 
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
      });
      saveAs(blob, filename);

      // Reset workbook
      this.workbook = null;

      return {
        success: true,
        fileName: filename,
        recordCount: data.length,
        message: 'Export berhasil!'
      };

    } catch (error) {
      console.error('Export error:', error);
      this.workbook = null;
      throw new Error(`Gagal export: ${error.message}`);
    }
  }

  /**
   * Export ringkasan - Hanya summary dan data utama
   */
  async exportSummaryReport(data, bulan = '', tahun = new Date().getFullYear(), selectedUser = '', selectedStatus = '') {
    if (!data || data.length === 0) {
      throw new Error('Tidak ada data untuk diekspor');
    }

    try {
      this.resetWorkbook();

      // Create summary worksheets only
      this.createSummarySheet(data, bulan, tahun, selectedUser, selectedStatus);
      this.createMainDataSheet(data);

      const buffer = await this.workbook.xlsx.writeBuffer();
      
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      let filename = `Ringkasan_WorkSessions_${timestamp}`;
      
      if (selectedUser) filename += `_${selectedUser.replace(/\s+/g, '_')}`;
      if (bulan) filename += `_${this.getMonthName(bulan)}`;
      if (tahun) filename += `_${tahun}`;
      
      filename += '.xlsx';

      const blob = new Blob([buffer], { 
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
      });
      saveAs(blob, filename);

      this.workbook = null;

      return {
        success: true,
        fileName: filename,
        recordCount: data.length,
        message: 'Export ringkasan berhasil!'
      };

    } catch (error) {
      console.error('Error exporting summary report:', error);
      this.workbook = null;
      throw new Error(`Gagal mengekspor laporan ringkasan: ${error.message}`);
    }
  }
}

// Export instance dan class
const excelExport = new ExcelExport();
export default excelExport;
export { ExcelExport };