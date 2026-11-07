# FAQ

## react-markdown や Streamdown とは何が違いますか？

Web では、`MarkdownView` は [Streamdown](https://streamdown.ai) をベースにしています（Streamdown 自体も react-markdown と同じ
unified/remark エコシステムの上に作られています）。このパッケージはその上に次のものを追加しています。

- 信頼できないモデル出力に対する堅牢化 —— 制限をかけた Mermaid と KaTeX、上限付きの ECharts 許可リスト、より厳しい URL
  ポリシー、DOM clobbering 対策、画像の許可リスト用フック。[27 種類の攻撃ペイロードでテストしています](test-report)。
- JSON のフェンスから描く ECharts のチャート、`\( \)` / `\[ \]` の数式、チャット形式の改行。
- ビルド済みでプレフィックス付きの CSS（Tailwind の設定は不要）。
- 同じパーサーとポリシーを使う **React Native** レンダラー、そして CLI ビューアー。

## Tailwind は必要ですか？

いいえ。`react-llm-markdown/styles.css` はビルド済みです。そのユーティリティクラスには `rlm:` というプレフィックスが付いているため、
あなた自身の Tailwind（やその他のもの）と衝突することはありません。

## Next.js、Remix、Vite で動作しますか？

はい。`MarkdownView` はクライアントコンポーネントです（`'use client'` が含まれています）。サーバー上ではプレーンな Markdown をレンダリングし、
コードのハイライト、数式、ダイアグラム、チャートはブラウザで適用されます。

## React Native で数式・ダイアグラム・チャートに WebView を使うのはなぜですか？

KaTeX、Mermaid、ECharts は DOM（HTML、SVG、canvas）を使って描画しますが、React Native には DOM がありません。それ以外のもの ——
テキスト、リスト、テーブル、ハイライト付きのコード —— はネイティブビューで描画されます。WebView はサンドボックス化されています：厳格な
Content-Security-Policy、バージョンを固定したスクリプトファイルのみ、ページ遷移なし。詳しくは [セキュリティ](security) をご覧ください。

## React Native レンダラーはオフラインで動作しますか？

テキスト、テーブル、リスト、コードは動作します。Mermaid と ECharts はスクリプトを CDN から読み込みます。`scripts` prop を使って
自分でホストしてください（[React Native レンダラー](react-native) を参照）。KaTeX のスタイルシートを読み込めない場合、数式はシステムの
MathML にフォールバックします。

## Expo Go で動作しますか？

はい。純粋な JavaScript であり（Shiki は JavaScript 正規表現エンジンで動作し、WebAssembly は不要です）、`react-native-webview` は
Expo Go に含まれています。

## プロンプトインジェクションによる画像経由のデータ漏えいを防ぐには？

自分のホストだけが読み込まれるように `isImageAllowed` を渡してください（Web とネイティブの両方）。

```tsx
<MarkdownView isImageAllowed={(url) => url.startsWith('https://cdn.example.com/')}>{text}</MarkdownView>
```

拒否された画像は代替テキストを表示し、リクエストされることはありません。

## 生の HTML はサポートされていますか？

Web ではパースされてサニタイズされます：スクリプト、iframe、スタイル、フォーム、イベントハンドラーは使えません。標準的な本文用タグに加えて、
`br`、`sub`、`sup`、`mark`、`details`、`summary` が許可されています。React Native では HTML が HTML としてレンダリングされることはなく、
テキストだけが表示されます。

## `$5` が数式にならないのはなぜですか？

単独の `$` は数式として扱われないため、価格はテキストのままです。`$$ … $$`、`\( … \)`、`\[ … \]` を使ってください。

## React Native でコードハイライトの言語を追加できますか？

はい。`createCodeHighlighter([...DEFAULT_LANGUAGES, ...more])` と `@shikijs/langs` の文法を使います。Web では、
Shiki が任意の言語を必要に応じて読み込みます。

## パーサーやセキュリティルールを React なしで使えますか？

はい。`react-llm-markdown/core` は DOM にも React にも依存していません。詳しくは [Core API](core) をご覧ください。

## どのバージョンがサポートされていますか？

React 18 と 19、React Native 0.74 以降（Expo SDK 51+）、CLI 用には Node.js 20+ です。

## セキュリティの問題はどのように報告すればよいですか？

[GitHub Security Advisories](https://github.com/mickey-ichi/react-llm-markdown/security/advisories/new) を通じて非公開で報告してください。
公開の issue では決して報告しないでください。
