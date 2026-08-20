# Email Templates — Architecture & Scaling Design

Trạng thái: **GĐ 0-1 đã triển khai** (module hoá build + colocation 3 tầng). GĐ 2-4 khi cần.
Bối cảnh: hiện có 2 email (`supplier-onboarding`, `buyer-invitation`). Mục tiêu: scale lên **nhiều email khác loại nhau**
(marketing, transactional, lifecycle…) mà vẫn sạch, ít trùng lặp, an toàn khi nhiều người sửa.

> Mục 1 (review) mô tả code **trước** refactor để làm chứng lý do; các coupling P1-P4 nêu ở đó
> **đã được xử lý** ở GĐ 0-1 (xem mục 7). Giữ lại làm hồ sơ quyết định.

---

## 1. Review kiến trúc hiện tại

**Pipeline (trước rebuild):** Nunjucks (data + tokens + icons) → MJML → HTML inline, build bằng `build.mjs` (JS).
`{$ $}` = build-time, `{{ }}` = merge tag send-time. Đây là nền **đúng** và nên giữ.

### Điểm tốt (giữ)
- Data-driven (loop từ `data/*.js`), không copy-paste markup.
- Tách delimiter `{$ $}` vs `{{ }}` — merge tag đi xuyên build an toàn.
- Tokens tập trung (`tokens.ts`), macros generic (`button`, `badge`, `sectionTitle`).
- Build = lint gate (fail nếu MJML lỗi) + preview gallery + CI.

### Vấn đề sẽ VỠ khi thêm template khác loại (bám code)

| # | Vấn đề | Bằng chứng | Hệ quả khi scale |
|---|---|---|---|
| P1 | **Icon dir hard-code cho 1 template** | `build.mjs:32` `ICON_DIR='assets/supplier-onboarding/icons'` | Template #2 icon khác → build vẫn nạp icon của supplier-onboarding. Sai từ gốc. |
| P2 | **Config trình bày nằm trong build toàn cục** | `build.mjs:33-35` `ICON_HEIGHT/CHIP_ICONS/CHIP` | Config riêng của 1 email sống trong build script chung → build thành bãi rác khi mỗi email 1 kiểu. |
| P3 | **`partials/` mang danh "global" nhưng nội dung riêng** | `signature/company-legal/footer/head` trong `src/partials/` | Email transactional (reset mật khẩu…) không dùng signature/company-legal → "global" là ảo. Không có tầng chia sẻ đúng. |
| P4 | **Namespace phẳng, không colocation** | `data/<name>.js` + `templates/<name>.mjml.njk` rời nhau | Section riêng của template không có chỗ ở sạch (giờ nhồi 144 dòng vào entry). Nhiều template → rối. |
| P5 | **Không validate data / key** | typo `{9` chỉ chết nhờ JS syntax; thiếu key hay sai shape thì **im lặng ra HTML hỏng** | Nhiều người sửa → lỗi lọt tới email gửi khách. |
| P6 | **Không quản trị merge key** | Danh sách key nằm trong đầu người + README thủ công | Template nhiều → không ai biết template X cần key nào; quên điền → `{{key}}` hiện trong inbox. |
| P7 | **Không phân biệt design-system vs template-section** | `macros.njk` (generic) và section (riêng) cùng cấp | Không rõ cái gì tái dùng toàn hệ, cái gì thuộc 1 email. |

**Kết luận review:** nền pipeline tốt, nhưng **mọi thứ đang giả định "chỉ 1 template, 1 brand shape"**.
3 coupling nặng nhất: **P1/P2 (icon+config hard-code), P3 (partial giả-global), P5/P6 (không validate/không quản trị key)**.

---

## 2. Nguyên tắc thiết kế (cho nhiều template khác loại)

1. **3 tầng tái sử dụng, tách bạch rõ:**
   - **Design System (toàn hệ):** tokens, component generic (button/badge/section-title/icon-chip),
     base-head (meta/reset/responsive/font). Mọi template dùng.
   - **Blocks (opt-in, cấp nhóm):** signature, company-legal, footer, hero-variants… **KHÔNG auto-global** —
     template nào cần thì `include`. Marketing dùng signature; transactional có thể không.
   - **Template (colocation):** mỗi email = 1 folder tự chứa: entry + sections + data + meta + assets/icons riêng.

