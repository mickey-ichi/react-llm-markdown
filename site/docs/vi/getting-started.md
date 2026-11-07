# Bắt đầu

## Web (React, Next.js, Vite)

Cài package và các thư viện của renderer web (chúng là peer dependency, nên app React Native sẽ không bao giờ cài
chúng):

```bash
npm install react-llm-markdown \
  streamdown @streamdown/code @streamdown/math \
  @streamdown/mermaid @streamdown/cjk echarts
```

Import style một lần, rồi render:

```tsx
import { MarkdownView } from 'react-llm-markdown';
import 'react-llm-markdown/styles.css';

export function Answer({ text, done }: { text: string; done: boolean }) {
  return <MarkdownView streaming={!done}>{text}</MarkdownView>;
}
```

- `streaming` là `true` trong lúc văn bản vẫn đang về: Markdown chưa hoàn chỉnh được sửa lại và chữ mới hiện dần (fade in).
- Không cần cài Tailwind: `styles.css` đã được build sẵn, và các utility class của nó có tiền tố `rlm:` nên không bao giờ
  đụng với class của bạn.
- Trong Next.js App Router, `MarkdownView` là client component (`'use client'` đã có sẵn trong package).

Xem thêm: [Renderer cho web](web).

## React Native và Expo

```bash
npm install react-llm-markdown
npx expo install react-native-webview   # optional: math, Mermaid and charts
```

```tsx
import * as Clipboard from 'expo-clipboard';
import { WebView } from 'react-native-webview';
import { MarkdownView } from 'react-llm-markdown/native';

export function Answer({ text, done }: { text: string; done: boolean }) {
  return (
    <MarkdownView streaming={!done} webView={WebView} onCopyCode={(code) => Clipboard.setStringAsync(code)}>
      {text}
    </MarkdownView>
  );
}
```

Chạy được trong Expo Go, Expo dev build và React Native thuần (bare): chỉ là JavaScript thuần, không có native module
riêng. Nếu không truyền `webView`, công thức toán, sơ đồ và biểu đồ sẽ hiển thị mã nguồn của chúng.

Xem thêm: [Renderer cho React Native](react-native).

## Mở bất kỳ file .md nào từ terminal

```bash
npx react-llm-markdown README.md
```

Mở file trên trình duyệt và tải lại mỗi lần bạn lưu. Xem thêm: [CLI viewer](cli).

## Stream một câu trả lời

Truyền văn bản khi nó dài dần ra, và giữ `streaming` cho đến khi model trả lời xong:

```tsx
const [text, setText] = useState('');
const [done, setDone] = useState(false);

useEffect(() => {
  const stream = startAnswer(question); // your API
  stream.on('token', (token) => setText((t) => t + token));
  stream.on('end', () => setDone(true));
}, [question]);

return <MarkdownView streaming={!done}>{text}</MarkdownView>;
```

Trong lúc streaming, một `**bold` chưa đóng, một bảng dở dang hay một code fence còn mở đều render như đã hoàn chỉnh, và
một marker chưa có chữ nào phía sau (`Hello **`) sẽ bị ẩn cho đến khi ký tự đầu tiên của nó về tới.

## Ví dụ

Các app hoàn chỉnh để tham khảo, mỗi app có README riêng:

- [Next.js](https://github.com/mickey-ichi/react-llm-markdown/tree/main/examples/nextjs) — trang chat App Router. Route handler stream câu trả lời; một client component đọc stream và
  render bằng `MarkdownView`.
- [React Native (Expo)](https://github.com/mickey-ichi/react-llm-markdown/tree/main/examples/react-native) — một màn hình với câu trả lời được stream, công thức toán, sơ đồ và biểu đồ
  trong WebView, nút Copy trên khối code. Chạy được trong Expo Go.
