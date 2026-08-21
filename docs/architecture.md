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
| dist/ trong repo | Commit vs build-only | Commit = tiện copy/diff; artifact bẩn git | **CHỐT: build-only.** `dist/` đã vào `.gitignore`; CI (`pages.yml`) build lại và deploy lên GitHub Pages mỗi lần push `main`, nên preview luôn tươi và git không chứa artifact. (Mục này trước đây ghi "giữ commit" — sai so với thực tế.) |

---

## 6. Quality gates

Nguyên tắc: **thứ gì hỏng âm thầm thì phải fail build; thứ gì cần mắt người thì warn.**

### FAIL build (`npm run build`, và `npm run validate` mà CI chạy trên cả PR lẫn main)

| Gate | Vì sao fatal | Ở đâu |
|---|---|---|
| zod schema `meta.ts` + `content.ts` | shape sai → HTML hỏng | `validate-email.ts`, mỗi `content.schema.ts` |
| MJML error | output hỏng | `render-email.ts` |
| `{{key}}` render mà không khai trong `requiredKeys` | danh sách key nói dối | `reconcileMergeKeys` (kể cả key chỉ dùng trong `{{#if}}`) |
| breakpoint thứ hai xuất hiện trong output | email có 2 trạng thái; mốc thứ 3 là tư duy web-CSS | `assertSingleBreakpoint` |
| cột `fluid` không nhận được `max-width` inline | cột sẽ stack trên desktop ở New Outlook/GANGA — vô hình với mọi preview | `assertFluidInjected` |
| email `marketing` không có `{{unsubscribe}}` | CAN-SPAM / GDPR / NĐ91 | `requireOptOut` |
| `adLabel` set nhưng subject không mở đầu bằng nó | NĐ91 Điều 18 yêu cầu nhãn ở vị trí 0 | `emailMetaSchema.refine` |
| >102 KB (đo body đã quoted-printable ×1.04, không phải file thô) | Gmail clip đuôi và ẩn luôn unsubscribe | `lint-compat.ts` |
| SVG **đã host** trong `<img>` | URL hợp lệ nên mọi check asset đều pass, mà Gmail/Outlook không render gì | `lint-compat.ts` |
| flex/grid, `position:absolute`, `<script>/<form>`, thiếu doctype, `<img>` thiếu `width` attribute | vỡ layout ở client chính | `lint-compat.ts` |
| snapshot HTML lệch | chống regression khi sửa design-system ảnh hưởng nhiều email | `test/snapshot.test.ts` |

### WARN (cố ý không fail — cần người quyết)

- Asset chưa host / host non-prod / còn `placehold.co`.
- Asset **không retina** cho kích thước nó render, hoặc vượt 200 KB/ảnh.
- SVG master còn ở dạng repo-relative (bình thường lúc dev, phải rasterize trước campaign).
- Email `marketing` không có `adLabel` — để việc bỏ nhãn luôn là lựa chọn có ý thức.
- Key khai mà không render.

### Cổng KHÔNG máy nào thay được

- **Render thật ở 2 chiều rộng.** Bug 1-across-nửa-trái (mục 9.6) đi qua *toàn bộ* bảng trên mà vẫn
  xanh. Mở `dist/<name>.preview.html` ở 700px và 390px sau mỗi lần sửa cột.
- **`dist/sim/`** cho New Outlook + GANGA (build ghi sẵn, gallery có link).
- **Gửi thật / Litmus – Email on Acid** cho Word engine của Outlook desktop.

---

## 7. Lộ trình migrate (tăng dần, không big-bang)

Giữ template hiện tại chạy suốt quá trình.

- ✅ **Giai đoạn 0 (DONE):** tách `build.mjs` → `build/` module (`config/discover/icons/render/gallery/index`).
  Bỏ hard-code `ICON_DIR`/chip config → nhận theo từng email qua `meta.icons`.
- ✅ **Giai đoạn 1 (DONE):** colocation `src/emails/supplier-onboarding/` (index+data+meta+assets).
  Build discover theo folder (`discover.mjs`).
