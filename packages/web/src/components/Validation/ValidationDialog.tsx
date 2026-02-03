import { useCallback, useEffect, useRef } from 'react';
import {
  useValidationStore,
  useValidation,
  VALIDATION_TYPE_LABELS,
  VALIDATION_OPERATOR_LABELS,
  ERROR_STYLE_LABELS,
} from '../../hooks/useValidation';
import type { ValidationType, ValidationOperator, ValidationErrorStyle } from '@excel/core';
import './ValidationDialog.css';

/**
 * Main validation configuration dialog
 * Similar to Excel's Data Validation dialog with tabs
 */
export function ValidationDialog() {
  const dialogRef = useRef<HTMLDivElement>(null);
  const {
    isOpen,
    activeTab,
    validationType,
    operator,
    formula1,
    formula2,
    listValues,
    ignoreBlank,
    inCellDropdown,
    showInputMessage,
    inputTitle,
    inputMessage,
    showErrorAlert,
    errorStyle,
    errorTitle,
    errorMessage,
    closeDialog,
    setActiveTab,
    setValidationType,
    setOperator,
    setFormula1,
    setFormula2,
    setListValues,
    setIgnoreBlank,
    setInCellDropdown,
    setShowInputMessage,
    setInputTitle,
    setInputMessage,
    setShowErrorAlert,
    setErrorStyle,
    setErrorTitle,
    setErrorMessage,
    clearValidation,
    resetDialog,
  } = useValidationStore();

  const { applyToSelectedCells } = useValidation();

  // Handle escape key to close dialog
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closeDialog();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, closeDialog]);

  // Focus trap inside dialog
  useEffect(() => {
    if (!isOpen || !dialogRef.current) return;

    const focusableElements = dialogRef.current.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );

    if (focusableElements.length > 0) {
      focusableElements[0].focus();
    }
  }, [isOpen, activeTab]);

  const handleApply = useCallback(() => {
    applyToSelectedCells();
  }, [applyToSelectedCells]);

  const handleCancel = useCallback(() => {
    resetDialog();
    closeDialog();
  }, [resetDialog, closeDialog]);

  const handleClearAll = useCallback(() => {
    clearValidation();
  }, [clearValidation]);

  const needsOperator = ['whole', 'decimal', 'date', 'time', 'textLength'].includes(validationType);
  const needsFormula2 = operator === 'between' || operator === 'notBetween';
  const isListType = validationType === 'list';
  const isCustomType = validationType === 'custom';

  if (!isOpen) {
    return null;
  }

  return (
    <div className="validation-dialog-overlay" onClick={handleCancel}>
      <div
        ref={dialogRef}
        className="validation-dialog"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-labelledby="validation-dialog-title"
        aria-modal="true"
      >
        <div className="validation-dialog-header">
          <h2 id="validation-dialog-title" className="validation-dialog-title">
            Data Validation
          </h2>
          <button
            className="validation-dialog-close"
            onClick={handleCancel}
            aria-label="Close"
            type="button"
          >
            x
          </button>
        </div>

        {/* Tabs */}
        <div className="validation-tabs" role="tablist">
          <button
            className={`validation-tab ${activeTab === 'settings' ? 'active' : ''}`}
            onClick={() => setActiveTab('settings')}
            role="tab"
            aria-selected={activeTab === 'settings'}
            aria-controls="settings-panel"
            type="button"
          >
            Settings
          </button>
          <button
            className={`validation-tab ${activeTab === 'inputMessage' ? 'active' : ''}`}
            onClick={() => setActiveTab('inputMessage')}
            role="tab"
            aria-selected={activeTab === 'inputMessage'}
            aria-controls="input-message-panel"
            type="button"
          >
            Input Message
          </button>
          <button
            className={`validation-tab ${activeTab === 'errorAlert' ? 'active' : ''}`}
            onClick={() => setActiveTab('errorAlert')}
            role="tab"
            aria-selected={activeTab === 'errorAlert'}
            aria-controls="error-alert-panel"
            type="button"
          >
            Error Alert
          </button>
        </div>

        {/* Tab Panels */}
        <div className="validation-tab-content">
          {/* Settings Tab */}
          {activeTab === 'settings' && (
            <div
              id="settings-panel"
              className="validation-panel"
              role="tabpanel"
              aria-labelledby="settings-tab"
            >
              <div className="validation-section">
                <h3 className="validation-section-title">Validation criteria</h3>

                <div className="validation-field">
                  <label htmlFor="validation-type" className="validation-label">
                    Allow:
                  </label>
                  <select
                    id="validation-type"
                    className="validation-select"
                    value={validationType}
                    onChange={(e) => setValidationType(e.target.value as ValidationType)}
                  >
                    {Object.entries(VALIDATION_TYPE_LABELS).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>

                {needsOperator && (
                  <div className="validation-field">
                    <label htmlFor="validation-operator" className="validation-label">
                      Data:
                    </label>
                    <select
                      id="validation-operator"
                      className="validation-select"
                      value={operator}
                      onChange={(e) => setOperator(e.target.value as ValidationOperator)}
                    >
                      {Object.entries(VALIDATION_OPERATOR_LABELS).map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {isListType && (
                  <div className="validation-field">
                    <label htmlFor="validation-list" className="validation-label">
                      Source:
                    </label>
                    <input
                      id="validation-list"
                      type="text"
                      className="validation-input"
                      value={listValues}
                      onChange={(e) => setListValues(e.target.value)}
                      placeholder="Enter comma-separated values or cell range"
                    />
                    <span className="validation-hint">
                      Separate items with commas, or enter a cell range (e.g., A1:A10)
                    </span>
                  </div>
                )}

                {isCustomType && (
                  <div className="validation-field">
                    <label htmlFor="validation-formula" className="validation-label">
                      Formula:
                    </label>
                    <input
                      id="validation-formula"
                      type="text"
                      className="validation-input"
                      value={formula1}
                      onChange={(e) => setFormula1(e.target.value)}
                      placeholder="Enter a formula that returns TRUE or FALSE"
                    />
                    <span className="validation-hint">
                      Formula should return TRUE for valid values
                    </span>
                  </div>
                )}

                {needsOperator && !needsFormula2 && (
                  <div className="validation-field">
                    <label htmlFor="validation-value" className="validation-label">
                      Value:
                    </label>
                    <input
                      id="validation-value"
                      type="text"
                      className="validation-input"
                      value={formula1}
                      onChange={(e) => setFormula1(e.target.value)}
                      placeholder="Enter a value"
                    />
                  </div>
                )}

                {needsOperator && needsFormula2 && (
                  <>
                    <div className="validation-field">
                      <label htmlFor="validation-min" className="validation-label">
                        Minimum:
                      </label>
                      <input
                        id="validation-min"
                        type="text"
                        className="validation-input"
                        value={formula1}
                        onChange={(e) => setFormula1(e.target.value)}
                        placeholder="Enter minimum value"
                      />
                    </div>
                    <div className="validation-field">
                      <label htmlFor="validation-max" className="validation-label">
                        Maximum:
                      </label>
                      <input
                        id="validation-max"
                        type="text"
                        className="validation-input"
                        value={formula2}
                        onChange={(e) => setFormula2(e.target.value)}
                        placeholder="Enter maximum value"
                      />
                    </div>
                  </>
                )}
              </div>

              <div className="validation-options">
                <label className="validation-checkbox-label">
                  <input
                    type="checkbox"
                    className="validation-checkbox"
                    checked={ignoreBlank}
                    onChange={(e) => setIgnoreBlank(e.target.checked)}
                  />
                  Ignore blank
                </label>

                {isListType && (
                  <label className="validation-checkbox-label">
                    <input
                      type="checkbox"
                      className="validation-checkbox"
                      checked={inCellDropdown}
                      onChange={(e) => setInCellDropdown(e.target.checked)}
                    />
                    In-cell dropdown
                  </label>
                )}
              </div>
            </div>
          )}

          {/* Input Message Tab */}
          {activeTab === 'inputMessage' && (
            <div
              id="input-message-panel"
              className="validation-panel"
              role="tabpanel"
              aria-labelledby="input-message-tab"
            >
              <label className="validation-checkbox-label validation-show-checkbox">
                <input
                  type="checkbox"
                  className="validation-checkbox"
                  checked={showInputMessage}
                  onChange={(e) => setShowInputMessage(e.target.checked)}
                />
                Show input message when cell is selected
              </label>

              <div className={`validation-message-fields ${!showInputMessage ? 'disabled' : ''}`}>
                <div className="validation-field">
                  <label htmlFor="input-title" className="validation-label">
                    Title:
                  </label>
                  <input
                    id="input-title"
                    type="text"
                    className="validation-input"
                    value={inputTitle}
                    onChange={(e) => setInputTitle(e.target.value)}
                    disabled={!showInputMessage}
                    maxLength={32}
                  />
                </div>

                <div className="validation-field">
                  <label htmlFor="input-message" className="validation-label">
                    Input message:
                  </label>
                  <textarea
                    id="input-message"
                    className="validation-textarea"
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    disabled={!showInputMessage}
                    rows={4}
                    maxLength={255}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Error Alert Tab */}
          {activeTab === 'errorAlert' && (
            <div
              id="error-alert-panel"
              className="validation-panel"
              role="tabpanel"
              aria-labelledby="error-alert-tab"
            >
              <label className="validation-checkbox-label validation-show-checkbox">
                <input
                  type="checkbox"
                  className="validation-checkbox"
                  checked={showErrorAlert}
                  onChange={(e) => setShowErrorAlert(e.target.checked)}
                />
                Show error alert after invalid data is entered
              </label>

              <div className={`validation-message-fields ${!showErrorAlert ? 'disabled' : ''}`}>
                <div className="validation-field">
                  <label htmlFor="error-style" className="validation-label">
                    Style:
                  </label>
                  <select
                    id="error-style"
                    className="validation-select"
                    value={errorStyle}
                    onChange={(e) => setErrorStyle(e.target.value as ValidationErrorStyle)}
                    disabled={!showErrorAlert}
                  >
                    {Object.entries(ERROR_STYLE_LABELS).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="validation-field">
                  <label htmlFor="error-title" className="validation-label">
                    Title:
                  </label>
                  <input
                    id="error-title"
                    type="text"
                    className="validation-input"
                    value={errorTitle}
                    onChange={(e) => setErrorTitle(e.target.value)}
                    disabled={!showErrorAlert}
                    maxLength={32}
                  />
                </div>

                <div className="validation-field">
                  <label htmlFor="error-message" className="validation-label">
                    Error message:
                  </label>
                  <textarea
                    id="error-message"
                    className="validation-textarea"
                    value={errorMessage}
                    onChange={(e) => setErrorMessage(e.target.value)}
                    disabled={!showErrorAlert}
                    rows={4}
                    maxLength={255}
                  />
                </div>

                <div className="error-style-info">
                  {errorStyle === 'stop' && (
                    <p className="error-style-description">
                      <span className="error-icon stop">X</span>
                      Stop: Prevents users from entering invalid data.
                    </p>
                  )}
                  {errorStyle === 'warning' && (
                    <p className="error-style-description">
                      <span className="error-icon warning">!</span>
                      Warning: Warns users but allows them to continue.
                    </p>
                  )}
                  {errorStyle === 'information' && (
                    <p className="error-style-description">
                      <span className="error-icon information">i</span>
                      Information: Shows information but allows any data.
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Dialog Footer */}
        <div className="validation-dialog-footer">
          <button
            className="validation-button secondary"
            onClick={handleClearAll}
            type="button"
          >
            Clear All
          </button>
          <div className="validation-dialog-actions">
            <button
              className="validation-button secondary"
              onClick={handleCancel}
              type="button"
            >
              Cancel
            </button>
            <button
              className="validation-button primary"
              onClick={handleApply}
              type="button"
            >
              OK
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ValidationDialog;
