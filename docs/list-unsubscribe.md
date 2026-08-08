# List-Unsubscribe — spec cho team gửi mail

Mục tiêu: hiện nút **"Huỷ đăng ký / Unsubscribe"** ngay ở hàng inbox của Gmail/Apple Mail
(khi người nhận **chưa mở** email). Đây là cấu hình **header + hạ tầng gửi**, KHÔNG nằm trong
file HTML template.

---

## 1. Hai header cần thêm vào MỖI email gửi ra

```
List-Unsubscribe: <https://comacpro.net/unsubscribe?token=RECIPIENT_TOKEN>, <mailto:unsubscribe@comacpro.net?subject=unsubscribe>
List-Unsubscribe-Post: List-Unsubscribe=One-Click
```

- `List-Unsubscribe`: chứa 2 phương thức, cách nhau bởi dấu phẩy, mỗi cái trong `< >`:
  1. **URL https** (bắt buộc để có nút 1-click) — thay `RECIPIENT_TOKEN` bằng token riêng của
     từng người nhận, **trùng đúng link đang dùng ở `{{unsubscribe}}`** trong footer email.
  2. **mailto** (dự phòng cho client không hỗ trợ 1-click).
- `List-Unsubscribe-Post`: giá trị phải **chính xác** là `List-Unsubscribe=One-Click`
  (chuẩn RFC 8058). Không đổi chữ.

> Giữ URL trong header **giống hệt** `{{unsubscribe}}` ở footer để nhất quán 1 nguồn huỷ.

---

## 2. Endpoint huỷ đăng ký phải xử lý được POST (yêu cầu của 1-click)

Khi người dùng bấm nút ở inbox, Gmail/Apple gửi một **HTTP POST** tới URL https đó:

- Method: `POST`
- Content-Type: `application/x-www-form-urlencoded`
- Body: `List-Unsubscribe=One-Click`

Endpoint phải:
- Nhận POST và **huỷ ngay** người nhận ứng với `token` — **không** bắt đăng nhập, **không** trang
  xác nhận trung gian (1-click = huỷ luôn).
- Trả `200 OK`.
- Vẫn nên hỗ trợ `GET` (mở bằng trình duyệt) cho link ở footer email.

---

## 3. Điều kiện để Gmail CHỊU hiện nút (quan trọng — thiếu là không hiện)

Header đúng vẫn **chưa đủ**. Email phải được **xác thực đầy đủ**:

1. **SPF** pass cho domain gửi.
2. **DKIM** pass và **aligned** với domain ở `From:` (vd `From: ...@comacpro.net` thì DKIM ký
   bằng `comacpro.net`).
3. **DMARC** có policy và pass.
4. Uy tín người gửi tốt (IP/domain không dính spam), gửi từ domain nhất quán.

Từ 2024, Google & Yahoo **bắt buộc** one-click unsubscribe cho bulk sender (>5000 mail/ngày) —
làm cái này vừa được nút, vừa đúng chính sách, vừa tăng deliverability.

---

## 4. Cách test

1. Gửi 1 email thật tới 1 hòm Gmail.
2. Ở **danh sách inbox** (chưa mở mail) → thấy nút **"Huỷ đăng ký"** cạnh tên người gửi.
3. Kiểm header đã đi kèm: mở mail → ⋮ → **Show original** → phải thấy cả 2 header
   `List-Unsubscribe` và `List-Unsubscribe-Post`, và phần **SPF / DKIM / DMARC = PASS**.
4. Bấm thử nút → xác nhận endpoint huỷ đúng người (theo token) và trả 200.

Nếu nút KHÔNG hiện: gần như luôn là do **DKIM chưa aligned / DMARC chưa pass** — kiểm mục 3 trước.

---

## Tóm tắt bàn giao
- [ ] Thêm 2 header ở mục 1 vào mọi email (URL token theo từng người, khớp `{{unsubscribe}}`).
- [ ] Endpoint `/unsubscribe` xử lý POST `List-Unsubscribe=One-Click`, huỷ 1-click, trả 200.
- [ ] Xác nhận SPF + DKIM(aligned) + DMARC pass.
- [ ] Test bằng Show original trên Gmail.
