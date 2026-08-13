# Nhãn quảng cáo & chính sách gắn nhãn theo vùng (Note gửi Legal)

**Bối cảnh (đã cập nhật):** danh sách người nhận là **global / quốc tế**, cold-sourced. Trước đây
giả định "người nhận ở VN" nên áp Nghị định 91/2020 (NĐ91) cho mọi email; giả định đó **không còn
đúng**. Note này thay thế bản "[QC] vs [AD]" trước.

**TL;DR:** Nhãn quảng cáo `[QC]`/`[AD]` là yêu cầu **của VN** (NĐ91 Điều 18), không phải chuẩn toàn
cầu. Với tệp global, ép nhãn VN lên mọi người nhận là **thừa** (không luật nào ngoài VN đòi, lại hại
engagement) và **thiếu** (mỗi vùng có quy định riêng mà một cái nhãn không phủ được). Hướng đúng:
**nhãn theo vùng, quyết ở tầng gửi (segment)**, template để subject sạch. Cần Legal (1) map các vùng
tài phán áp dụng, (2) xác nhận cơ chế nhãn/consent từng vùng, (3) trả lời câu hỏi cuối.

---

## 1. Nguyên tắc: nhãn là chuyện per-recipient, không phải per-template

Một template = một subject, nhưng một danh sách global gồm nhiều vùng tài phán khác nhau → **không
thể** nướng cứng một nhãn vào subject cho tất cả. Nhãn đúng phụ thuộc **nơi người nhận ở**, thứ chỉ
tầng gửi biết. Vì vậy:

- **Template/build:** subject để **sạch** (không nhãn). Build chỉ *xác thực* nhãn nếu một campaign
  khai báo có (xem mục 4), và *cảnh báo* nếu email marketing không khai nhãn — để việc bỏ nhãn luôn
  là quyết định có ý thức.
- **Sending system (khuyến nghị):** **segment theo vùng** và prepend đúng nhãn cho từng nhóm — nhóm
  VN nhận `[QC]`, nhóm ngoài VN không nhận nhãn VN (theo luật vùng đó).

## 2. Ma trận vùng tài phán (cần Legal xác nhận & bổ sung)

Đây là điểm "thiếu" khi tệp là global — một nhãn VN không thay được khung của các vùng khác. Dưới đây
là *hiểu biết sơ bộ, không phải kết luận pháp lý* — Legal cần đối chiếu văn bản gốc:

| Vùng | Nhãn subject | Cơ chế đồng ý | Ghi chú |
|---|---|---|---|
| **Việt Nam** (NĐ91) | `[QC]` hoặc `[AD]` ở đầu subject (Đ.18) | Opt-in trước (Đ.13) | + thông tin người quảng cáo (Đ.19) + email xác nhận hủy |
| **US** (CAN-SPAM) | Không có nhãn bracket bắt buộc | Opt-**out** cho phép | Cần địa chỉ bưu chính thật + header From chính xác + cơ chế unsubscribe |
| **EU/EEA** (GDPR + ePrivacy) | Không | B2C: **consent trước**; B2B tùy quốc gia thành viên | Cold B2B email bị siết ở nhiều nước EU |
| **Singapore** (PDPA + Spam Control Act) | ⚠️ có thể yêu cầu nhãn kiểu `<ADV>` cho message thương mại không mời | Opt-out + unsubscribe | **Đặc biệt liên quan: người gửi là pháp nhân SG** (COMACPRO GLOBAL PTE. LTD.) — Legal xác nhận |

> Việc NĐ91 (hay luật SG do người gửi là pháp nhân SG) "với tới" người nhận ngoài vùng đó hay không là
> câu hỏi jurisdiction thuần pháp lý — tôi không kết luận.

## 3. `[QC]` vs `[AD]` — chỉ còn liên quan tới nhóm người nhận VN

Nhãn chỉ **bắt buộc** cho nhóm VN (NĐ91). Với nhóm đó, `[QC]` (tiếng Việt) là dấu hiệu mà người nhận
VN nhận diện tức thì là "quảng cáo bắt buộc" → **khuyến nghị `[QC]` cho segment VN**, kể cả khi thân
email tiếng Anh. Người nhận **ngoài VN không cần nhãn VN** nào cả.

Chỉ khi **không thể segment** và buộc dùng một nhãn cho tất cả: `[AD]` dễ chấp nhận với tệp quốc tế
hơn — nhưng đây là phương án over-compliant (gắn nhãn cho người không cần), hại open rate, nên tránh
nếu có thể segment.

## 4. Hiện trạng kỹ thuật (đã cập nhật theo hướng global)

- Nhãn giờ là **opt-in per email**: field `meta.adLabel` nhận `'[QC]'` hoặc `'[AD]'`.
  - **Khai `adLabel`** → build **fail** nếu subject không bắt đầu bằng đúng nhãn đó (không đặt sai vị trí được).
  - **Không khai** → không bắt buộc, nhưng email `category: marketing` không có nhãn sẽ ra **cảnh báo**
    build ("confirm audience needs no advertising label…") — bỏ nhãn không thể xảy ra âm thầm.
- Hai template hiện tại để **subject sạch, không `adLabel`** (mặc định global). Campaign nào nhắm VN thì
  set `adLabel: '[QC]'` và prepend vào subject, hoặc để sending system chèn theo segment.
- Đổi nhãn cho phép ở một chỗ: hằng `AD_LABELS` trong `build/schema.ts`.

## 5. Cần Legal xác nhận

1. Các vùng tài phán nào thực sự áp cho campaign này (theo nơi người nhận và/hoặc nơi người gửi là SG)?
2. Ma trận mục 2 đúng đến đâu — đặc biệt: **luật Singapore** có buộc nhãn (kiểu `<ADV>`) không, vì người
   gửi là pháp nhân SG?
3. Chiến lược: **segment theo vùng** (đúng nhất) hay **một chính sách cho tất cả**? Nếu segment, xác nhận
   nhóm VN dùng `[QC]`.
4. Với nhóm EU/US: cold outreach hiện tại có đáp ứng consent (EU) / opt-out + địa chỉ bưu chính (US) chưa —
   footer đang có địa chỉ SG+VN, unsubscribe (RFC 8058), và `sourceBasis` disclosure.

## Nguồn (NĐ91 Điều 18 — nhãn `[QC]`/`[AD]`, đặt đầu subject)

- [Điều 18 — hethongphapluat.com](https://hethongphapluat.com/nghi-dinh-91-2020-nd-cp-ve-chong-tin-nhan-rac-thu-dien-tu-rac-cuoc-goi-rac/dieu-18)
- [Nghị định 91/2020/NĐ-CP — luatvietnam.vn](https://luatvietnam.vn/thong-tin/nghi-dinh-91-2020-nd-cp-chong-tin-nhan-rac-thu-dien-tu-rac-cuoc-goi-rac-189003-d1.html)
