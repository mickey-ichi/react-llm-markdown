// Interface strings for the playground and the docs, in the three site languages. Page content lives in
// site/docs/<name>.md (English) and site/docs/<lang>/<name>.md.

export const LOCALES = ['en', 'vi', 'ja'] as const;
export type Locale = (typeof LOCALES)[number];

export const LOCALE_NAMES: Record<Locale, string> = { en: 'English', vi: 'Tiếng Việt', ja: '日本語' };
export const LOCALE_SHORT: Record<Locale, string> = { en: 'EN', vi: 'VI', ja: 'JA' };

/** The locale in a site path: `/react-llm-markdown/vi/docs/web/` → `vi`. */
export function localeFromPath(path: string): Locale {
  const match = /\/(vi|ja)(?:\/|$)/.exec(path);
  return (match?.[1] as Locale | undefined) ?? 'en';
}

const en = {
  // shared
  playground: 'Playground',
  docs: 'Docs',
  github: 'GitHub',
  npm: 'npm',
  lightTheme: 'Use light theme',
  darkTheme: 'Use dark theme',
  language: 'Language',
  sponsor: 'Sponsor',
  // playground
  thesisBefore: 'Markdown from your model, rendered',
  thesisMark: 'safely',
  thesisAfter: '— in the browser and on the phone.',
  security: 'Security',
  examples: 'Examples',
  streamIt: 'Stream it',
  stopStreaming: 'Stop streaming',
  speed: 'Speed',
  slow: 'Slow',
  normal: 'Normal',
  fast: 'Fast',
  copyLink: 'Copy link',
  share: 'Share',
  linkCopied: 'Link copied',
  linkInAddressBar: 'Link is in the address bar',
  paneMarkdown: 'Markdown',
  paneWeb: 'Web',
  paneNative: 'React Native',
  characters: 'characters',
  nativeNote:
    'Rendered by the native renderer through react-native-web. Math, diagrams and charts run in the same WebView documents a phone would load, here in a sandboxed iframe.',
  installWeb: 'Web',
  installNative: 'React Native and Expo',
  installAny: 'Any .md file',
  installAnyNote: 'Opens it in your browser and reloads on every save.',
  mitLicense: 'MIT license',
  performance: 'Performance',
  documentation: 'Documentation',
  builtOn: 'Built on Streamdown, Shiki, KaTeX, Mermaid and ECharts',
  // docs
  guide: 'Guide',
  project: 'Project',
  onThisPage: 'On this page',
  previous: 'Previous',
  next: 'Next',
  editPage: 'Edit this page on GitHub',
  englishOnly: 'This page is maintained in English.',
  livePreview: 'Preview',
  liveMarkdown: 'Markdown',
  linkToSection: 'Link to this section',
  presets: { answer: 'Chat answer', charts: 'Charts', diagrams: 'Diagrams', math: 'Math', cjk: '日本語', attacks: 'Attack payloads' },
};

type Strings = typeof en;

const vi: Strings = {
  playground: 'Playground',
  docs: 'Tài liệu',
  github: 'GitHub',
  npm: 'npm',
  lightTheme: 'Chuyển sang giao diện sáng',
  darkTheme: 'Chuyển sang giao diện tối',
  language: 'Ngôn ngữ',
  sponsor: 'Ủng hộ',
  thesisBefore: 'Markdown từ mô hình AI, hiển thị',
  thesisMark: 'an toàn',
  thesisAfter: '— trên trình duyệt và trên điện thoại.',
  security: 'Bảo mật',
  examples: 'Ví dụ',
  streamIt: 'Chạy stream',
  stopStreaming: 'Dừng stream',
  speed: 'Tốc độ',
  slow: 'Chậm',
  normal: 'Vừa',
  fast: 'Nhanh',
  copyLink: 'Sao chép link',
  share: 'Chia sẻ',
  linkCopied: 'Đã sao chép link',
  linkInAddressBar: 'Link nằm trên thanh địa chỉ',
  paneMarkdown: 'Markdown',
  paneWeb: 'Web',
  paneNative: 'React Native',
  characters: 'ký tự',
  nativeNote:
    'Hiển thị bằng renderer native thông qua react-native-web. Công thức, sơ đồ và biểu đồ chạy trong đúng các trang WebView mà điện thoại sẽ nạp, ở đây đặt trong iframe sandbox.',
  installWeb: 'Web',
  installNative: 'React Native và Expo',
  installAny: 'Mọi file .md',
  installAnyNote: 'Mở file trên trình duyệt và tự tải lại mỗi lần lưu.',
  mitLicense: 'Giấy phép MIT',
  performance: 'Hiệu năng',
  documentation: 'Tài liệu',
  builtOn: 'Xây dựng trên Streamdown, Shiki, KaTeX, Mermaid và ECharts',
  guide: 'Hướng dẫn',
  project: 'Dự án',
  onThisPage: 'Trong trang này',
  previous: 'Trang trước',
  next: 'Trang sau',
  editPage: 'Sửa trang này trên GitHub',
  englishOnly: 'Trang này chỉ có bản tiếng Anh.',
  livePreview: 'Xem trước',
  liveMarkdown: 'Markdown',
  linkToSection: 'Link tới mục này',
  presets: { answer: 'Câu trả lời chat', charts: 'Biểu đồ', diagrams: 'Sơ đồ', math: 'Công thức', cjk: '日本語', attacks: 'Payload tấn công' },
};

