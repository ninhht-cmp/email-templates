# Testing emails across clients

Four layers, cheapest → most faithful. Do the lint + previews on every change; the real send before
a campaign.

| Layer | What it catches | What it can't | Command |
|---|---|---|---|
| **1. Compatibility lint** | Structural/CSS breakage (flex, absolute pos, missing VML, Gmail clip, external CSS, a11y tables) | Anything visual | `npm run lint:email` |
| **2. Gallery preview** | Reflow & stacking at desktop / mobile width, preview text | Outlook's Word engine quirks (real rendering) | open `dist/index.html` |
| **3. Client-family sim** | Column collapse in CSS-stripping clients (New Outlook, Gmail GANGA) | Word-engine visuals | `npm run simulate` |
| **4. Real send** | Everything, exactly — Outlook desktop especially | — | see below |

## 1. Compatibility lint

```bash
npm run build       # writes dist/*.html
npm run lint:email  # static-analyses dist/*.html
```

`error` fails the run (and `npm run validate`); `warn` degrades in one engine but stays legible;
`·` is informational / confirms a safeguard. Rules live in `build/lint-compat.ts` — asset hosting
(CDN URLs, SVG→PNG) is deliberately **out of scope**; those are swapped before sending.

## 2. Gallery preview (local, offline)

```bash
npm run build
open dist/index.html      # macOS  (or just double-click it)
```

The gallery renders the sample-filled `*.preview.html` in a device frame; use the **Desktop / Mobile**
toggle to check reflow & stacking at each width, and the preview text / layout per template.

**It is a viewport preview, not a rendering-engine emulator.** The browser is still Blink/WebKit,
so it reproduces layout *reflow* but not Outlook's Word engine (border-radius, object-fit,
gradients degrade there — see `README.md` → Client compatibility). Use it to confirm nothing stacks
or overflows wrong; use layer 4 for true Outlook fidelity.

## 3. Client-family simulation (New Outlook / Gmail GANGA)

The gallery preview keeps full CSS. Two clients **strip CSS** before rendering, so they collapse
multi-column layouts in ways the preview can't show — this is what broke the columns before:

- **New Outlook / Outlook webview** — drops `@media` queries (and the `[if mso]` ghost table).
- **Gmail app on a non-Google account (GANGA)** — strips all `<style>`.

Both hold only if the layout survives via *inline* widths (the fluid-hybrid `mw-<px>` approach —
see `build/render-email.ts`). Reproduce them:

```bash
npm run build
npm run simulate     # writes dist/sim/<name>.{newoutlook,ganga}.html
```

Open `dist/sim/<name>.newoutlook.html` at ~700px and `<name>.ganga.html` at ~390px. Columns must
stay laid out — side-by-side on desktop, reflowed (not overflowing/collapsed) on mobile. This is the
**guard for the `mw-<px>` values**: a wrong one makes columns wrap or leave a gap here. It's still
Blink, so classic Outlook's Word engine needs layer 4.

## 4. Real send — true fidelity

The only way to see Outlook desktop (Windows) rendering exactly. Pick one:

### a) Test-inbox services (recommended for campaigns)
- **Litmus** or **Email on Acid** — paste `dist/<name>.html` (the raw, shippable file) and get
  screenshots across 90+ real clients (Outlook 2016/2019/365, Gmail web/iOS/Android, Apple Mail,
  Outlook.com, Yahoo) in one pass. Best coverage; paid.

### b) Send to your own inboxes (free, quick)
Host the assets first (the build lists every still-temporary URL; swap them to CDN URLs in each
email's `content.ts`), then send the built HTML to a Gmail **and** an Outlook account:

```bash
# Option 1 — via the actual sending system (ESP): paste dist/<name>.html, send a test to yourself.
# Option 2 — from the terminal, if you have a Gmail App Password:
#   (fill EMAIL_USER / EMAIL_PASS; App Password, not your login password)
python3 - <<'PY'
import smtplib, ssl, os
from email.mime.text import MIMEText
html = open("dist/buyer-invitation.preview.html", encoding="utf-8").read()
msg = MIMEText(html, "html", "utf-8")
msg["Subject"] = "[TEST] buyer-invitation"
msg["From"] = os.environ["EMAIL_USER"]
msg["To"]   = os.environ["EMAIL_USER"]
with smtplib.SMTP_SSL("smtp.gmail.com", 465, context=ssl.create_default_context()) as s:
    s.login(os.environ["EMAIL_USER"], os.environ["EMAIL_PASS"])
    s.send_message(msg)
print("sent")
PY
```

> Send the **`.preview.html`** for a self-test (merge keys are filled with sample values, so the
> `{{...}}` don't show up literally). Send **`.html`** only through the ESP that fills the keys.

### What to check in a real Outlook desktop
- Rounded corners become squares — **expected** (see README). Layout must still hold.
- The supplier-onboarding hero shows the bare photo (no white gradient) — **expected**.
- Buttons are solid rectangles (VML) — must be clickable and correctly coloured.
- No blank bands where a `background-image` should be (VML fallback working).
- Preview text / subject render, and the message isn't clipped (Gmail 102 KB).

## Where each artifact comes from

- `dist/<name>.html` — shippable, raw `{{keys}}`. **This is what you send / paste into Litmus.**
- `dist/<name>.preview.html` — sample-filled, for the gallery preview and self-tests.