2. **Colocation:** mọi thứ của 1 email nằm 1 folder → thêm = copy folder, xoá = xoá folder, không sót.

3. **Convention hoá:** tên file/entry cố định (`index.mjml.njk`, `content.ts`, `meta.ts`) → build tự khám phá, không cấu hình tay từng cái.

4. **Data & key có hợp đồng (schema + manifest):** validate lúc build; auto-đối chiếu key khai báo vs key thực trong HTML.

5. **Build là thư viện, không phải script:** tách `build/` thành module (discover, icons, render, validate, gallery) — thêm khả năng không phình 1 file.

---

## 3. Cấu trúc thư mục (đã triển khai)

Stack: **MJML** + **Nunjucks** + **TypeScript** (tsx) + **zod**.

```
src/
  design-system/                # TẦNG 1 — toàn hệ, brand-level
    tokens.ts                   #   màu/spacing/typography (1 nguồn, typed)
    head.njk               #   meta + font + responsive
    components/                 #   1 macro / file, generic param-driven
      button.njk  badge.njk  section-title.njk

  blocks/                       # TẦNG 2 — opt-in, chia sẻ giữa các email cùng nhóm
    signature.njk  company-legal.njk  footer.njk
    shared-content.ts           #   data dùng chung cho block (company legal name / UEN / offices)

  emails/                       # TẦNG 3 — mỗi email 1 folder colocation
    supplier-onboarding/
      index.mjml.njk            #   entry: compose base-head + section includes
      sections/                 #   section RIÊNG: hero intro primary-cta why-partner …
      content.ts                #   dữ liệu nội dung (parse qua content.schema.ts)
      content.schema.ts         #   zod shape contract cho content
      meta.ts                   #   metadata: category, subject, requiredKeys
      assets/                   #   ảnh + icons/ (masters) của email này

build/                          # pipeline TypeScript
  main.ts                       #   orchestrator: discover → build → write → gallery
  build-email.ts                #   build 1 email (unit tái dùng, dùng cả trong test)
  create-env.ts                 #   nunjucks env (build + test chung)
  discover-emails.ts            #   quét src/emails/*/ → danh sách
  render-email.ts               #   nunjucks → mjml → html + trích key/asset
  validate-email.ts             #   zod meta + đối chiếu merge key
  write-gallery.ts · schema.ts · config.ts · mjml.d.ts

test/                           # snapshot test (build + diff vs __snapshots__/)
dist/                           # output (generated, .gitignore)
docs/                           # tokens, architecture, list-unsubscribe…
```

### Quy ước đặt tên (chuẩn high-level)
- **Folder & file:** `kebab-case` (`supplier-onboarding`, `company-legal.njk`, `build-email.ts`).
- **Entry template:** luôn `index.mjml.njk` (build tìm theo tên này, không cần cấu hình).
- **Data/metadata:** `content.ts` + `content.schema.ts` + `meta.ts` cạnh entry.
- **Hàm** camelCase động từ (`renderEmail`, `discoverEmails`); **type** PascalCase (`EmailMeta`);
  **hằng** UPPER_SNAKE (`EMAILS_DIR`); **context template** `tokens` / `content` / `meta`.
- **Component generic:** danh từ chức năng, không dính brand/nội dung (`button.njk`, không `orange-cta.njk`).
- **Block opt-in:** tên theo vai trò (`signature`, `footer`).
- **Section riêng:** tên theo nội dung email đó (`why-partner`, `equipment`).
- **Merge key:** `snake_case`, có namespace theo thực thể: `sender_*`, `company_name`, `unsubscribe`.
- **Category (trong meta):** `marketing` | `transactional` | `lifecycle` — quyết định block nào áp.

---

## 4. Hợp đồng dữ liệu & quản trị key (giải P5/P6)

