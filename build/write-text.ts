// Plain-text alternative part (dist/<name>.txt).
//
// WHY THIS EXISTS: every one of these campaigns goes to a cold-sourced B2B list. An HTML-only
// message is one of the cheapest spam signals there is — filters expect a multipart/alternative with
// a real text/plain part, and a missing one costs inbox placement before a single design decision
// matters. It is also what plain-text-preference readers and some corporate gateways actually see.
//
// Generated FROM the shippable HTML, so it can never drift from the email: merge keys stay raw
// (`{{company_name}}`) for the sending system to fill exactly as it fills the HTML part, and every
// link keeps its URL inline because there is nothing to click through in text.
const ENTITIES: Record<string, string> = {
  nbsp: ' ',
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  middot: '·',
  hellip: '…',
  mdash: '—',
  ndash: '–',
  zwnj: '',
  rsquo: '’',
  lsquo: '‘',
  ldquo: '“',
  rdquo: '”',
};

function decodeEntities(text: string): string {
  return text
    .replace(/&#(\d+);/g, (_m, code: string) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_m, code: string) => String.fromCodePoint(parseInt(code, 16)))
    .replace(/&([a-z]+);/gi, (m, name: string) => ENTITIES[name.toLowerCase()] ?? m);
}

/**
 * Turn built email HTML into a readable text/plain body.
 *
 * The input is MJML output, so the shape is known and a staged string pass is enough: drop what is
 * invisible (head, styles, Outlook conditionals, the hidden preheader), turn links and block
 * boundaries into text, then flatten. Not a general-purpose HTML-to-text converter and does not
 * need to be.
 */
export function htmlToText(html: string): string {
  let text = html
    // Outlook conditional comments (VML, ghost tables) and ordinary comments — invisible either way.
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<head[\s\S]*?<\/head>/gi, '')
    .replace(/<(style|script)[\s\S]*?<\/\1>/gi, '')
    // The hidden preheader duplicates the inbox preview line; it is not body copy.
    .replace(/<div[^>]*display:\s*none[^>]*>[\s\S]*?<\/div>/gi, '');

  // Links: keep the label, append the target unless the label already IS the target.
  // The target goes in PARENTHESES, not angle brackets — `<url>` would be eaten by the tag strip
  // below, which silently dropped every CTA link the first time round.
  text = text.replace(
    /<a\b[^>]*\bhref="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi,
    (_m, href: string, label: string) => {
      const flat = decodeEntities(label.replace(/<[^>]+>/g, ''))
        .replace(/\s+/g, ' ')
        .trim();
      const target = href.trim();
      if (!flat) return target;
      // Label already carries the destination (a bare URL, or a mailto: whose address is the label).
      if (target.includes(flat) || flat.includes(target) || target === `mailto:${flat}`)
        return flat;
      return `${flat} (${target})`;
    },
  );

  text = text
    // Images: the alt text is the content. Decorative images have alt="" and contribute nothing.
    .replace(/<img\b[^>]*\balt="([^"]+)"[^>]*>/gi, (_m, alt: string) => `[${alt}]`)
    .replace(/<img\b[^>]*>/gi, '')
    // A divider is a visible separator in the HTML; keep a text equivalent.
    .replace(/<(?:p|div|tr|table|h[1-6])\b[^>]*style="[^"]*border-top[^"]*"[^>]*>/gi, '\n---\n')
    .replace(/<br\s*\/?>/gi, '\n')
    // Block boundaries become line breaks; inline tags just vanish.
    .replace(/<\/(?:p|div|td|tr|table|h[1-6]|li)>/gi, '\n')
    .replace(/<[^>]+>/g, '');

  const lines = decodeEntities(text)
    .split('\n')
    .map((line) => line.replace(/\s+/g, ' ').trim());

  // Drop an image's alt line when the next line of copy says the same thing — the equipment grid and
  // the signature each render `alt` AND a visible label with identical text, which reads as a
  // stutter in plain text ("[Excavators]" then "Excavators").
  const deduped = lines.filter((line, i) => {
    const alt = /^\[(.+)]$/.exec(line)?.[1];
    if (alt === undefined) return true;
    return lines.slice(i + 1).find((l) => l !== '') !== alt;
  });

  return deduped
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/\n(---)\n(?:\n*---\n)+/g, '\n$1\n')
    .trim();
}

/**
 * Compose the text part: subject line for reference, then the body. The subject is included as a
 * comment-free first line because most ESPs let you paste subject + text + html together, and it
 * makes the file self-describing when someone opens it out of context.
 */
export function buildTextPart(subject: string, html: string): string {
  return `${subject}\n${'='.repeat(Math.min(subject.length, 78))}\n\n${htmlToText(html)}\n`;
}
