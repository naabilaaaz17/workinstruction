import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

/**
 * Enhanced Excel Export Class
 * Fully compatible with AdminPage.js enhanced features
 * Includes team mode tracking, activity history, and detailed analytics
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
   * 🔥 NEW: Mendapatkan mode kerja (Individual/Tim)
   */
  getWorkMode(session) {
    const participants = session.originalSession?.participants || [];
    return participants.length > 1 ? 'Tim' : 'Individu';
  }

  /**
   * 🔥 NEW: Menghitung total aktivitas dari session
   */
  getTotalActivities(session) {
    const data = session.originalSession || session;
    let activityCount = 0;
    
    if (data.stepStartedBy) activityCount += Object.keys(data.stepStartedBy).length;
    if (data.stepCompletedBy) activityCount += Object.keys(data.stepCompletedBy).length;
    if (data.stepSkippedBy) activityCount += Object.keys(data.stepSkippedBy).length;
    if (data.stepStoppedBy) activityCount += Object.keys(data.stepStoppedBy).length;
    if (session.troubleshootHistory) activityCount += session.troubleshootHistory.length;
    
    return activityCount;
  }

  /**
   * 🔥 ENHANCED: Menghitung statistik lengkap dengan team mode
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

    // MO statistics
    const uniqueMOs = [...new Set(data.map(s => s.mo).filter(mo => mo))].length;
    const sessionsWithMO = data.filter(s => s.mo && s.mo.trim() !== '').length;

    // 🔥 NEW: Team work statistics
    const teamSessions = data.filter(s => (s.originalSession?.participants || []).length > 1).length;
    const individualSessions = totalSessions - teamSessions;
    const totalActivities = data.reduce((acc, s) => acc + this.getTotalActivities(s), 0);

    // 🔥 NEW: User collaboration stats
    const uniqueUsers = [...new Set(data.map(s => s.nama))].length;
    const totalParticipants = data.reduce((acc, s) => acc + (s.originalSession?.participants || []).length, 0);

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
      avgTargetTime,

      // MO stats
      uniqueMOs,
      sessionsWithMO,

      // 🔥 NEW: Team stats
      teamSessions,
      individualSessions,
      teamWorkRate: totalSessions > 0 ? (teamSessions / totalSessions * 100) : 0,
      totalActivities,
      avgActivitiesPerSession: totalSessions > 0 ? (totalActivities / totalSessions) : 0,

      // 🔥 NEW: User collaboration stats
      uniqueUsers,
      totalParticipants,
      avgParticipantsPerSession: totalSessions > 0 ? (totalParticipants / totalSessions) : 0
    };
  }

  /**
   * 🔥 ENHANCED: Membuat worksheet ringkasan yang komprehensif dengan team analytics
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
      ['Langkah Pending', `${stats.pendingSteps} (${((stats.pendingSteps / stats.totalSteps) * 100).toFixed(1)}%)`],
      ['Total MO Unik', stats.uniqueMOs],
      ['Sessions dengan MO', `${stats.sessionsWithMO} (${((stats.sessionsWithMO / stats.totalSessions) * 100).toFixed(1)}%)`]
    ];

    this.addStatsRows(worksheet, generalStats, row);
    row += generalStats.length + 1;

    // 🔥 NEW: Statistik mode kerja (Tim vs Individu)
    worksheet.getCell(`A${row}`).value = 'STATISTIK MODE KERJA';
    worksheet.getCell(`A${row}`).font = { bold: true, size: 14, color: { argb: '7C3AED' } };
    row++;

    const teamStats = [
      ['Sessions Tim', `${stats.teamSessions} (${stats.teamWorkRate.toFixed(1)}%)`],
      ['Sessions Individu', `${stats.individualSessions} (${((stats.individualSessions / stats.totalSessions) * 100).toFixed(1)}%)`],
      ['Total Aktivitas', stats.totalActivities],
      ['Rata-rata Aktivitas per Session', stats.avgActivitiesPerSession.toFixed(1)],
      ['Unique Users', stats.uniqueUsers],
      ['Total Participants', stats.totalParticipants],
      ['Rata-rata Participants per Session', stats.avgParticipantsPerSession.toFixed(1)]
    ];

    this.addStatsRows(worksheet, teamStats, row);
    row += teamStats.length + 1;

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
      { width: 35 },
      { width: 30 },
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
   * 🔥 ENHANCED: Membuat worksheet data utama dengan informasi lengkap termasuk mode kerja
   */
  createMainDataSheet(data) {
    const worksheet = this.workbook.addWorksheet('Data Work Sessions');

    // Header columns - ENHANCED dengan kolom Mode dan Activity Count
    const headers = [
      'No', 'Nama User', 'MO (Manufacturing Order)', 'Instruksi Kerja', 'Mode Kerja', 'Tanggal Selesai', 'Waktu Mulai', 'Waktu Selesai',
      'Waktu Aktual (detik)', 'Waktu Aktual (HH:MM:SS)', 'Waktu Target (detik)', 'Waktu Target (HH:MM:SS)',
      'Efisiensi (%)', 'Status Efisiensi', 'Total Langkah', 'Langkah Selesai', 'Langkah Dilewati',
      'Tingkat Penyelesaian (%)', 'Status Approval', 'Total Aktivitas', 'Tanggal Update Status', 'Diupdate Oleh'
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

      // 🔥 ENHANCED: Include mode kerja dan total activities
      const rowData = [
        index + 1,
        session.nama,
        session.mo || '-', // MO (Manufacturing Order)
        session.workInstructionTitle,
        this.getWorkMode(session), // 🔥 NEW: Mode Kerja
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
        this.getTotalActivities(session), // 🔥 NEW: Total Activities
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

        // Special formatting for MO column
        if (colIndex === 2 && data !== '-') { // MO column
          cell.font = { color: { argb: '7C3AED' }, bold: true };
        }

        // 🔥 NEW: Special formatting for Mode Kerja column
        if (colIndex === 4) { // Mode Kerja column
          if (data === 'Tim') {
            cell.font = { color: { argb: '7C3AED' }, bold: true };
          } else {
            cell.font = { color: { argb: '059669' } };
          }
        }

        // Special formatting
        if (colIndex === 17) { // Completion rate (adjusted index)
          const rate = parseFloat(completionRate);
          if (rate >= 90) {
            cell.font = { color: { argb: '10B981' }, bold: true };
          } else if (rate >= 70) {
            cell.font = { color: { argb: 'F59E0B' }, bold: true };
          } else {
            cell.font = { color: { argb: 'EF4444' }, bold: true };
          }
        }

        if (colIndex === 18) { // Status approval (adjusted index)
          const status = session.status;
          if (status === 'approved') {
            cell.font = { color: { argb: '10B981' }, bold: true };
          } else if (status === 'rejected') {
            cell.font = { color: { argb: 'EF4444' }, bold: true };
          } else {
            cell.font = { color: { argb: 'F59E0B' }, bold: true };
          }
        }

        // 🔥 NEW: Special formatting for Total Activities column
        if (colIndex === 19) { // Total Activities column
          const activityCount = parseInt(data);
          if (activityCount > 10) {
            cell.font = { color: { argb: '7C3AED' }, bold: true };
          } else if (activityCount > 5) {
            cell.font = { color: { argb: 'F59E0B' } };
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

    // Auto-fit columns - ENHANCED dengan kolom baru
    worksheet.columns = [
      { width: 5 }, { width: 20 }, { width: 20 }, { width: 25 }, { width: 12 }, { width: 15 }, { width: 12 },
      { width: 12 }, { width: 18 }, { width: 15 }, { width: 18 }, { width: 15 },
      { width: 12 }, { width: 15 }, { width: 12 }, { width: 12 }, { width: 12 },
      { width: 20 }, { width: 18 }, { width: 15 }, { width: 18 }, { width: 15 }
    ];

    return worksheet;
  }

  /**
   * 🔥 ENHANCED: Membuat worksheet detail langkah dengan informasi operator
   */
  createStepDetailsSheet(data) {
    const worksheet = this.workbook.addWorksheet('Detail Langkah');

    // ENHANCED dengan kolom operator information
    const headers = [
      'Session No', 'User', 'MO', 'Instruksi Kerja', 'Mode', 'Tanggal', 'Session Status',
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
        // ENHANCED dengan mode kerja
        const rowData = [
          sessionIndex + 1,
          session.nama,
          session.mo || '-', // MO
          session.workInstructionTitle,
          this.getWorkMode(session), // 🔥 NEW: Mode
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

          // MO column formatting
          if (colIndex === 2 && data !== '-') { // MO column
            cell.font = { color: { argb: '7C3AED' }, bold: true };
          }

          // 🔥 NEW: Mode column formatting
          if (colIndex === 4) { // Mode column
            if (data === 'Tim') {
              cell.font = { color: { argb: '7C3AED' }, bold: true };
            } else {
              cell.font = { color: { argb: '059669' } };
            }
          }

          // Status color coding
          if (colIndex === 9) { // Step status (adjusted index)
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

    // Auto-fit columns - ENHANCED
    worksheet.columns = [
      { width: 10 }, { width: 20 }, { width: 15 }, { width: 25 }, { width: 10 }, { width: 12 }, { width: 15 },
      { width: 10 }, { width: 20 }, { width: 12 }, { width: 15 }, { width: 12 },
      { width: 15 }, { width: 12 }, { width: 12 }, { width: 15 }
    ];

    return worksheet;
  }

  /**
   * 🔥 ENHANCED: Membuat worksheet analisis status dengan team/individual breakdown
   */
  createStatusAnalysisSheet(data) {
    const worksheet = this.workbook.addWorksheet('Analisis Status');
    
    // Group data by user and include team/individual stats
    const userStatusMap = {};
    data.forEach(session => {
      if (!userStatusMap[session.nama]) {
        userStatusMap[session.nama] = {
          approved: 0,
          rejected: 0,
          pending: 0,
          total: 0,
          uniqueMOs: new Set(),
          teamSessions: 0,
          individualSessions: 0,
          totalActivities: 0
        };
      }
      
      userStatusMap[session.nama][session.status || 'pending']++;
      userStatusMap[session.nama].total++;
      
      if (session.mo && session.mo.trim() !== '') {
        userStatusMap[session.nama].uniqueMOs.add(session.mo);
      }

      // 🔥 NEW: Track team vs individual sessions
      const isTeamWork = (session.originalSession?.participants || []).length > 1;
      if (isTeamWork) {
        userStatusMap[session.nama].teamSessions++;
      } else {
        userStatusMap[session.nama].individualSessions++;
      }

      userStatusMap[session.nama].totalActivities += this.getTotalActivities(session);
    });

    // ENHANCED headers dengan team analytics
    const headers = [
      'Nama User', 'Total Sessions', 'Unique MOs', 'Sessions Tim', 'Sessions Individu', 'Total Aktivitas',
      'Disetujui', 'Ditolak', 'Menunggu', 'Tingkat Persetujuan (%)', 'Tingkat Penolakan (%)'
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
      
      // ENHANCED dengan team/individual data
      const rowData = [
        userName,
        userData.total,
        userData.uniqueMOs.size, // Unique MO count
        userData.teamSessions, // 🔥 NEW: Team sessions
        userData.individualSessions, // 🔥 NEW: Individual sessions
        userData.totalActivities, // 🔥 NEW: Total activities
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

        // MO count formatting
        if (colIndex === 2) { // Unique MO column
          cell.font = { color: { argb: '7C3AED' }, bold: true };
        }

        // 🔥 NEW: Team sessions formatting
        if (colIndex === 3) { // Team sessions column
          if (data > 0) {
            cell.font = { color: { argb: '7C3AED' }, bold: true };
          }
        }

        // 🔥 NEW: Total activities formatting
        if (colIndex === 5) { // Total activities column
          const activityCount = parseInt(data);
          if (activityCount > 20) {
            cell.font = { color: { argb: '7C3AED' }, bold: true };
          } else if (activityCount > 10) {
            cell.font = { color: { argb: 'F59E0B' } };
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

      row++;
    });

    // Auto-fit columns - ENHANCED
    worksheet.columns = [
      { width: 20 }, { width: 15 }, { width: 12 }, { width: 12 }, { width: 15 },
      { width: 15 }, { width: 12 }, { width: 10 }, { width: 12 }, { width: 20 }, { width: 20 }
    ];

    return worksheet;
  }

  /**
   * 🔥 ENHANCED: Membuat worksheet khusus analisis MO dengan team collaboration data
   */
  createMOAnalysisSheet(data) {
    const worksheet = this.workbook.addWorksheet('Analisis MO');
    
    // Group data by MO with enhanced team analytics
    const moAnalysis = {};
    data.forEach(session => {
      const mo = session.mo || 'Tanpa MO';
      
      if (!moAnalysis[mo]) {
        moAnalysis[mo] = {
          totalSessions: 0,
          users: new Set(),
          approved: 0,
          rejected: 0,
          pending: 0,
          totalTime: 0,
          avgTime: 0,
          workInstructions: new Set(),
          teamSessions: 0, // 🔥 NEW
          individualSessions: 0, // 🔥 NEW
          totalActivities: 0, // 🔥 NEW
          totalParticipants: 0 // 🔥 NEW
        };
      }
      
      moAnalysis[mo].totalSessions++;
      moAnalysis[mo].users.add(session.nama);
      moAnalysis[mo][session.status || 'pending']++;
      moAnalysis[mo].totalTime += session.totalTime;
      moAnalysis[mo].workInstructions.add(session.workInstructionTitle);
      
      // 🔥 NEW: Track team vs individual work
      const isTeamWork = (session.originalSession?.participants || []).length > 1;
      if (isTeamWork) {
        moAnalysis[mo].teamSessions++;
        moAnalysis[mo].totalParticipants += (session.originalSession?.participants || []).length;
      } else {
        moAnalysis[mo].individualSessions++;
        moAnalysis[mo].totalParticipants += 1;
      }

      moAnalysis[mo].totalActivities += this.getTotalActivities(session);
    });

    // Calculate averages
    Object.keys(moAnalysis).forEach(mo => {
      moAnalysis[mo].avgTime = moAnalysis[mo].totalSessions > 0 ? 
        moAnalysis[mo].totalTime / moAnalysis[mo].totalSessions : 0;
      moAnalysis[mo].avgParticipants = moAnalysis[mo].totalSessions > 0 ?
        moAnalysis[mo].totalParticipants / moAnalysis[mo].totalSessions : 0;
    });

    // ENHANCED headers dengan team collaboration metrics
    const headers = [
      'MO (Manufacturing Order)', 'Total Sessions', 'Sessions Tim', 'Sessions Individu', 'Unique Users', 
      'Avg Participants', 'Total Aktivitas', 'Unique Work Instructions', 'Disetujui', 'Ditolak', 
      'Menunggu', 'Total Waktu (HH:MM:SS)', 'Rata-rata Waktu (HH:MM:SS)', 'Tingkat Persetujuan (%)'
    ];

    // Write headers
    headers.forEach((header, index) => {
      const cell = worksheet.getCell(1, index + 1);
      cell.value = header;
      cell.font = { bold: true, color: { argb: 'FFFFFF' } };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: '7C3AED' }
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
    // Sort by total sessions descending
    const sortedMOs = Object.keys(moAnalysis).sort((a, b) => 
      moAnalysis[b].totalSessions - moAnalysis[a].totalSessions
    );

    sortedMOs.forEach(mo => {
      const data = moAnalysis[mo];
      const approvalRate = data.totalSessions > 0 ? 
        ((data.approved / data.totalSessions) * 100).toFixed(1) : 0;
      
      const rowData = [
        mo,
        data.totalSessions,
        data.teamSessions, // 🔥 NEW
        data.individualSessions, // 🔥 NEW
        data.users.size,
        data.avgParticipants.toFixed(1), // 🔥 NEW
        data.totalActivities, // 🔥 NEW
        data.workInstructions.size,
        data.approved,
        data.rejected,
        data.pending,
        this.formatTime(data.totalTime),
        this.formatTime(data.avgTime),
        approvalRate + '%'
      ];

      rowData.forEach((cellData, colIndex) => {
        const cell = worksheet.getCell(row, colIndex + 1);
        cell.value = cellData;
        
        // Alternating colors
        if (row % 2 === 0) {
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FAF5FF' }
          };
        }

        // MO column formatting
        if (colIndex === 0 && cellData !== 'Tanpa MO') {
          cell.font = { color: { argb: '7C3AED' }, bold: true };
        }

        // 🔥 NEW: Team sessions highlighting
        if (colIndex === 2) { // Team sessions column
          if (parseInt(cellData) > 0) {
            cell.font = { color: { argb: '7C3AED' }, bold: true };
          }
        }

        // 🔥 NEW: High activity highlighting
        if (colIndex === 6) { // Total activities column
          const activityCount = parseInt(cellData);
          if (activityCount > 50) {
            cell.font = { color: { argb: '7C3AED' }, bold: true };
          } else if (activityCount > 25) {
            cell.font = { color: { argb: 'F59E0B' } };
          }
        }

        // Approval rate formatting
        if (colIndex === 13) { // Approval rate column (adjusted)
          const rate = parseFloat(approvalRate);
          if (rate >= 80) {
            cell.font = { color: { argb: '10B981' }, bold: true };
          } else if (rate >= 60) {
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

      row++;
    });

    // Auto-fit columns - ENHANCED
    worksheet.columns = [
      { width: 25 }, { width: 15 }, { width: 12 }, { width: 15 }, { width: 12 },
      { width: 15 }, { width: 15 }, { width: 20 }, { width: 10 }, { width: 10 },
      { width: 10 }, { width: 18 }, { width: 18 }, { width: 20 }
    ];

    return worksheet;
  }

  /**
   * 🔥 NEW: Membuat worksheet khusus analisis aktivitas dan kolaborasi
   */
  createActivityAnalysisSheet(data) {
    const worksheet = this.workbook.addWorksheet('Analisis Aktivitas');

    // Analyze activity patterns
    const activityAnalysis = {};
    
    data.forEach(session => {
      const sessionDate = session.tanggal.toDateString();
      const userName = session.nama;
      const isTeamWork = (session.originalSession?.participants || []).length > 1;
      const totalActivities = this.getTotalActivities(session);

      if (!activityAnalysis[sessionDate]) {
        activityAnalysis[sessionDate] = {
          date: session.tanggal,
          totalSessions: 0,
          teamSessions: 0,
          individualSessions: 0,
          totalActivities: 0,
          uniqueUsers: new Set(),
          avgActivitiesPerSession: 0,
          mostActiveUser: '',
          mostActiveUserActivities: 0
        };
      }

      const dayData = activityAnalysis[sessionDate];
      dayData.totalSessions++;
      dayData.totalActivities += totalActivities;
      dayData.uniqueUsers.add(userName);

      if (isTeamWork) {
        dayData.teamSessions++;
      } else {
        dayData.individualSessions++;
      }

      // Track most active user per day
      if (totalActivities > dayData.mostActiveUserActivities) {
        dayData.mostActiveUser = userName;
        dayData.mostActiveUserActivities = totalActivities;
      }
    });

    // Calculate averages
    Object.keys(activityAnalysis).forEach(dateKey => {
      const dayData = activityAnalysis[dateKey];
      dayData.avgActivitiesPerSession = dayData.totalSessions > 0 ? 
        (dayData.totalActivities / dayData.totalSessions).toFixed(1) : 0;
    });

    const headers = [
      'Tanggal', 'Total Sessions', 'Sessions Tim', 'Sessions Individu', 'Unique Users',
      'Total Aktivitas', 'Avg Aktivitas/Session', 'User Paling Aktif', 'Aktivitas Tertinggi'
    ];

    // Write headers
    headers.forEach((header, index) => {
      const cell = worksheet.getCell(1, index + 1);
      cell.value = header;
      cell.font = { bold: true, color: { argb: 'FFFFFF' } };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'F59E0B' }
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
    const sortedDates = Object.keys(activityAnalysis).sort((a, b) => 
      new Date(b) - new Date(a)
    );

    sortedDates.forEach(dateKey => {
      const dayData = activityAnalysis[dateKey];
      
      const rowData = [
        dayData.date.toLocaleDateString('id-ID'),
        dayData.totalSessions,
        dayData.teamSessions,
        dayData.individualSessions,
        dayData.uniqueUsers.size,
        dayData.totalActivities,
        dayData.avgActivitiesPerSession,
        dayData.mostActiveUser,
        dayData.mostActiveUserActivities
      ];

      rowData.forEach((cellData, colIndex) => {
        const cell = worksheet.getCell(row, colIndex + 1);
        cell.value = cellData;
        
        // Alternating colors
        if (row % 2 === 0) {
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFFBEB' }
          };
        }

        // Team sessions highlighting
        if (colIndex === 2) { // Team sessions
          if (parseInt(cellData) > 0) {
            cell.font = { color: { argb: '7C3AED' }, bold: true };
          }
        }

        // High activity highlighting
        if (colIndex === 5) { // Total activities
          const activityCount = parseInt(cellData);
          if (activityCount > 100) {
            cell.font = { color: { argb: 'DC2626' }, bold: true };
          } else if (activityCount > 50) {
            cell.font = { color: { argb: 'F59E0B' }, bold: true };
          }
        }

        // Most active user highlighting
        if (colIndex === 7) { // Most active user
          cell.font = { color: { argb: '059669' }, bold: true };
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
      { width: 15 }, { width: 15 }, { width: 12 }, { width: 15 }, { width: 12 },
      { width: 15 }, { width: 18 }, { width: 20 }, { width: 15 }
    ];

    return worksheet;
  }

  /**
   * 🔥 ENHANCED: Main export function - Export lengkap dengan semua sheet termasuk activity analysis
   */
  async exportWorkSessions(data, bulan = '', tahun = new Date().getFullYear(), selectedUser = '', selectedStatus = '') {
    if (!data || data.length === 0) {
      throw new Error('Tidak ada data untuk diekspor');
    }

    try {
      this.resetWorkbook();

      // Create all worksheets including new activity analysis
      this.createSummarySheet(data, bulan, tahun, selectedUser, selectedStatus);
      this.createMainDataSheet(data);
      this.createStepDetailsSheet(data);
      this.createStatusAnalysisSheet(data);
      this.createMOAnalysisSheet(data);
      this.createActivityAnalysisSheet(data); // 🔥 NEW: Activity analysis sheet

      // Generate buffer
      const buffer = await this.workbook.xlsx.writeBuffer();

      // Create filename
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      let filename = `WorkSessions_Enhanced_${timestamp}`;
      
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
        message: 'Export berhasil dengan fitur team analytics!'
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

  /**
   * Export khusus analisis MO
   */
  async exportMOAnalysisOnly(data, bulan = '', tahun = new Date().getFullYear()) {
    if (!data || data.length === 0) {
      throw new Error('Tidak ada data untuk diekspor');
    }

    try {
      this.resetWorkbook();

      // Create MO analysis worksheet only
      this.createMOAnalysisSheet(data);

      const buffer = await this.workbook.xlsx.writeBuffer();
      
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      let filename = `Analisis_MO_Enhanced_${timestamp}`;
      
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
        message: 'Export analisis MO berhasil!'
      };

    } catch (error) {
      console.error('Error exporting MO analysis:', error);
      this.workbook = null;
      throw new Error(`Gagal mengekspor analisis MO: ${error.message}`);
    }
  }

  /**
   * 🔥 NEW: Export khusus analisis aktivitas dan kolaborasi
   */
  async exportActivityAnalysisOnly(data, bulan = '', tahun = new Date().getFullYear()) {
    if (!data || data.length === 0) {
      throw new Error('Tidak ada data untuk diekspor');
    }

    try {
      this.resetWorkbook();

      // Create activity analysis worksheet only
      this.createActivityAnalysisSheet(data);

      const buffer = await this.workbook.xlsx.writeBuffer();
      
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      let filename = `Analisis_Aktivitas_${timestamp}`;
      
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
        message: 'Export analisis aktivitas berhasil!'
      };

    } catch (error) {
      console.error('Error exporting activity analysis:', error);
      this.workbook = null;
      throw new Error(`Gagal mengekspor analisis aktivitas: ${error.message}`);
    }
  }

  /**
   * 🔥 NEW: Export team collaboration report - Fokus pada team analytics
   */
  async exportTeamCollaborationReport(data, bulan = '', tahun = new Date().getFullYear()) {
    if (!data || data.length === 0) {
      throw new Error('Tidak ada data untuk diekspor');
    }

    try {
      this.resetWorkbook();

      // Filter untuk data tim saja
      const teamData = data.filter(session => 
        (session.originalSession?.participants || []).length > 1
      );

      if (teamData.length === 0) {
        throw new Error('Tidak ada data team collaboration untuk diekspor');
      }

      // Create worksheets focused on team collaboration
      this.createSummarySheet(teamData, bulan, tahun, '', '');
      this.createActivityAnalysisSheet(teamData);
      this.createStatusAnalysisSheet(teamData);
      this.createMOAnalysisSheet(teamData);

      const buffer = await this.workbook.xlsx.writeBuffer();
      
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      let filename = `Team_Collaboration_Report_${timestamp}`;
      
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
        recordCount: teamData.length,
        message: `Export team collaboration berhasil! (${teamData.length} team sessions)`
      };

    } catch (error) {
      console.error('Error exporting team collaboration report:', error);
      this.workbook = null;
      throw new Error(`Gagal mengekspor laporan team collaboration: ${error.message}`);
    }
  }
}

// Export instance dan class
const excelExport = new ExcelExport();
export default excelExport;
export { ExcelExport };