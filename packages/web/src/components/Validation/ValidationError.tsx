import { useCallback, useEffect, useRef } from 'react';
import { useValidationErrorStore } from '../../hooks/useValidation';
import './ValidationError.css';

/**
 * Error popup displayed when validation fails
 * Shows different actions based on error style (Stop, Warning, Information)
 */
export function ValidationError() {
  const dialogRef = useRef<HTMLDivElement>(null);
  const {
    isVisible,
    result,
    onRetry,
    onCancel,
    hideError,
  } = useValidationErrorStore();

  // Focus the dialog when it opens
  useEffect(() => {
    if (isVisible && dialogRef.current) {
      const focusableElements = dialogRef.current.querySelectorAll<HTMLElement>(
        'button:not([disabled])'
      );
      if (focusableElements.length > 0) {
        focusableElements[focusableElements.length - 1].focus();
      }
    }
  }, [isVisible]);

  // Handle escape key
  useEffect(() => {
    if (!isVisible) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleCancel();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isVisible]);

  const handleRetry = useCallback(() => {
    onRetry?.();
  }, [onRetry]);

  const handleCancel = useCallback(() => {
    onCancel?.();
    hideError();
  }, [onCancel, hideError]);

  const handleContinue = useCallback(() => {
    // For warning/information, allow the value
    onRetry?.();
  }, [onRetry]);

  if (!isVisible || !result) {
    return null;
  }

  const { errorStyle, errorTitle, errorMessage } = result;
  const style = errorStyle ?? 'stop';

  // Determine icon and colors based on style
  const getIconClass = () => {
    switch (style) {
      case 'stop':
        return 'error-icon-stop';
      case 'warning':
        return 'error-icon-warning';
      case 'information':
        return 'error-icon-information';
      default:
        return 'error-icon-stop';
    }
  };

  const getIcon = () => {
    switch (style) {
      case 'stop':
        return 'X';
      case 'warning':
        return '!';
      case 'information':
        return 'i';
      default:
        return 'X';
    }
  };

  const getTitle = () => {
    if (errorTitle) return errorTitle;
    switch (style) {
      case 'stop':
        return 'Invalid Data';
      case 'warning':
        return 'Warning';
      case 'information':
        return 'Information';
      default:
        return 'Error';
    }
  };

  const getMessage = () => {
    if (errorMessage) return errorMessage;
    switch (style) {
      case 'stop':
        return 'The value you entered is not valid. A user has restricted values that can be entered into this cell.';
      case 'warning':
        return 'The value you entered is not valid. Do you want to continue?';
      case 'information':
        return 'The value you entered may not be correct.';
      default:
        return 'Invalid value entered.';
    }
  };

  return (
    <div className="validation-error-overlay" onClick={handleCancel}>
      <div
        ref={dialogRef}
        className={`validation-error-dialog ${style}`}
        onClick={(e) => e.stopPropagation()}
        role="alertdialog"
        aria-labelledby="validation-error-title"
        aria-describedby="validation-error-message"
      >
        <div className="validation-error-content">
          <div className={`validation-error-icon ${getIconClass()}`}>
            {getIcon()}
          </div>
          <div className="validation-error-text">
            <h3 id="validation-error-title" className="validation-error-title">
              {getTitle()}
            </h3>
            <p id="validation-error-message" className="validation-error-message">
              {getMessage()}
            </p>
          </div>
        </div>

        <div className="validation-error-actions">
          {style === 'stop' && (
            <>
              <button
                className="validation-error-button secondary"
                onClick={handleCancel}
                type="button"
              >
                Cancel
              </button>
              <button
                className="validation-error-button primary"
                onClick={handleRetry}
                type="button"
              >
                Retry
              </button>
            </>
          )}

          {style === 'warning' && (
            <>
              <button
                className="validation-error-button secondary"
                onClick={handleCancel}
                type="button"
              >
                No
              </button>
              <button
                className="validation-error-button primary"
                onClick={handleContinue}
                type="button"
              >
                Yes
              </button>
            </>
          )}

          {style === 'information' && (
            <button
              className="validation-error-button primary"
              onClick={handleContinue}
              type="button"
            >
              OK
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Input message tooltip displayed when a cell with validation is selected
 */
interface InputMessageProps {
  title: string;
  message: string;
  anchorRect: DOMRect | null;
}

export function ValidationInputMessage({ title, message, anchorRect }: InputMessageProps) {
  if (!anchorRect || (!title && !message)) {
    return null;
  }

  // Position the tooltip near the cell
  const style: React.CSSProperties = {
    position: 'fixed',
    top: anchorRect.bottom + 4,
    left: anchorRect.left,
    maxWidth: 300,
  };

  return (
    <div
      className="validation-input-message"
      style={style}
      role="tooltip"
      aria-live="polite"
    >
      {title && <div className="validation-input-message-title">{title}</div>}
      {message && <div className="validation-input-message-text">{message}</div>}
    </div>
  );
}

export default ValidationError;
