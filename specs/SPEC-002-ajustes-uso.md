# SPEC-002 - Usage adjustments

Status 2026-10-26: A-1 to A-6 done and checked in the browser.
Also done by the owner's order: the "Download .txt" button was removed (not needed). The case now sits in
a left rail (case, save status, parties and witnesses, actions) and the five sections show their title in
the left margin; the document fills the rest of the width.

Source: owner feedback while trying SPEC-001 locally, 2026-10-26. Not scheduled: do after SPEC-001 T12-T13,
or earlier if the owner says so. Each item still has to pass the drift test (CLAUDE.md).

## A-1 Full-width layout
The app uses 100% of the screen width (today it is a centered column). Applies to the case view, the case list
and the new-case page. Reading mode and the search dialog keep a readable line length inside the full width.

- Drift test: no typing saved; it removes wasted screen space for long text. Removes: fixed max-width.
- Done when: at 1920 px wide the sections fill the width, no horizontal scroll at 1280 px.

## A-2 Buttons for reading mode and search
Visible buttons in the case header for "Reading" (today F2) and "Search" (today Ctrl+K). The keys F2, Esc and
Ctrl+K keep working; the buttons show the key as a hint. A button must not take focus away from the text
(same rule as Copy): cursor and selection are restored on return.

- Drift test: no typing saved; makes two features discoverable. Removes: the hint text "F2 reading - Ctrl+K search".
- Done when: both open and close from the mouse, and the cursor returns to where it was.

## A-3 Edit the case data after creating it (parties, witnesses, kinds, ...)
Go back from the case view to the creation data, add or change parties and witnesses (and kinds, hearing time),
and return to the document with nothing lost.

- The document text is never touched by this edit. Pending local draft is saved first (flush the autosave) and
  survives the round trip.
- Existing party and witness ids are preserved (server already upserts by id), so `supports_party_id` links hold.
- Open decision: separate edit page versus a panel inside the case view. Prefer whichever keeps the document
  on screen (hearing flow: the scribe must not lose sight of the hearing). Ask the owner before building.
- Server side exists: `PUT /cases/:id/parties`, `PUT /cases/:id/witnesses`, `PATCH /cases/:id`.
- Done when: add a witness mid-case, return, and text, cursor, parties and the other witnesses are unchanged;
  works offline for the text and fails visibly (not silently) for the data edit.

## Found while verifying T13 in the browser (2026-10-26)
- **A-4 Reading mode with many parties.** With 60 parties the party list fills the screen and pushes the
  decision text far down. Show "Parties (N)" folded, like the case header does.
- **A-5 Search dialog.** (a) The mouse resting over the list changes the highlighted row, so Enter can insert a
  different row than the one the keyboard chose; move the highlight on mouse movement only. (b) A typed rule
  number ("rule 63.1") finds the section, but the "Phrases" group is listed first and the RRS hit is below it;
  show the exact rule hit first.
- **A-6 (done: per-section restore)** "Restore my text" after a two-tab conflict puts back the whole old text of all five sections, which
  can overwrite what the other tab typed. Consider restoring per section, or showing what differs.

A-6 as built: after a 409 the server text is shown and only the sections THIS tab changed (and the server replaced) are listed
with a "Restore mine" button each; a section only the other tab changed is never offered. Pure logic in `conflict.ts`.
