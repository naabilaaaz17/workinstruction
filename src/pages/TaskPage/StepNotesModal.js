// StepNotesModal.js - Enhanced version for manual input with improved scrolling
import React, { useState, useEffect, useRef } from 'react';
import { Timestamp } from 'firebase/firestore';
import './StepNotesModal.css';

const StepNotesModal = ({
  isOpen,
  onClose,
  onSave,
  currentStep,
  activeStep,
  stepNotes = [],
  currentUserId,
  currentUserName,
  isTeamMode = false,
  teamMembers = [],
  stepOperators = [],
  canCompleteStep = true,
  shouldPromptForCompletion = false
}) => {
  const [noteText, setNoteText] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [showQuickActions, setShowQuickActions] = useState(true);
  
  // Add refs for better scrolling control
  const modalContentRef = useRef(null);
  const notesListRef = useRef(null);
  const noteInputRef = useRef(null);

  // Reset note text when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      setNoteText('');
    } else {
      // Focus on input when modal opens and scroll to top
      setTimeout(() => {
        if (noteInputRef.current) {
          noteInputRef.current.focus();
        }
        if (modalContentRef.current) {
          modalContentRef.current.scrollTop = 0;
        }
      }, 100);
    }
  }, [isOpen]);

  // Auto-scroll to latest note when new notes are added
  useEffect(() => {
    if (isOpen && stepNotes.length > 0 && notesListRef.current) {
      setTimeout(() => {
        const notesList = notesListRef.current;
        if (notesList) {
          const firstNote = notesList.querySelector('.note-item');
          if (firstNote) {
            firstNote.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        }
      }, 100);
    }
  }, [stepNotes.length, isOpen]);

  // Quick action templates - these are suggestions, not auto-inserted
  const quickActionTemplates = [
    { 
      label: "🚀 Mulai mengerjakan", 
      template: "Saya mulai mengerjakan step ini",
      category: "start"
    },
    { 
      label: "✅ Selesai dikerjakan", 
      template: "Step ini sudah saya selesaikan",
      category: "complete"
    },
    { 
      label: "⚠️ Ada kendala", 
      template: "Menemui kendala: ",
      category: "issue"
    },
    { 
      label: "🤝 Butuh bantuan", 
      template: "Memerlukan bantuan tim untuk ",
      category: "help"
    },
    { 
      label: "💡 Saran/Tips", 
      template: "Saran untuk step ini: ",
      category: "suggestion"
    },
    { 
      label: "🔧 Troubleshoot", 
      template: "Masalah ditemukan dan solusi: ",
      category: "troubleshoot"
    },
    { 
      label: "📋 Update progress", 
      template: "Progress saat ini: ",
      category: "progress"
    },
    { 
      label: "⏸️ Pause sementara", 
      template: "Pause sementara karena ",
      category: "pause"
    }
  ];

  const handleSave = async () => {
    if (!noteText.trim()) {
      alert('Silakan isi catatan terlebih dahulu');
      return;
    }

    setIsSaving(true);
    
    try {
      await onSave(noteText.trim());
      setNoteText('');
      
      // Scroll to notes section after saving to see the new note
      setTimeout(() => {
        if (notesListRef.current) {
          notesListRef.current.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'start' 
          });
        }
      }, 200);
      
    } catch (error) {
      console.error('Error saving note:', error);
      alert('Gagal menyimpan catatan. Silakan coba lagi.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleQuickAction = (template) => {
    // Instead of auto-filling, we add the template as a starting point
    // User can then customize it as needed
    setNoteText(prev => {
      if (prev.trim()) {
        return prev + '\n\n' + template;
      }
      return template;
    });
    
    // Focus back to textarea after selecting template
    setTimeout(() => {
      if (noteInputRef.current) {
        noteInputRef.current.focus();
        noteInputRef.current.setSelectionRange(noteInputRef.current.value.length, noteInputRef.current.value.length);
      }
    }, 50);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleSave();
    }
    
    // ESC to close modal
    if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  // Handle modal click outside to close
  const handleModalClick = (e) => {
    if (e.target.classList.contains('modal-overlay')) {
      onClose();
    }
  };

  const formatNoteTime = (timestamp) => {
    if (!timestamp) return 'Unknown time';
    
    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      return date.toLocaleString('id-ID', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });
    } catch (error) {
      return 'Invalid time';
    }
  };

  const getCategoryIcon = (noteText) => {
    const text = noteText.toLowerCase();
    if (text.includes('mulai') || text.includes('start')) return '🚀';
    if (text.includes('selesai') || text.includes('done') || text.includes('complete')) return '✅';
    if (text.includes('kendala') || text.includes('masalah') || text.includes('error')) return '⚠️';
    if (text.includes('bantuan') || text.includes('help')) return '🤝';
    if (text.includes('saran') || text.includes('tip')) return '💡';
    if (text.includes('troubleshoot') || text.includes('solusi')) return '🔧';
    if (text.includes('progress') || text.includes('update')) return '📋';
    if (text.includes('pause') || text.includes('stop')) return '⏸️';
    return '💬';
  };

  const scrollToTop = () => {
    if (modalContentRef.current) {
      modalContentRef.current.scrollTo({ 
        top: 0, 
        behavior: 'smooth' 
      });
    }
  };

  const scrollToNotes = () => {
    if (notesListRef.current) {
      notesListRef.current.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'start' 
      });
    }
  };

  const scrollToLatest = () => {
    if (notesListRef.current) {
      const firstNote = notesListRef.current.querySelector('.note-item');
      if (firstNote) {
        firstNote.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay step-notes-modal-overlay" onClick={handleModalClick}>
      <div className="modal-content step-notes-modal">
        <div className="modal-header">
          <h3>
            💬 Catatan Kolaborasi - Step {currentStep + 1}
            {isTeamMode && <span className="team-badge">👥 Tim Mode</span>}
          </h3>
          <div className="header-actions">
            {/* Add scroll navigation buttons */}
            <button 
              className="scroll-btn scroll-top" 
              onClick={scrollToTop}
              title="Scroll ke atas"
              type="button"
            >
              ⬆️
            </button>
            <button 
              className="scroll-btn scroll-notes" 
              onClick={scrollToNotes}
              title="Scroll ke catatan"
              type="button"
            >
              📝
            </button>
            <button className="modal-close" onClick={onClose}>×</button>
          </div>
        </div>

        <div className="modal-body" ref={modalContentRef}>
          <div className="step-info">
            <h4>{activeStep?.title || `Step ${currentStep + 1}`}</h4>
            
            {isTeamMode && (
              <div className="team-status">
                <div className="current-operators">
                  <strong>🎯 Sedang mengerjakan:</strong>
                  {stepOperators.length > 0 ? (
                    <span className="operators-list">
                      {stepOperators.map(operatorId => {
                        const member = teamMembers.find(m => m.userId === operatorId);
                        return (
                          <span 
                            key={operatorId} 
                            className={`operator ${operatorId === currentUserId ? 'current-user' : ''}`}
                          >
                            {member?.userName || 'Unknown'}
                            {operatorId === currentUserId && ' (Anda)'}
                          </span>
                        );
                      })}
                    </span>
                  ) : (
                    <span className="no-operators">Belum ada operator</span>
                  )}
                </div>

                <div className="team-members">
                  <strong>👥 Anggota tim ({teamMembers.filter(m => m.isActive).length}):</strong>
                  <span className="members-list">
                    {teamMembers
                      .filter(m => m.isActive)
                      .map(member => (
                        <span 
                          key={member.userId}
                          className={`team-member ${member.userId === currentUserId ? 'current-user' : ''}`}
                        >
                          {member.userName}
                          {member.userId === currentUserId && ' (Anda)'}
                        </span>
                      ))
                    }
                  </span>
                </div>
              </div>
            )}
          </div>

          <div className="notes-content">
            {/* Manual Note Input Section */}
            <div className="note-input-section">
              <h4>✏️ Tulis Catatan Manual</h4>
              
              {/* Quick Action Templates */}
              {showQuickActions && (
                <div className="quick-actions">
                  <div className="quick-actions-header">
                    <span className="quick-actions-title">🚀 Template Cepat (Opsional):</span>
                    <button 
                      className="toggle-quick-actions"
                      onClick={() => setShowQuickActions(false)}
                      type="button"
                    >
                      Sembunyikan
                    </button>
                  </div>
                  
                  <div className="quick-action-buttons">
                    {quickActionTemplates.map((action, index) => (
                      <button
                        key={index}
                        type="button"
                        className={`quick-action-btn ${action.category}`}
                        onClick={() => handleQuickAction(action.template)}
                        title={`Klik untuk menggunakan template: "${action.template}"`}
                      >
                        {action.label}
                      </button>
                    ))}
                  </div>
                  
                  <div className="quick-actions-help">
                    <small>
                      💡 <strong>Tips:</strong> Klik template di atas untuk memulai catatan, 
                      kemudian edit sesuai situasi Anda. Ctrl+Enter untuk simpan cepat.
                    </small>
                  </div>
                </div>
              )}

              {!showQuickActions && (
                <button 
                  className="show-quick-actions"
                  onClick={() => setShowQuickActions(true)}
                  type="button"
                >
                  🚀 Tampilkan Template Cepat
                </button>
              )}

              {/* Manual Text Input */}
              <div className="note-input-container">
                <textarea
                  ref={noteInputRef}
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                  onKeyDown={handleKeyPress}
                  placeholder={
                    isTeamMode 
                      ? "Tulis catatan untuk koordinasi tim (contoh: 'Saya mulai step ini', 'Butuh bantuan untuk bagian X', 'Step sudah selesai')..."
                      : "Tulis catatan untuk step ini..."
                  }
                  rows={4}
                  className="manual-note-input"
                  disabled={isSaving}
                />
                
                <div className="input-footer">
                  <div className="char-counter">
                    {noteText.length} karakter
                    {noteText.length > 500 && (
                      <span className="warning"> (Sebaiknya di bawah 500 karakter)</span>
                    )}
                  </div>
                  
                  <div className="input-shortcuts">
                    <small>💡 Ctrl+Enter untuk simpan cepat | ESC untuk tutup</small>
                  </div>
                </div>
              </div>

              {/* Save Button */}
              <div className="note-actions">
                <button
                  onClick={handleSave}
                  disabled={!noteText.trim() || isSaving}
                  className="save-note-btn"
                  type="button"
                >
                  {isSaving ? '⏳ Menyimpan...' : '💾 Simpan Catatan'}
                </button>
                
                {noteText.trim() && (
                  <button
                    onClick={() => setNoteText('')}
                    className="clear-note-btn"
                    disabled={isSaving}
                    type="button"
                  >
                    🗑️ Bersihkan
                  </button>
                )}
              </div>

              {/* Completion Prompt for Team Mode */}
              {isTeamMode && shouldPromptForCompletion && !canCompleteStep && (
                <div className="completion-prompt">
                  <div className="prompt-header">
                    <span className="prompt-icon">🤝</span>
                    <span className="prompt-title">Koordinasi Penyelesaian Step</span>
                  </div>
                  <p>
                    Untuk menyelesaikan step ini dalam mode tim, koordinasikan terlebih dahulu 
                    dengan anggota tim yang sedang bekerja. Tulis catatan seperti "Step sudah selesai" 
                    atau "Siap untuk lanjut" agar tim tahu status terkini.
                  </p>
                </div>
              )}
            </div>

            {/* Notes History Section */}
            <div className="notes-history-section" ref={notesListRef}>
              <div className="notes-history-header">
                <h4>
                  📝 Riwayat Catatan ({stepNotes.length})
                  {stepNotes.length === 0 && <span className="no-notes-hint">Belum ada catatan</span>}
                </h4>
                
                {/* Add refresh/scroll to latest button */}
                {stepNotes.length > 3 && (
                  <button 
                    className="scroll-to-latest"
                    onClick={scrollToLatest}
                    type="button"
                    title="Scroll ke catatan terbaru"
                  >
                    ⬆️ Terbaru
                  </button>
                )}
              </div>
              
              {stepNotes.length > 0 ? (
                <div className="notes-list">
                  {stepNotes
                    .sort((a, b) => {
                      const timeA = a?.timestamp?.toMillis?.() || a?.createdAt?.toMillis?.() || 0;
                      const timeB = b?.timestamp?.toMillis?.() || b?.createdAt?.toMillis?.() || 0;
                      return timeB - timeA; // newest first
                    })
                    .map((note, index) => (
                      <div key={note.id || index} className="note-item">
                        <div className="note-header">
                          <span className="note-author">
                            {getCategoryIcon(note.note)} 
                            <strong>{note.userName}</strong>
                            {note.userId === currentUserId && <span className="you-badge">(Anda)</span>}
                            {note.isSystemNote && <span className="system-badge">SISTEM</span>}
                          </span>
                          <span className="note-time">
                            {formatNoteTime(note.timestamp || note.createdAt)}
                          </span>
                        </div>
                        
                        <div className="note-content">
                          {note.note}
                        </div>
                        
                        {/* Show if note helped with coordination */}
                        {isTeamMode && (note.note.toLowerCase().includes('selesai') || 
                                       note.note.toLowerCase().includes('done') || 
                                       note.note.toLowerCase().includes('lanjut')) && (
                          <div className="note-significance">
                            <small>🎯 Catatan koordinasi penting</small>
                          </div>
                        )}
                      </div>
                    ))
                  }
                </div>
              ) : (
                <div className="empty-notes">
                  <div className="empty-notes-icon">📝</div>
                  <p>Belum ada catatan untuk step ini.</p>
                  <p>
                    {isTeamMode 
                      ? "Mulai koordinasi dengan menulis catatan di atas!" 
                      : "Tulis catatan pertama untuk step ini!"
                    }
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="modal-footer">
          <div className="footer-info">
            {isTeamMode && (
              <small>
                💡 <strong>Tips Tim:</strong> Gunakan catatan untuk koordinasi yang efektif. 
                Tuliskan status progress, kendala, atau pertanyaan untuk tim.
              </small>
            )}
            {!isTeamMode && (
              <small>
                💡 <strong>Tips:</strong> Catat informasi penting, kendala, atau observasi 
                untuk referensi dan evaluasi nanti.
              </small>
            )}
          </div>
          
          <div className="footer-actions">
            <button onClick={onClose} className="close-modal-btn" type="button">
              ❌ Tutup
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StepNotesModal;