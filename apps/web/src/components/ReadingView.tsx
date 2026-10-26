import { useEffect, useRef } from 'react';
import { headerBlock } from '../docFormat';
import { SECTION_KEYS, SECTION_LABEL, type CaseFull, type Sections } from '../types';

// RF-008: clean, large, read-only view of the whole decision, for reading it aloud in the
// deliberation. F2 or Esc leaves (handled by the page, which also restores the cursor).
export function ReadingView({ c, sections }: { c: CaseFull; sections: Sections }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => ref.current?.focus(), []);

  return (
    <div className="reading" ref={ref} tabIndex={-1} role="document" aria-label="Reading mode">
      <div className="reading-inner">
        <p className="reading-head">{headerBlock(c)}</p>
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
