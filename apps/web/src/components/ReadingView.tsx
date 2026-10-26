import { useEffect, useRef } from 'react';
import { partiesBlock, titleLines, witnessLine } from '../docFormat';
import { SECTION_KEYS, SECTION_LABEL, type CaseFull, type Sections } from '../types';

// RF-008: clean, large, read-only view of the whole decision, for reading it aloud in the
// deliberation. F2 or Esc leaves (handled by the page, which also restores the cursor).
export function ReadingView({ c, sections }: { c: CaseFull; sections: Sections }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => ref.current?.focus(), []);

  return (
    <div className="reading" ref={ref} tabIndex={-1} role="document" aria-label="Reading mode">
      <div className="reading-inner">
        <div className="reading-head">
          <p>{titleLines(c).join('\n')}</p>
          {/* Many parties would push the text far down: they fold, as in the case header. */}
          {c.parties.length > 4 ? (
            <details className="reading-parties">
              <summary>Parties ({c.parties.length})</summary>
              <p>{partiesBlock(c)}</p>
            </details>
          ) : (
            c.parties.length > 0 && <p>{partiesBlock(c)}</p>
          )}
          {witnessLine(c) && <p>{witnessLine(c)}</p>}
        </div>
        {SECTION_KEYS.map((k) => (
          <section key={k}>
            <h2>{SECTION_LABEL[k]}</h2>
            <p>{sections[k].trim() || '—'}</p>
          </section>
        ))}
        <p className="reading-foot muted">F2 or Esc to go back</p>
      </div>
    </div>
  );
}
