import { useState } from 'react';

// A destructive action in two clicks, in place: the first asks, the second does it. Nothing pops up
// over the page, and a click anywhere else on the row does not delete.
export function ConfirmButton({
  label,
  question,
  confirmLabel,
  onConfirm,
  disabled,
}: {
  label: string;
  question: string;
  confirmLabel: string;
  onConfirm: () => void;
  disabled?: boolean;
}) {
  const [asking, setAsking] = useState(false);

  if (!asking) {
    return (
      <button className="ghost danger" onClick={() => setAsking(true)} disabled={disabled}>
        {label}
      </button>
    );
  }
  return (
    <span className="confirm" role="alert">
      <span>{question}</span>
      <button
        className="danger-solid"
        onClick={() => {
          setAsking(false);
          onConfirm();
        }}
      >
        {confirmLabel}
      </button>
      <button className="ghost" onClick={() => setAsking(false)} autoFocus>
        Cancel
      </button>
    </span>
  );
}