const ja: Strings = {
  playground: 'プレイグラウンド',
  docs: 'ドキュメント',
  github: 'GitHub',
  npm: 'npm',
  lightTheme: 'ライトテーマに切り替え',
  darkTheme: 'ダークテーマに切り替え',
  language: '言語',
  sponsor: 'スポンサー',
  thesisBefore: 'モデルが書いた Markdown を',
  thesisMark: '安全に',
  thesisAfter: '表示 — ブラウザでもスマートフォンでも。',
  security: 'セキュリティ',
  examples: 'サンプル',
  streamIt: 'ストリーミング再生',
  stopStreaming: 'ストリーミング停止',
  speed: '速度',
  slow: '遅い',
  normal: '標準',
  fast: '速い',
  copyLink: 'リンクをコピー',
  share: '共有',
  linkCopied: 'リンクをコピーしました',
  linkInAddressBar: 'リンクはアドレスバーにあります',
  paneMarkdown: 'Markdown',
  paneWeb: 'Web',
  paneNative: 'React Native',
  characters: '文字',
  nativeNote:
    'react-native-web を通してネイティブレンダラーで表示しています。数式・図・グラフは、実機が読み込むのと同じ WebView 用ドキュメントを、ここではサンドボックス化した iframe で実行しています。',
  installWeb: 'Web',
  installNative: 'React Native と Expo',
  installAny: '任意の .md ファイル',
  installAnyNote: 'ブラウザで開き、保存するたびに再読み込みします。',
  mitLicense: 'MIT ライセンス',
  performance: 'パフォーマンス',
  documentation: 'ドキュメント',
  builtOn: 'Streamdown、Shiki、KaTeX、Mermaid、ECharts をベースにしています',
  guide: 'ガイド',
  project: 'プロジェクト',
  onThisPage: 'このページの内容',
  previous: '前へ',
  next: '次へ',
  editPage: 'GitHub でこのページを編集',
  englishOnly: 'このページは英語版のみです。',
  livePreview: 'プレビュー',
  liveMarkdown: 'Markdown',
  linkToSection: 'このセクションへのリンク',
  presets: { answer: 'チャットの回答', charts: 'グラフ', diagrams: '図', math: '数式', cjk: '日本語', attacks: '攻撃ペイロード' },
};

export const STRINGS: Record<Locale, Strings> = { en, vi, ja };

