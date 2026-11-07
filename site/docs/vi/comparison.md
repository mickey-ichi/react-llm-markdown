# So sánh

react-llm-markdown đặt cạnh các renderer Markdown phổ biến. Thông tin được kiểm tra ngày 2026-11-07 dựa trên README,
tài liệu và mã nguồn đã phát hành của từng dự án; nếu có sai sót, hãy mở
[issue](https://github.com/mickey-ichi/react-llm-markdown/issues).

Trên web, react-llm-markdown được xây **trên** Streamdown: nó kế thừa phần lõi streaming và render, rồi bổ sung phần còn
lại.

## Web

| | react-llm-markdown | [Streamdown](https://streamdown.ai) | [react-markdown](https://github.com/remarkjs/react-markdown) |
|---|---|---|---|
| Sửa Markdown khi đang stream | ✅ kể cả bảng dở dang và marker treo | ✅ ([remend](https://github.com/vercel/streamdown)) | — |
| Bảng GFM, task list, footnote | ✅ | ✅ | qua `remark-gfm` |
| Highlight code | ✅ Shiki | qua `@streamdown/code` (Shiki) | tự tích hợp |
| Công thức toán | ✅ KaTeX, cả `\( \)` / `\[ \]` | qua `@streamdown/math` | qua `remark-math` + `rehype-katex` |
| Sơ đồ Mermaid | ✅ chế độ strict, bỏ directive | qua `@streamdown/mermaid` | — |
| Biểu đồ từ code fence | ✅ ECharts, có allowlist option và giới hạn | qua custom renderer | — |
| HTML thô | được sanitize | được sanitize (schema GitHub) | tắt mặc định; bật bằng `rehype-raw` + `rehype-sanitize` |
| Chặn link `javascript:` | ✅ | ✅ | ✅ |
| Allowlist link / ảnh | chặt mặc định (http, https, mailto, tương đối); hook `isImageAllowed` | có, mặc định `*` | tự viết `urlTransform` |
| Style | CSS dựng sẵn, có prefix | cần cài Tailwind (`@source`) và biến shadcn/ui | không style |
| Giấy phép | MIT | Apache-2.0 | MIT |

react-llm-markdown còn chạy [27 payload tấn công](test-report) với cả hai renderer trên trình duyệt thật ở mỗi thay đổi.

## React Native

| | react-llm-markdown | [react-native-marked](https://github.com/gmsgowtham/react-native-marked) | [react-native-markdown-display (bản fork RonRadtke)](https://github.com/RonRadtke/react-native-markdown-display) |
|---|---|---|---|
| View native | ✅ | ✅ | ✅ |
| Sửa Markdown khi đang stream | ✅ cùng quy tắc với web | — | chỉ đóng code fence đang mở |
| Bảng GFM / task list / footnote | ✅ / ✅ / ✅ | ✅ / — / — | ✅ / — / — |
| Highlight code | ✅ Shiki (engine JS, Hermes) | custom renderer | ✅ prism-react-renderer |
| Toán, Mermaid, biểu đồ | ✅ trong WebView sandbox (CSP, script ghim phiên bản kèm SRI) | — | — |
| HTML thô | hiện dạng text | hiện dạng text | tắt |
| Chặn link `javascript:` | ✅ (chỉ http, https, mailto) | không có trong tài liệu | ✅ (markdown-it) |
| Allowlist ảnh | `isImageAllowed` | — | `allowedImageHandlers` |
| Expo Go | ✅ | ✅ | cần font icon |
| Cùng parser và quy tắc với web | ✅ | — | — |

Bản gốc `react-native-markdown-display` (phát hành lần cuối năm 2023) ghi trong README rằng dự án không còn được bảo
trì tích cực.

## Khi nào nên chọn thư viện khác

- **react-markdown** — bạn render Markdown đáng tin, đã hoàn chỉnh trên web và muốn khối xây dựng nhỏ gọn, lâu đời nhất
  cùng toàn bộ hệ sinh thái plugin unified.
- **Streamdown** — app của bạn đã dùng Tailwind và shadcn/ui, chỉ chạy trên web, và bạn muốn mặc định của nó cùng chính
  sách bảo mật do bạn tự cấu hình.
- **react-native-marked** — bạn chỉ cần hiển thị Markdown dạng chữ trong app React Native (không stream, không toán hay
  sơ đồ), với ít phụ thuộc nhất.

Hãy chọn react-llm-markdown khi Markdown đến từ một model: nó được stream, có thể bị prompt injection điều khiển, và bạn
muốn cùng các khối nội dung phong phú và cùng quy tắc bảo mật trên trình duyệt lẫn điện thoại.
