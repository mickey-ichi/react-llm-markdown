# FAQ

## Thư viện này khác gì react-markdown hay Streamdown?

Trên web, `MarkdownView` được xây dựng trên [Streamdown](https://streamdown.ai) (bản thân Streamdown dựa trên cùng hệ sinh
thái unified/remark với react-markdown). Bên trên đó, package này bổ sung:

- gia cố bảo mật cho output không đáng tin cậy của model — Mermaid và KaTeX bị khoá chặt, allowlist kèm giới hạn cho
  ECharts, chính sách URL chặt hơn, chống DOM clobbering, hook allowlist cho ảnh — [đã kiểm thử với 27 payload tấn công](test-report);
- biểu đồ ECharts từ một fence JSON, công thức toán `\( \)` / `\[ \]`, ngắt dòng kiểu chat;
- CSS build sẵn, có tiền tố (không cần cài Tailwind);
- một renderer **React Native** dùng cùng parser và chính sách, và một CLI viewer.

## Có cần Tailwind không?

Không. `react-llm-markdown/styles.css` đã được build sẵn. Các utility class của nó có tiền tố `rlm:`, nên không bao giờ
đụng với Tailwind của bạn (hay bất cứ thứ gì khác).

## Có chạy với Next.js, Remix, Vite không?

Có. `MarkdownView` là client component (đã có `'use client'`). Trên server nó render Markdown thuần; tô màu code, công
thức toán, sơ đồ và biểu đồ được gắn vào trên trình duyệt.

## Vì sao công thức toán, sơ đồ và biểu đồ dùng WebView trên React Native?

KaTeX, Mermaid và ECharts vẽ bằng DOM (HTML, SVG, canvas), thứ mà React Native không có. Mọi thứ khác — chữ, danh sách,
bảng, code có tô màu — đều được vẽ bằng view native. Các WebView được sandbox: Content-Security-Policy nghiêm ngặt, chỉ
đúng các file script đã ghim phiên bản, không cho điều hướng. Xem [Bảo mật](security).

## Renderer React Native có chạy offline không?

Chữ, bảng, danh sách và code thì có. Mermaid và ECharts tải script từ CDN; bạn có thể tự host chúng bằng prop `scripts`
(xem [Renderer cho React Native](react-native)). Công thức toán sẽ chuyển sang dùng MathML của hệ thống khi không tải
được stylesheet của KaTeX.

## Có chạy trong Expo Go không?

Có: thư viện chỉ là JavaScript thuần (Shiki chạy trên regex engine JavaScript của nó, không dùng WebAssembly) và
`react-native-webview` đã có sẵn trong Expo Go.

## Làm sao ngăn prompt injection làm rò rỉ dữ liệu qua ảnh?

Truyền `isImageAllowed` để chỉ host của chính bạn được tải (web và native):

```tsx
<MarkdownView isImageAllowed={(url) => url.startsWith('https://cdn.example.com/')}>{text}</MarkdownView>
```

Ảnh bị từ chối sẽ hiển thị alt text và không bao giờ được request.

## Có hỗ trợ HTML thô không?

Trên web, HTML được parse và sanitize: không script, iframe, style, form hay event handler; ngoài các thẻ văn bản chuẩn,
`br`, `sub`, `sup`, `mark`, `details` và `summary` cũng được cho phép. Trên React Native, HTML không bao giờ được render
thành HTML — chỉ hiển thị phần chữ.

## Vì sao `$5` không bị biến thành công thức toán?

Một dấu `$` đơn lẻ không bao giờ là công thức toán, nên giá tiền vẫn là chữ. Hãy dùng `$$ … $$`, `\( … \)` hoặc `\[ … \]`.

## Có thể thêm ngôn ngữ cho tô màu code trên React Native không?

Có, bằng `createCodeHighlighter([...DEFAULT_LANGUAGES, ...more])` và grammar từ `@shikijs/langs`. Trên web, Shiki tải
bất kỳ ngôn ngữ nào khi cần.

## Có thể dùng parser hoặc quy tắc bảo mật mà không cần React không?

Có: `react-llm-markdown/core` không phụ thuộc DOM hay React. Xem [Core API](core).

## Những phiên bản nào được hỗ trợ?

React 18 và 19; React Native 0.74 trở lên (Expo SDK 51+); Node.js 20+ cho CLI.

## Báo cáo vấn đề bảo mật bằng cách nào?

Báo riêng, qua [GitHub Security Advisories](https://github.com/mickey-ichi/react-llm-markdown/security/advisories/new) —
không bao giờ báo trong issue công khai.