/** Docs page titles and meta descriptions per locale (the build writes them into each page's HTML). */
export const PAGE_META: Record<string, Record<Locale, [title: string, description: string]>> = {
  introduction: {
    en: ['Introduction', 'Safe, rich Markdown for React and React Native, hardened for text an LLM wrote.'],
    vi: ['Giới thiệu', 'Markdown an toàn, đầy đủ tính năng cho React và React Native, được gia cố cho văn bản do LLM viết.'],
    ja: ['はじめに', 'LLM が書いたテキストのために堅牢化された、React と React Native 向けの安全でリッチな Markdown。'],
  },
  'getting-started': {
    en: ['Getting started', 'Install react-llm-markdown and render a streaming LLM answer on the web or in React Native.'],
    vi: ['Bắt đầu', 'Cài react-llm-markdown và hiển thị câu trả lời LLM đang stream trên web hoặc React Native.'],
    ja: ['スタートガイド', 'react-llm-markdown をインストールし、ストリーミング中の LLM の回答を Web や React Native で表示します。'],
  },
  web: {
    en: ['Web renderer', 'MarkdownView for React: props, image policy, theme tokens, element overrides and server rendering.'],
    vi: ['Renderer cho web', 'MarkdownView cho React: prop, chính sách ảnh, theme, ghi đè phần tử và render phía server.'],
    ja: ['Web レンダラー', 'React 向け MarkdownView：props、画像ポリシー、テーマ、要素の上書き、サーバーレンダリング。'],
  },
  'react-native': {
    en: ['React Native renderer', 'Native-view Markdown for React Native and Expo, with math, Mermaid and charts in a hardened WebView.'],
    vi: ['Renderer cho React Native', 'Markdown bằng view native cho React Native và Expo; công thức, Mermaid và biểu đồ chạy trong WebView được gia cố.'],
    ja: ['React Native レンダラー', 'React Native と Expo 向けのネイティブビューによる Markdown。数式・Mermaid・グラフは堅牢化した WebView で表示。'],
  },
  'rich-blocks': {
    en: ['Code, math, diagrams, charts', 'Shiki code, KaTeX math, Mermaid diagrams and ECharts charts from Markdown, with live examples.'],
    vi: ['Code, công thức, sơ đồ, biểu đồ', 'Code Shiki, công thức KaTeX, sơ đồ Mermaid và biểu đồ ECharts từ Markdown, kèm ví dụ trực tiếp.'],
    ja: ['コード・数式・図・グラフ', 'Markdown から Shiki のコード、KaTeX の数式、Mermaid の図、ECharts のグラフ。ライブサンプル付き。'],
  },
  core: {
    en: ['Core API', 'The DOM-free parser, streaming repair and security policies shared by both renderers.'],
    vi: ['Core API', 'Bộ parse không phụ thuộc DOM, phần sửa Markdown khi stream và các chính sách bảo mật dùng chung cho cả hai renderer.'],
    ja: ['Core API', '両レンダラーが共有する、DOM 非依存のパーサー、ストリーミング補完、セキュリティポリシー。'],
  },
  cli: {
    en: ['CLI viewer', 'npx react-llm-markdown file.md: view any Markdown file in the browser with live reload.'],
    vi: ['Trình xem CLI', 'npx react-llm-markdown file.md: xem mọi file Markdown trên trình duyệt, tự tải lại khi lưu.'],
    ja: ['CLI ビューアー', 'npx react-llm-markdown file.md：任意の Markdown ファイルをブラウザで表示し、保存時に自動再読み込み。'],
  },
  faq: {
    en: ['FAQ', 'Tailwind, Next.js, Expo Go, offline use, image leaks, raw HTML and more.'],
    vi: ['Câu hỏi thường gặp', 'Tailwind, Next.js, Expo Go, dùng offline, rò rỉ qua ảnh, HTML thô và hơn nữa.'],
    ja: ['よくある質問', 'Tailwind、Next.js、Expo Go、オフライン利用、画像経由の漏えい、生の HTML など。'],
  },
  security: {
    en: ['Security', 'How react-llm-markdown neutralizes untrusted Markdown: HTML, URLs, Mermaid, KaTeX, ECharts and WebViews.'],
    vi: ['Bảo mật', 'Cách react-llm-markdown vô hiệu hoá Markdown không đáng tin: HTML, URL, Mermaid, KaTeX, ECharts và WebView.'],
    ja: ['セキュリティ', 'react-llm-markdown が信頼できない Markdown を無害化する方法：HTML、URL、Mermaid、KaTeX、ECharts、WebView。'],
  },
  performance: {
    en: ['Performance', 'Render, responsiveness and memory budgets, measured in a real browser on both renderers.'],
    vi: ['Hiệu năng', 'Ngưỡng render, độ phản hồi và bộ nhớ, đo trên trình duyệt thật cho cả hai renderer.'],
    ja: ['パフォーマンス', '描画時間・応答性・メモリの基準を、両レンダラーで実ブラウザ計測。'],
  },
  'test-report': {
    en: ['Test report', 'The latest end-to-end run: attack payloads and performance cases on web and React Native.'],
    vi: ['Báo cáo kiểm thử', 'Lần chạy E2E mới nhất: payload tấn công và ca hiệu năng trên web và React Native.'],
    ja: ['テストレポート', '最新の E2E 実行結果：Web と React Native での攻撃ペイロードとパフォーマンスケース。'],
  },
  changelog: {
    en: ['Changelog', 'Release notes for react-llm-markdown.'],
    vi: ['Nhật ký thay đổi', 'Ghi chú các phiên bản của react-llm-markdown.'],
    ja: ['変更履歴', 'react-llm-markdown のリリースノート。'],
  },
};