Mỗi email khai báo `meta.ts`:
```js
export const meta = {
  category: 'marketing',
  subject: 'Reach qualified buyers across Southeast Asia',
  preview: { key: 'preview_text', fallback: 'No listing fee. …' },
  requiredKeys: ['company_name', 'sender_name', 'sender_email', 'unsubscribe', …],
};
```
Build (`validate.mjs`) làm 2 việc **fail-fast**:
1. **Schema check data** (zod hoặc JSON Schema): thiếu field / sai kiểu → fail build (bắt luôn lỗi kiểu `{9`, thiếu ảnh…).
2. **Key reconciliation:** regex trích mọi `{{key}}` trong HTML build ra → so với `requiredKeys`.
   - Key xuất hiện nhưng **không khai báo** → fail (quên document).
   - Key khai báo nhưng **không dùng** → warn (thừa).
   → Tự động trả lời câu "template này cần key nào", không phụ thuộc trí nhớ/README tay.

---

## 5. Trade-offs công nghệ

| Quyết định | Lựa chọn | Trade-off | Khuyến nghị |
|---|---|---|---|
| Engine render | **MJML + Nunjucks** (giữ) vs react-email vs Maizzle | react-email: component + TS type xịn, nhưng **viết lại toàn bộ** + rủi ro Outlook so với MJML; Maizzle: Tailwind, cũng viết lại | **Giữ MJML** — đã chạy tốt, chống Outlook tốt, chỉ cần module hoá. Không viết lại. |
| Type safety | JS + **zod schema** cho data vs full TypeScript | Full TS: an toàn nhất nhưng thêm bước build + học phí; zod: bắt lỗi data runtime lúc build, rẻ | **zod cho data + JSDoc**. Cân nhắc TS cho `build/` khi pipeline lớn. Không full-TS vội. |
| Config trình bày (chip/icon size) | Đưa vào **meta.ts per-email** vs global build | Global = P2 (bãi rác). Per-email = đúng chỗ nhưng lặp nếu nhiều email giống | Per-email trong `meta.ts`, default hợp lý ở design-system. |
| i18n (đa ngôn ngữ) | Chưa làm vs data keyed theo locale | Làm sớm = phức tạp thừa; làm muộn = refactor data | **Thiết kế data cho phép** (`data.en.js`/`data.vi.js` khi cần), **chưa build** tới khi có yêu cầu. YAGNI. |
| Content ops | content.ts (dev sửa) vs CMS/YAML (non-dev) | CMS = hạ tầng lớn; YAML = trung gian | Giữ `content.ts`. Khi marketing tự sửa copy nhiều → tách `content.yaml`. Chưa cần. |
| dist/ trong repo | Commit vs build-only | Commit = tiện copy/diff; artifact bẩn git | Giữ commit (đội nhỏ, cần copy nhanh). Có `.gitignore` note để đổi sau. |

---

## 6. Quality gates (nâng chất lượng)

- **Lint:** MJML validation (đã có) + `htmlhint` cho HTML output.
- **Schema + key reconciliation** (mục 4) — fail build.
- **Size budget per-email:** hiện chỉ warn >102KB (`build.mjs:111`) → nâng thành **fail** có ngưỡng trong meta.
- **Snapshot test:** lưu HTML output làm snapshot; đổi ngoài ý muốn → test đỏ (chống regression khi sửa design-system ảnh hưởng nhiều email).
- **Cross-client:** tích hợp Litmus/Email on Acid (hoặc gửi tài khoản thật) — cổng thủ công trước khi ship.
- **Preheader/asset check:** cảnh báo nếu còn `placehold.co` hoặc `../assets` (relative) trong HTML build (tránh ship ảnh vỡ — đúng lỗi đang gặp).

---

## 7. Lộ trình migrate (tăng dần, không big-bang)

Giữ template hiện tại chạy suốt quá trình.

- ✅ **Giai đoạn 0 (DONE):** tách `build.mjs` → `build/` module (`config/discover/icons/render/gallery/index`).
  Bỏ hard-code `ICON_DIR`/chip config → nhận theo từng email qua `meta.icons`.
- ✅ **Giai đoạn 1 (DONE):** colocation `src/emails/supplier-onboarding/` (index+data+meta+assets).
  Build discover theo folder (`discover.mjs`).
