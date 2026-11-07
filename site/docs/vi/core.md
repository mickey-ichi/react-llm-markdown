# Core API

`react-llm-markdown/core` là phần không phụ thuộc DOM mà cả hai renderer dùng chung. Nó chạy ở bất cứ đâu JavaScript chạy
được — Node, worker, React Native — và mọi export của nó cũng có sẵn từ entry web và native.

## Parse

```ts
import { parseMarkdown, prepareMarkdown } from 'react-llm-markdown/core';

const tree = parseMarkdown(text, { streaming: true });
```

| Hàm | |
|---|---|
| `parseMarkdown(source, options?)` | Parse thành cây [mdast](https://github.com/syntax-tree/mdast): GFM, công thức toán `$$`, emphasis CJK, có áp dụng bước chuẩn bị bên dưới và chính sách URL. Option: `streaming`, `softBreaks` (mặc định `true`), `cjk` (mặc định `true`). |
| `prepareMarkdown(source, { streaming? })` | Bước xử lý ở mức mã nguồn mà mọi renderer đều chạy: vô hiệu hoá link protocol-relative, loại bỏ phần ghi đè config của Mermaid, chuyển đổi delimiter LaTeX và — khi đang streaming — sửa Markdown chưa hoàn chỉnh. |
| `normalizeLatexDelimiters(source)` | `\( … \)` / `\[ … \]` → `$$`, chỉ khi nội dung trông giống công thức toán, không bao giờ áp dụng bên trong code. |
| `stripDanglingMarker(text)` | Ẩn `**`, `_`, `` ` `` hoặc `~~` mà stream đã mở nhưng chưa có nội dung. |
| `remarkSoftBreaks()` | Plugin remark: một lần xuống dòng thành một ngắt dòng, không làm hỏng bảng GFM. |

## Chính sách bảo mật

| Export | |
|---|---|
| `sanitizeMarkdownUrl(url)` | Allowlist cho URL: `http`, `https`, `mailto` và URL tương đối; trả về `null` cho mọi thứ khác (đánh giá theo cách trình duyệt đọc URL). |
| `ALLOWED_URL_PROTOCOLS`, `ALLOWED_HTML_TAGS` | Các danh sách đứng sau chính sách. |
| `MERMAID_CONFIG`, `stripMermaidConfigOverrides(md)`, `stripMermaidSourceOverrides(src)` | Config đã khoá chặt của Mermaid và phần loại bỏ directive / frontmatter. |
| `KATEX_SECURITY_OPTIONS` | `trust: false`, `maxExpand: 1000`, `maxSize: 20`. |
| `parseEChartsSource(json)` | Parse và gia cố một fence biểu đồ; throw khi đó không phải option dùng được. |
| `hardenEChartsOption(option)`, `sanitizeEChartsOption`, `restrictEChartsOption` | Các bước của quá trình gia cố đó. |
| `ECHARTS_ALLOWED_OPTION_KEYS`, `ECHARTS_ALLOWED_SERIES_TYPES`, `ECHARTS_LIMITS`, `EChartsLimitError` | Các allowlist và giới hạn của nó. |
| `applyChartTextTheme(option, color)`, `applyLargeDataDefaults(option)` | Màu theme và mặc định cho dữ liệu lớn mà các renderer thêm vào. |

Dùng chúng để áp dụng cùng quy tắc ở nơi khác — ví dụ, kiểm tra một câu trả lời trên server trước khi lưu:

```ts
import { parseEChartsSource, sanitizeMarkdownUrl } from 'react-llm-markdown/core';

sanitizeMarkdownUrl('javascript:alert(1)'); // null
parseEChartsSource('{"series":[{"type":"custom"}]}'); // { series: [] }
```
