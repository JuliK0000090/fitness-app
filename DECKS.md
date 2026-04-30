# Pitch decks

Two printable HTML pitch decks live inside the Vita app, gated to
admin emails (404 if you're not an admin so the existence isn't
broadcast).

## Where they live

- **Advisor** — `/decks/advisor` — 8 slides
  - For: Stacy Sims, Mary Claire Haver, Sara Gottfried, sports-medicine
    physicians. Anyone whose clinical or research voice would lend
    credibility to Vita's female-physiology premise.
  - Use: attach the PDF to a cold email; lead with the email body, not
    the deck.

- **Investor** — `/decks/investor` — 12 slides
  - For: seed-stage VCs and angels, **only when they ask**. Don't lead
    with this; lead with a one-paragraph email and offer the deck on
    request.

## How to personalize

Both decks contain `<Token>{...}</Token>` placeholders that render in
**terracotta italic with a dashed underline**, deliberately so a
forgotten `{NAME}` on send is visually impossible to miss.

### Advisor deck — required edits per recipient

Open `app/decks/advisor/page.tsx` and replace these literal strings:

| Token | Where | What to put |
| --- | --- | --- |
| `{NAME}` | Slide 5 salutation | "Stacy", "Mary Claire", etc. |
| `{YEAR}` | Slide 5 heading | The year you first read their work |
| `{THEIR_BOOK_OR_RESEARCH}` | Slide 5 body | "ROAR" / "The New Menopause" / specific paper title |

Save, then refresh `/decks/advisor` in your browser. The terracotta
disappears once the literal text is gone.

### Investor deck — required edits before sending

Open `app/decks/investor/page.tsx`:

- Slide 5 (Customer): `{PRIOR WORK}` — replace with the actual
  podcast / author you want associated with Sarah's mental model.
- Slide 8 (Traction): all six metric numbers — fill in real values.
- Slide 9 (Business model): `[METRIC]` for payback period.
- Slide 11 (Founder): `[PRIOR WORK / ROLES]` — your bio.

## How to export to PDF

1. Open the deck URL in **Safari or Chrome** (signed in as admin).
2. Cmd+P (or use the "Print / Save as PDF" button at the top).
3. Destination: **Save as PDF**.
4. Important Chrome settings: enable **"Background graphics"** under
   "More settings" so the dark navy + champagne accents come through.
   Safari: **"Print backgrounds"** under Show Details.
5. Each slide should print as exactly one page. If a slide overflows,
   reduce its body copy or shorten lists.

## The print stylesheet

`app/decks/deck.css` forces:
- `page-break-after: always` on every `.deck-slide`
- `print-color-adjust: exact` so the navy + champagne survive print
- Page padding of 64px so content doesn't touch the page edge

If you find a slide is being cut off at the bottom, the most common
fix is removing one bullet or shortening the closing paragraph.

## Recommended use

### Advisor outreach

1. **Tuesday this week**: send Stacy Sims the advisor email + PDF.
2. Wait 10 days for response.
3. If silent, send to Mary Claire Haver.
4. Wait 10 days.
5. If silent, send to Sara Gottfried.
6. Track responses in a simple list (date, name, status). Don't
   pursue more than three high-profile names in parallel — feels
   like a campaign, breaks the personal letter premise.

### Investor outreach

The investor deck **does not lead the conversation**. Lead with:
- A one-paragraph email about Vita
- A link to a working build (you on Loom walking a real user through)
- A line offering the deck on request

The deck shows up after they reply, "send me your materials." Sending
unsolicited 12-slide decks is what every founder does; you want to
read like the exception.

## Version history

- **v1 (2026-04-30)** — first decks. Slide copy is anchored to the
  visual treatment in the original brief and the founder voice from
  the conversation. Iterate copy after the first 5 advisor outreaches:
  whichever sentences they react to (positively or with pushback) tell
  you what's landing. Don't tweak in advance.