- ✅ **Giai đoạn 2 (DONE cùng GĐ1):** tách 3 tầng `design-system/` + `blocks/` + `emails/`.
- 🟡 **Giai đoạn 3 (một phần):** đã có **key reconciliation** (`requiredKeys` vs `{{keys}}` — fail build)
  + **asset/placeholder warn** trong `build/main.ts`. Còn lại: **zod schema cho data** + size-budget fail.
- ⬜ **Giai đoạn 4 (khi cần):** i18n, CMS content — chỉ khi có yêu cầu thật. (snapshot test: DONE)

**Cập nhật khi thêm `buyer-invitation` (email #2):** ban đầu tưởng "EQUIPMENT WE COVER → footer"
dùng chung nên đã nâng `equipment.njk` + `secondary-cta.njk` lên `blocks/`; chốt lại thì
buyer-invitation **không** dùng 2 section đó (không có lưới equipment, không có closing CTA
"BECOME AN OFFICIAL SUPPLIER", không có QR trong signature) → đã trả cả hai về
`emails/supplier-onboarding/sections/`.

Bài học, đúng với P3 ở mục 1: **chỉ đưa lên `blocks/` khi ≥2 email thật sự render**, không đưa lên
vì "chắc sẽ dùng chung". `secondary-cta.njk` còn chứa copy riêng của supplier ("BECOME AN OFFICIAL
SUPPLIER") — nằm ở `blocks/` sẽ tái tạo đúng cái bẫy "partial giả-global".

Phần thực sự chung giữa 2 email: `signature` · `company-legal` · `footer`, dữ liệu company/offices
gom về `blocks/shared-content.ts` (trước đó bị copy-paste ở cả 2 `content.ts`).

**Nguyên tắc chống over-engineer:** GĐ 0-1 làm ngay (trả nợ coupling P1-P4). GĐ 3 làm khi có
template thứ 2-3 (governance mới đáng). GĐ 4 chỉ khi nghiệp vụ yêu cầu.

---

## 8. Tóm tắt điều nên làm NGAY (khi có template #2)

1. Bỏ hard-code icon dir + config trình bày ra khỏi build toàn cục (P1/P2).
2. Chuyển sang **colocation** `src/emails/<name>/` (P4).
3. Tách **3 tầng** design-system / blocks / email (P3/P7).
4. Thêm **validate schema + key reconciliation** (P5/P6).

Những cái này trả hết nợ coupling và biến "quản trị key" từ thủ công → tự động.
```

---

## 9. Responsive columns — two mechanisms, on purpose

Multi-column sections must lay out side-by-side on desktop and stack on mobile, across clients that
handle CSS very differently. MJML's default is **mobile-first**: each column is inline `width:100%`
and a `@media(min-width:480px)` rule widens it. That breaks in clients that drop `<style>`/media
queries — **New Outlook / Outlook webview** and **Gmail on non-Google accounts (GANGA)** — where the
columns stay `width:100%` and collapse to one stack even on desktop. Two patterns fix this:

- **Fluid-hybrid (`mw-<px>`)** — the default for real columns (hero, CTA pair, benefits, feature/
  equipment grids). The column keeps inline `width:100%` and gets an inline `max-width:<px>` injected
  at build time (`applyFluidMaxWidth` in `build/html-transforms.ts`, triggered by an `mw-<px>` css-
  class). With no media query, a wide viewport sits columns side-by-side and a narrow one reflows —
  correct in New Outlook *and* GANGA. A `max-width:479` rule in `head.njk` drops the cap for clean
  full-width stacking on media-query mobile clients. `<px>` = round(width% × section content width);
  it's coupled to the column's width/padding — `npm run simulate` is the guard.

- **`mj-group`** — used only where columns must stay side-by-side at *every* width (the proof-panel
  stats: two short numbers that read fine as 2-across on mobile). mj-group emits an inline `width:%`,
  so it never stacks. Don't use it for anything that must reflow on mobile.

Rule of thumb: **reach for `mw-<px>` (fluid-hybrid) by default; use `mj-group` only for
never-stack pairs.** Verify both New Outlook and GANGA via `npm run simulate` (docs/email-testing.md
§2b) whenever you touch a column's width, padding, or `mw-` value.
