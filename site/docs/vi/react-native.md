# Renderer cho React Native

```tsx
import { WebView } from 'react-native-webview';
import { MarkdownView } from 'react-llm-markdown/native';

<MarkdownView streaming={!done} webView={WebView}>{text}</MarkdownView>;
```

Chỉ là JavaScript thuần trên nền `react-native` — không có native module riêng — nên chạy được trong Expo Go, Expo dev
build và React Native thuần (bare).

## Phần nào là native, phần nào là WebView

- **View native**: heading, đoạn văn, emphasis, link, ảnh, danh sách và task list, trích dẫn, bảng (cuộn ngang),
  footnote, inline code, và khối code được tô màu bằng Shiki trên regex engine JavaScript của nó (không dùng
  WebAssembly, chạy trên Hermes).
- **Trong WebView, khi bạn truyền `webView`**: công thức toán dạng display (KaTeX kèm stylesheet của nó; MathML khi
  offline), sơ đồ Mermaid và biểu đồ ECharts. Không có `webView` thì chúng hiển thị mã nguồn. Công thức toán inline luôn
  hiển thị mã nguồn.
- **HTML thô** không bao giờ được render thành HTML: chỉ hiển thị phần chữ (`<mark>`, `<sub>`, `<sup>` và `<br>` được
  tôn trọng).

## Prop

| Prop | Mặc định | |
|---|---|---|
| `children` | — | Mã nguồn Markdown. |
| `streaming` | `false` | `true` trong lúc văn bản vẫn đang về: Markdown chưa hoàn chỉnh được sửa lại; sơ đồ và biểu đồ hiển thị mã nguồn cho đến khi xong. |
| `webView` | — | `WebView` từ `react-native-webview`, để vẽ công thức toán, Mermaid và biểu đồ. |
| `features` | bật hết | `{ code, math, mermaid, echarts, cjk }` — `false` để tắt một mục. |
| `softBreaks` | `true` | Một lần xuống dòng thành một ngắt dòng. |
| `colorScheme` | theo thiết bị | `'light'` hoặc `'dark'`. |
| `theme` | — | Ghi đè màu sắc và kích thước (`foreground`, `link`, `card`, `fontSize`, `lineHeight`, `monoFontFamily`, `chartHeight`, …). |
| `baseUrl` | — | Dùng để resolve link và ảnh tương đối; không có nó thì chúng không mở/không tải được. |
| `onLinkPress` | — | Được gọi với URL; trả về `false` để không mở nó trên trình duyệt. |
| `onCopyCode` | — | Hiển thị nút Copy trên khối code và gọi hàm này với nội dung code. |
| `isImageAllowed` | tất cả | `(url) => boolean`. Ảnh bị từ chối sẽ hiển thị alt text và không bao giờ được request. |
| `highlighter` | Shiki | Một hàm tuỳ biến `(code, lang, scheme) => lines`, hoặc `false` để hiển thị code không tô màu. |
| `scripts` | jsDelivr | `{ mermaid, echarts, katex }`: `{ url, integrity }` của những gì WebView tải. |
| `style` | — | Style của `View` bao ngoài. |

## Tô màu code

Highlighter mặc định đóng gói sẵn các grammar sau (React Native tải mọi thứ ngay từ đầu, nên bộ này được giữ nhỏ):
JavaScript, TypeScript, JSX và TSX, JSON, shell, Python, HTML, CSS, SQL, YAML và diff. Thêm ngôn ngữ khác từ
`@shikijs/langs`:

```tsx
import { createCodeHighlighter, DEFAULT_LANGUAGES, MarkdownView } from 'react-llm-markdown/native';
import go from '@shikijs/langs/go';
import rust from '@shikijs/langs/rust';

const highlighter = createCodeHighlighter([...DEFAULT_LANGUAGES, go, rust]);

<MarkdownView highlighter={highlighter}>{text}</MarkdownView>;
```

## Link

Link được mở trên trình duyệt qua `Linking` — chỉ `http:`, `https:` và `mailto:`. Tự xử lý chúng bằng
`onLinkPress`:

```tsx
<MarkdownView
  baseUrl="https://docs.example.com/guide/"
  onLinkPress={(url) => {
    if (url.startsWith('https://docs.example.com/')) {
      navigation.navigate('Doc', { url });
      return false; // handled
    }
  }}
>
  {text}
</MarkdownView>
```

## Tự host script cho WebView

Mermaid, ECharts và stylesheet của KaTeX được tải từ các URL jsDelivr đã ghim phiên bản, kèm Subresource Integrity. Bạn
có thể tự phục vụ chúng (app offline, mạng có chính sách chặt hơn):

```tsx
<MarkdownView
  webView={WebView}
  scripts={{
    mermaid: { url: 'https://assets.example.com/mermaid@11.17.2.min.js', integrity: 'sha384-…' },
    echarts: { url: 'https://assets.example.com/echarts@6.1.0.min.js', integrity: 'sha384-…' },
    katex: { url: 'https://assets.example.com/katex@0.19.1/katex.min.css', integrity: 'sha384-…' },
  }}
>
  {text}
</MarkdownView>
```

Content-Security-Policy của WebView chỉ cho phép đúng các file này và không gì khác.

## Theme

Mặc định `colorScheme` theo thiết bị. Ghi đè giá trị bất kỳ:

```tsx
<MarkdownView theme={{ link: '#7c3aed', fontSize: 17, lineHeight: 26, chartHeight: 280 }}>{text}</MarkdownView>
```

`LIGHT_THEME` và `DARK_THEME` được export nếu bạn muốn bắt đầu từ chúng.
