# React Native レンダラー

```tsx
import { WebView } from 'react-native-webview';
import { MarkdownView } from 'react-llm-markdown/native';

<MarkdownView streaming={!done} webView={WebView}>{text}</MarkdownView>;
```

`react-native` の上で動く純粋な JavaScript で、独自のネイティブモジュールは持ちません。そのため Expo Go、Expo の開発ビルド、
素の React Native で動作します。

## ネイティブで描画するもの、WebView で描画するもの

- **ネイティブビュー**：見出し、段落、強調、リンク、画像、リストとタスクリスト、引用、テーブル（横スクロール）、脚注、インラインコード、
  そして Shiki の JavaScript 正規表現エンジンでハイライトされたコードブロック（WebAssembly 不要で、Hermes 上で動作）。
- **`webView` を渡した場合に WebView で描画**：ディスプレイ数式（KaTeX とそのスタイルシート。オフライン時は MathML）、Mermaid の
  ダイアグラム、ECharts のチャート。`webView` を渡さない場合はソースのまま表示されます。インライン数式は常にソースのまま表示されます。
- **生の HTML** は HTML としてレンダリングされることはなく、テキストだけが表示されます（`<mark>`、`<sub>`、`<sup>`、`<br>` は反映されます）。

## Props

| Prop | デフォルト | |
|---|---|---|
| `children` | — | Markdown のソース。 |
| `streaming` | `false` | テキストがまだ届いている間は `true`：未完成の Markdown が補修されます。ダイアグラムとチャートは完了するまでソースのまま表示されます。 |
| `webView` | — | 数式、Mermaid、チャートを描画するための `react-native-webview` の `WebView`。 |
| `features` | すべて有効 | `{ code, math, mermaid, echarts, cjk }` —— `false` にするとその機能が無効になります。 |
| `softBreaks` | `true` | 1 つの改行を改行として扱います。 |
| `colorScheme` | デバイス | `'light'` または `'dark'`。 |
| `theme` | — | 色やサイズを上書きします（`foreground`、`link`、`card`、`fontSize`、`lineHeight`、`monoFontFamily`、`chartHeight` など）。 |
| `baseUrl` | — | 相対リンクと相対パスの画像を解決します。指定しない場合、それらは開かれず、読み込まれません。 |
| `onLinkPress` | — | URL を引数に呼び出されます。`false` を返すとブラウザで開くのを止めます。 |
| `onCopyCode` | — | コードブロックにコピーボタンを表示し、そのコードを引数にこの関数を呼び出します。 |
| `isImageAllowed` | すべて | `(url) => boolean`。拒否された画像は代替テキストを表示し、リクエストされることはありません。 |
| `highlighter` | Shiki | 独自の `(code, lang, scheme) => lines`、またはプレーンなコードにする場合は `false`。 |
| `scripts` | jsDelivr | `{ mermaid, echarts, katex }`：WebView が読み込むものの `{ url, integrity }`。 |
| `style` | — | 外側の `View` のスタイル。 |

## コードのハイライト

デフォルトのハイライターには次の文法が同梱されています（React Native ではすべてを最初に読み込むため、セットは小さくしています）：
JavaScript、TypeScript、JSX と TSX、JSON、シェル、Python、HTML、CSS、SQL、YAML、diff。`@shikijs/langs` から追加できます。

```tsx
import { createCodeHighlighter, DEFAULT_LANGUAGES, MarkdownView } from 'react-llm-markdown/native';
import go from '@shikijs/langs/go';
import rust from '@shikijs/langs/rust';

const highlighter = createCodeHighlighter([...DEFAULT_LANGUAGES, go, rust]);

<MarkdownView highlighter={highlighter}>{text}</MarkdownView>;
```

## リンク

リンクは `Linking` を通じてブラウザで開かれます。対象は `http:`、`https:`、`mailto:` のみです。自分で処理するには
`onLinkPress` を使います。

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

## WebView のスクリプトをセルフホストする

Mermaid、ECharts、KaTeX のスタイルシートは、バージョンを固定した jsDelivr の URL から Subresource Integrity 付きで読み込まれます。
自分で配信することもできます（オフラインのアプリや、より厳しいネットワーク環境向け）。

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

WebView の Content-Security-Policy は、まさにこれらのファイルだけを許可し、それ以外は何も許可しません。

## テーマ

`colorScheme` はデフォルトでデバイスに従います。任意の値を上書きできます。

```tsx
<MarkdownView theme={{ link: '#7c3aed', fontSize: 17, lineHeight: 26, chartHeight: 280 }}>{text}</MarkdownView>
```

`LIGHT_THEME` と `DARK_THEME` がエクスポートされているので、それらを出発点にすることもできます。
