import React from 'react';
import './AdminPage.css';

// Import all utility functions from AdminUtils.js
import {
  calculateEfficiency,
  formatEfficiencyDisplay,
  formatTime,
  formatStepTime,
} from './AdminUtils';

// ===== STEP DETAILS MODAL COMPONENT =====
const StepDetailsModal = ({ isOpen, onClose, sessionData }) => {
  if (!isOpen || !sessionData) return null;

  const completedSteps = sessionData.stepTimes.filter(s => s.status === 'completed').length;
  const skippedSteps = sessionData.stepTimes.filter(s => s.status === 'skipped').length;
  const pendingSteps = sessionData.stepTimes.filter(s => s.status === 'pending').length;
  const stepsWithTargets = sessionData.stepTimes.filter(s => s.targetTime > 0).length;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-container" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">
            <h2>Detail Langkah Work Session</h2>
            <div className="modal-session-info">
              <span className="session-user">{sessionData.nama}</span>
              <span className="session-mo">MO: {sessionData.moNumber}</span>
              <span className="session-task">{sessionData.workInstructionTitle}</span>
            </div>
          </div>
          <button className="modal-close" onClick={onClose}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        <div className="modal-summary">
          <div className="summary-card">
            <div className="summary-icon completed">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="20,6 9,17 4,12"/>
              </svg>
            </div>
            <div className="summary-info">
              <h3>{completedSteps}</h3>
              <p>Selesai</p>
            </div>
          </div>

          <div className="summary-card">
            <div className="summary-icon skipped">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polygon points="5,3 19,12 5,21"/>
                <polygon points="19,3 19,21"/>
              </svg>
            </div>
            <div className="summary-info">
              <h3>{skippedSteps}</h3>
              <p>Dilewati</p>
            </div>
          </div>

          <div className="summary-card">
            <div className="summary-icon pending">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/>
                <polyline points="12,6 12,12 16,14"/>
              </svg>
            </div>
            <div className="summary-info">
              <h3>{pendingSteps}</h3>
              <p>Pending</p>
            </div>
          </div>

          <div className="summary-card">
            <div className="summary-icon efficiency">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
              </svg>
            </div>
            <div className="summary-info">
              <h3>{sessionData.efficiency.toFixed(1)}%</h3>
              <p>Efisiensi</p>
            </div>
          </div>

          <div className="summary-card">
            <div className="summary-icon target">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/>
                <circle cx="12" cy="12" r="6"/>
                <circle cx="12" cy="12" r="2"/>
              </svg>
            </div>
            <div className="summary-info">
              <h3>{stepsWithTargets}</h3>
              <p>Punya Target</p>
            </div>
          </div>
        </div>

        <div className="modal-body">
          <div className="steps-list">
            {sessionData.stepTimes.map((step, index) => {
              const efficiency = calculateEfficiency(step.duration, step.targetTime, step.status);
              const effDisplay = formatEfficiencyDisplay(efficiency);
              
              return (
                <div key={index} className={`step-item ${step.status}`}>
                  <div className="step-header">
                    <div className="step-info">
                      <div className="step-number">{index + 1}</div>
                      <div className="step-content">
                        <h4 className="step-name">{step.step}</h4>
                        <div className="step-meta">
                          <span className={`step-status-badge ${step.status}`}>
                            {step.status === 'completed' && (
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <polyline points="20,6 9,17 4,12"/>
                              </svg>
                            )}
                            {step.status === 'skipped' && (
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <polygon points="5,3 19,12 5,21"/>
                              </svg>
                            )}
                            {step.status === 'pending' && (
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <circle cx="12" cy="12" r="10"/>
                              </svg>
                            )}
                            {step.status === 'completed' ? 'Selesai' : 
                             step.status === 'skipped' ? 'Dilewati' : 'Pending'}
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    {step.targetTime > 0 && step.status !== 'pending' && (
                      <div className={`efficiency-badge ${effDisplay.className}`}>
                        <span className="efficiency-value" style={{ color: effDisplay.color }}>
                          {effDisplay.value}
                        </span>
                        <div className="efficiency-bar">
                          <div 
                            className="efficiency-fill"
                            style={{ 
                              width: `${Math.min(efficiency || 0, 100)}%`,
                              backgroundColor: effDisplay.color
                            }}
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="step-times">
                    <div className="time-item actual">
                      <span className="time-label">Waktu Aktual:</span>
                      <span className="time-value">{formatStepTime(step.duration)}</span>
                    </div>
                    
                    <div className="time-item target">
                      <span className="time-label">Waktu Target:</span>
                      <span className="time-value">
                        {step.targetTime > 0 ? formatStepTime(step.targetTime) : 'Tidak diset'}
                      </span>
                    </div>

                    {step.targetTime > 0 && step.duration > 0 && (
                      <div className="time-item difference">
                        <span className="time-label">Selisih:</span>
                        <span className={`time-value ${step.duration <= step.targetTime ? 'under' : 'over'}`}>
                          {step.duration <= step.targetTime ? '-' : '+'}
                          {formatStepTime(Math.abs(step.duration - step.targetTime))}
                        </span>
                      </div>
                    )}
                  </div>

                  {step.status === 'skipped' && (
                    <div className="step-note skipped">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                        <line x1="12" y1="9" x2="12" y2="13"/>
                        <line x1="12" y1="17" x2="12.01" y2="17"/>
                      </svg>
                      Langkah ini dilewati dalam proses
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="modal-footer">
          <div className="modal-total-times">
            <div className="total-time actual">
              <span className="label">Total Waktu Aktual:</span>
              <span className="value">{formatTime(sessionData.totalTime)}</span>
            </div>
            <div className="total-time target">
              <span className="label">Total Waktu Target:</span>
              <span className="value">
                {sessionData.targetTime > 0 ? formatTime(sessionData.targetTime) : 'N/A'}
              </span>
            </div>
            <div className="total-time efficiency">
              <span className="label">Efisiensi Keseluruhan:</span>
              <span className={`value ${sessionData.efficiency >= 80 ? 'efficient' : 'inefficient'}`}>
                {sessionData.efficiency.toFixed(1)}%
              </span>
            </div>
          </div>
          
          <button className="modal-button primary" onClick={onClose}>
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};

export default StepDetailsModal;