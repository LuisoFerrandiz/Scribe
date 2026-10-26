import { useEffect, useRef, useState } from 'react';
import { ApiError, AuthError, api, serverError } from '../api';
import { mergeParties, newParties } from '../mergeParties';
import type { AttachmentRow, CaseFull, Extraction, Kind } from '../types';

const KIND_LABEL: Record<Kind, string> = { protest: 'Protest', redress: 'Redress', reopening: 'Reopening' };
const ROLE_LABEL = { protestor: 'Protestor', respondent: 'Respondent', other: 'Party' } as const;

type Update = Pick<Partial<CaseFull>, 'case_number' | 'kinds' | 'parties'>;

// RF-002: upload the protest form(s), ask for a proposal, and apply only what the scribe ticks.
// The proposal never touches the document text; with no AI configured the case is filled by hand.
export function ProtestFormDialog({
  c,
  onApply,
  onClose,
  onAuthLost,
}: {
  c: CaseFull;
  onApply: (patch: Update) => void;
  onClose: () => void;
  onAuthLost: () => void;
}) {
  const [files, setFiles] = useState<AttachmentRow[]>([]);
  const [busy, setBusy] = useState<'upload' | 'read' | 'apply' | null>(null);
  const [error, setError] = useState('');
  const [proposal, setProposal] = useState<Extraction | null>(null);
  const [take, setTake] = useState({ number: true, kinds: true, parties: true });
  const input = useRef<HTMLInputElement>(null);

  function fail(e: unknown) {
    if (e instanceof AuthError) return onAuthLost();
    setError(e instanceof ApiError ? serverError(e) : 'Could not reach the server.');
  }

  useEffect(() => {
    api.listAttachments(c.id).then(setFiles).catch(fail);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [c.id]);

  async function upload(list: FileList | null) {
    if (!list || list.length === 0) return;
    setBusy('upload');
    setError('');
    try {
      for (const f of Array.from(list)) await api.uploadAttachment(c.id, f);
      setFiles(await api.listAttachments(c.id));
      setProposal(null);
    } catch (e) {
      fail(e);
    } finally {
      setBusy(null);
      if (input.current) input.current.value = '';
    }
  }

  async function remove(id: number) {
    try {
      await api.deleteAttachment(id);
      setFiles((f) => f.filter((x) => x.id !== id));
      setProposal(null);
    } catch (e) {
      fail(e);
    }
  }

  async function read() {
    setBusy('read');
    setError('');
    try {
      const p = await api.extract(c.id);
      setProposal(p);
      setTake({ number: true, kinds: true, parties: true });
    } catch (e) {
      fail(e);
    } finally {
      setBusy(null);
    }
  }

  const fresh = proposal ? newParties(c.parties, proposal.parties) : [];
  const partyChanges = fresh.length > 0;
  const numberChanges = !!proposal?.case_number && proposal.case_number !== c.case_number;
  const kindsText = proposal?.claim_types.join(',') ?? '';
  const kindsChange = !!kindsText && kindsText !== c.kinds;
  const nothingNew = !!proposal && !numberChanges && !kindsChange && !partyChanges;

  async function apply() {
    if (!proposal) return;
    setBusy('apply');
    setError('');
    const patch: Update = {};
    try {
      const body: { case_number?: string; kinds?: Kind[] } = {};
      if (numberChanges && take.number) body.case_number = proposal.case_number;
      if (kindsChange && take.kinds) body.kinds = proposal.claim_types;
      if (body.case_number !== undefined || body.kinds) {
        const updated = await api.patchCase(c.id, body);
        patch.case_number = updated.case_number;
        patch.kinds = updated.kinds;
      }
      if (partyChanges && take.parties) {
        patch.parties = await api.setParties(c.id, mergeParties(c.parties, proposal.parties));
      }
      onApply(patch);
      onClose();
    } catch (e) {
      // Whatever was saved before the failure is shown, so the case and the screen agree.
      if (patch.case_number !== undefined || patch.kinds) onApply(patch);
      fail(e);
      setBusy(null);
    }
  }

  return (
    <div
      className="search-overlay"
      onMouseDown={onClose}
      onKeyDown={(e) => {
        if (e.key === 'Escape') {
          e.preventDefault();
          onClose();
        }
      }}
    >
      <div className="search-box form-box" role="dialog" aria-label="Protest form" onMouseDown={(e) => e.stopPropagation()}>
        <h2>Protest form</h2>
        <div className="form-files">
          <input
            ref={input}
            type="file"
            multiple
            accept=".pdf,.docx,.doc,.xlsx,.xls,.md,.txt"
            onChange={(e) => void upload(e.target.files)}
            disabled={busy !== null}
            autoFocus
            aria-label="Protest form files"
          />
          <ul>
            {files.map((f) => (
              <li key={f.id}>
                <span>{f.original_filename}</span>
                {f.conversion_empty === 1 && <span className="muted"> (no readable text)</span>}
                <button className="ghost" onClick={() => void remove(f.id)} disabled={busy !== null}>
                  Remove
                </button>
              </li>
            ))}
          </ul>
        </div>
        <div className="form-actions">
          <button onClick={() => void read()} disabled={busy !== null || files.length === 0}>
            {busy === 'read' ? 'Reading…' : 'Read form'}
          </button>
          <span className="muted">Needs the AI key. Without it, type the parties by hand.</span>
        </div>
        {error && <p className="error">{error}</p>}
        {proposal && (
          <div className="proposal">
            <p className="muted">Proposal from the form. Nothing is saved until you accept.</p>
            {numberChanges && (
              <label>
                <input type="checkbox" checked={take.number} onChange={(e) => setTake({ ...take, number: e.target.checked })} />
                Case number: <strong>{proposal.case_number}</strong> (now {c.case_number})
              </label>
            )}
            {kindsChange && (
              <label>
                <input type="checkbox" checked={take.kinds} onChange={(e) => setTake({ ...take, kinds: e.target.checked })} />
                Claim: <strong>{proposal.claim_types.map((k) => KIND_LABEL[k]).join(' + ')}</strong>
              </label>
            )}
            {partyChanges && (
              <label>
                <input type="checkbox" checked={take.parties} onChange={(e) => setTake({ ...take, parties: e.target.checked })} />
                Add {fresh.length} {fresh.length === 1 ? 'party' : 'parties'}:
              </label>
            )}
            {partyChanges && (
              <ul>
                {fresh.map((p, i) => (
                  <li key={i}>
                    {ROLE_LABEL[p.role]}: {[p.name, p.boat_name, p.sail_number].filter(Boolean).join(', ')}
                  </li>
                ))}
              </ul>
            )}
            {nothingNew && <p className="muted">The form has nothing the case does not already have.</p>}
            <div className="form-actions">
              <button onClick={() => void apply()} disabled={busy !== null || nothingNew}>
                {busy === 'apply' ? 'Saving…' : 'Accept'}
              </button>
              <button className="ghost" onClick={() => setProposal(null)} disabled={busy !== null}>
                Discard
              </button>
            </div>
          </div>
        )}
        <div className="form-actions">
          <button className="ghost" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
