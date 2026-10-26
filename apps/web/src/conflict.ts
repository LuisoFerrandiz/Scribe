import { SECTION_KEYS, type SectionKey, type Sections } from './types';

// Another tab saved first (RF-012). Which of MY sections would be lost if the server text is taken?
// A section is offered back only when I changed it (it differs from the last text this tab knew from
// the server, `base`) and the server now has something else. A section only the other tab changed is
// never offered: restoring it would overwrite their work with a stale copy.
export function lostSections(mine: Sections, theirs: Sections, base: Sections): SectionKey[] {
  return SECTION_KEYS.filter((k) => mine[k] !== base[k] && mine[k] !== theirs[k]);
}