- ✅ **Giai đoạn 2 (DONE cùng GĐ1):** tách 3 tầng `design-system/` + `blocks/` + `emails/`.
- ✅ **Giai đoạn 3 (DONE):** key reconciliation (kể cả key chỉ dùng trong `{{#if}}`), zod schema cho
  data + meta, size-budget fail theo size đã encode, và thêm 3 invariant mới fail-build:
  **một breakpoint duy nhất**, **mọi cột `fluid` phải có max-width inline**, và **email marketing
  phải có opt-out**. Cộng thêm advisory: asset không retina / quá nặng / SVG chưa rasterize.
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

## 9. Responsive — một breakpoint, ba pattern

Email chỉ có **hai trạng thái layout**: desktop multi-column và mobile stack. Không có thang
sm/md/lg/xl, và thêm mốc thứ ba **fail build** (`assertSingleBreakpoint`) — Outlook desktop không đọc
media query nào cả, còn client đọc được cũng chẳng cho ta thứ gì mà "tuning theo thiết bị" dùng được.

### 9.1 Breakpoint khai báo một lần

`src/design-system/head.njk`:

```njk
<mj-breakpoint width="480px" />
```

Đây là thứ làm `mj-column` stack: MJML compile nó thành các rule `min-width:480px` để nới cột ra ở
desktop. Khối `@media (max-width:479px)` duy nhất trong cùng file (479 = 480 − 1) là **nửa còn lại
của cùng một breakpoint**. `BREAKPOINT_PX` (`build/config.ts`) là con số duy nhất mà cả hai được đối
chiếu — nên chúng không thể lệch nhau mà không ai biết.

### 9.2 Lỗ mà `mj-breakpoint` một mình không lấp được

Hai họ client **xoá `<style>`** trước khi render, nên không bao giờ thấy media query đó:

- **New Outlook / Outlook webview** — bỏ `@media` *và* ghost table `[if mso]`.
- **Gmail trên tài khoản non-Google (GANGA)** — xoá toàn bộ `<style>`.

Ở đó cột giữ nguyên `width:100%` inline của MJML và **stack cả trên màn hình desktop**. Vậy nên
breakpoint là *cần* nhưng *không đủ* — và đây là lý do fluid-hybrid tồn tại, không phải sở thích.

### 9.3 Pattern A — cột thật, stack trên mobile: `mj-column` + `css-class="fluid"`

Mặc định. Chỉ đánh dấu, không con số:

```njk
<mj-column css-class="fluid" width="50%">…</mj-column>
```

`fluid` **không mang số**. Lúc build, `applyFluidMaxWidth` đọc đúng cái `width:<px>` mà MJML đã tự
ghi vào ghost table Outlook cho cột đó, rồi mirror sang cột thành `max-width` inline. Kết hợp với
`width:100%` inline của MJML: viewport rộng → side-by-side, viewport hẹp → reflow, **không cần media
query** → đúng ở cả New Outlook và GANGA. Dưới breakpoint, rule `.fluid` bỏ cap để stack full-width.

Vì px được **suy ra từ chính layout pass của MJML**, đổi padding của section là nó tự đổi theo. Không
có gì phải giữ đồng bộ, không magic constant, và **Nunjucks không tính gì cả** — trước đây
`mw(50, 536)` bắt Nunjucks làm toán responsive với `536` gõ tay, coupling với padding, không ai canh.

Nếu output của MJML đổi shape, `assertFluidInjected` **fail build** thay vì âm thầm ship cột không
cap — hỏng kiểu đó chỉ hiện ra ở đúng hai client mà không preview nào nhìn thấy.

### 9.4 Pattern B — bảng dữ liệu KHÔNG được stack: `mj-table`

Một dòng line-item không phải một cột layout: ba ô phải nằm cùng dòng ở mọi width. Dùng một
`mj-table` với width ô khai báo rõ, **không** `fluid`, không rule stack; nó co lại bằng cách cho
wrap đúng ô chịu được (`emails/order-confirmation/sections/items.njk`).

### 9.5 Pattern C — cặp không bao giờ stack: `mj-group`

`mj-group` phát ra `width:%` inline nên cột trong đó không stack ở bất kỳ width nào. Chỉ dùng cho
đúng việc đó (2 con số ở proof panel của buyer — đọc 2-across trên điện thoại vẫn ổn), tuyệt đối
không dùng cho thứ cần reflow.

### 9.6 Style riêng cho mobile

Đặt trong **một** khối `max-width:479px`, key theo `css-class` của mình — **không** theo class
`.mj-column-per-*` do MJML sinh ra: nó dùng chung cho mọi cột cùng phần trăm và đổi khi ta đổi width.
Và nhớ giới hạn của loại rule này: **Outlook desktop không đọc**, New Outlook + GANGA cũng không —
nên CSS mobile chỉ để tinh chỉnh (gutter, cỡ chữ), **không bao giờ** để giữ layout. Layout nằm ở
`fluid` + MJML.

**CÁI BẪY (đã cắn một lần, ghi lại để không cắn lần hai).** Rule `.fluid` ở mobile set
`display:block` — đúng cho cột đi full-width. Nhưng nếu bạn thu một cột `fluid` để nó nằm
**N-across** trên mobile thì phải khôi phục `display:inline-block !important`: một **block** rộng 50%
vẫn xếp dọc, nên ghi đè `width` một mình sẽ cho ra một cột nhồi trong nửa trái màn hình, nửa phải bỏ
trống.

Lần đầu chính là lúc gộp `.cta-col/.hero-col/.benefit-col/.hero-s-col` + `.eq-col/.feat-col` thành
một rule `.fluid`: trước đó `.eq-col/.feat-col` **cố tình** không nằm trong danh sách `display:block`,
nên chúng giữ `inline-block` của MJML và xếp 2-across. Gộp lại là cấp `display:block` cho chúng —
lưới feature/equipment của supplier vỡ thành 1-across nửa trái, email dài thêm **647px**.

Điều đáng nhớ hơn cả bản fix: **lỗi này không hiện ra trong HTML build, không có gate nào bắt được,
và `npm run validate` vẫn xanh.** Chỉ render mới thấy. Nên sau khi thêm/sửa một override n-across,
mở `dist/<name>.preview.html` ở 390px mà xem.

**Hệ quả liên quan:** `office-col` (`blocks/company-legal.njk`) từng là cặp cột duy nhất thiếu
`fluid` → 2 địa chỉ office stack cả trên desktop ở New Outlook/GANGA trong khi mọi cặp khác thì
không. Đã thêm `fluid`. Giờ **mọi** cặp cột trong hệ thống đều dùng cùng một cơ chế, không còn ngoại
lệ nào phải nhớ.

### 9.7 Reserve chiều cao: phải đặt trên `div`, không phải `td`

`min-height` **không áp dụng cho table cell** (CSS 2.1 §10.7), mà MJML đặt `css-class` của `mj-text`
lên `<td>`. Nên `.feat-title { min-height: 44px }` là **dead code** — nó tồn tại để căn các mô tả
feature cho thẳng hàng và chưa từng căn được gì. `mj-text` render `<td><div>…</div></td>`, nên
reservation phải nằm trên div: `.feat-title div { … }`. Cùng pattern với `.stat-num div` vốn đã đúng.

Và bỏ hết reservation ở khối mobile: ở 2-across (~180px/cột) mọi title/label đều vừa một dòng, giữ
lại chỉ thêm ~100px khoảng trắng cho một vấn đề mobile không có.

### 9.8 Vai trò của Nunjucks

Nunjucks **chỉ** inject nội dung: copy, URL asset, và loop danh sách (`{% for %}`, filter `batch(2)`
để chia hàng). Nó không sở hữu breakpoint, không tính width, không quyết định stack — đó là việc của
MJML lúc compile và của `applyFluidMaxWidth` lúc post-render. `createEnv()` **không đăng ký global
layout nào** cho đúng lý do này: một template cần tính px là template đang làm việc của MJML.

> Lưu ý về loop line-item: `{% for %}` chạy lúc **build**, nên nó là dữ liệu mẫu cố định — đúng cho
> preview, sai cho send thật (mỗi người nhận một đơn khác nhau). Ở production thay bằng block repeat
> của hệ thống gửi, nó đi xuyên build y như `{{merge_key}}`. Markup không đổi, chỉ đổi ai lặp.

### 9.9 Kiểm chứng

`dist/sim/<name>.newoutlook.html` (xoá media query) và `.ganga.html` (xoá `<style>`) được ghi ra
**mỗi lần build**, và có link ngay trong gallery. Mở `.newoutlook.html` ở ~700px và `.ganga.html` ở
~390px mỗi khi sửa width/padding của cột: layout phải giữ. Chi tiết + ma trận gửi thật:
`docs/email-testing.md`.
