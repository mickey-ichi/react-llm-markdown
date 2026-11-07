# Core API

`react-llm-markdown/core` は、両方のレンダラーが共有する DOM 非依存の部分です。Node、ワーカー、React Native など、
JavaScript が動く場所ならどこでも動作します。また、すべてのエクスポートは Web とネイティブのエントリーからも利用できます。

## パース

```ts
import { parseMarkdown, prepareMarkdown } from 'react-llm-markdown/core';

const tree = parseMarkdown(text, { streaming: true });
```

| 関数 | |
|---|---|
| `parseMarkdown(source, options?)` | [mdast](https://github.com/syntax-tree/mdast) ツリーにパースします：GFM、`$$` の数式、CJK の強調に対応し、下記の前処理と URL ポリシーが適用されます。オプション：`streaming`、`softBreaks`（デフォルト `true`）、`cjk`（デフォルト `true`）。 |
| `prepareMarkdown(source, { streaming? })` | すべてのレンダラーが実行するソースレベルの処理：プロトコル相対リンクの無害化、Mermaid の設定上書きの削除、LaTeX の区切り記号の変換、そしてストリーミング中は未完成の Markdown の補修。 |
| `normalizeLatexDelimiters(source)` | `\( … \)` / `\[ … \]` → `$$`。内容が数式らしく見える場合のみ変換し、コード内では決して変換しません。 |
| `stripDanglingMarker(text)` | ストリームが開いたものの、まだ中身のない `**`、`_`、`` ` ``、`~~` を非表示にします。 |
| `remarkSoftBreaks()` | Remark プラグイン：GFM のテーブルを壊さずに、1 つの改行を改行として扱います。 |

## セキュリティポリシー

| エクスポート | |
|---|---|
| `sanitizeMarkdownUrl(url)` | URL の許可リスト：`http`、`https`、`mailto`、相対 URL。それ以外はすべて `null`（ブラウザが URL を解釈するのと同じ方法で判定します）。 |
| `ALLOWED_URL_PROTOCOLS`, `ALLOWED_HTML_TAGS` | ポリシーの基になっているリスト。 |
| `MERMAID_CONFIG`, `stripMermaidConfigOverrides(md)`, `stripMermaidSourceOverrides(src)` | Mermaid の制限された設定と、ディレクティブ／フロントマターの削除。 |
| `KATEX_SECURITY_OPTIONS` | `trust: false`、`maxExpand: 1000`、`maxSize: 20`。 |
| `parseEChartsSource(json)` | チャートのフェンスをパースして堅牢化します。使用可能なオプションでない場合は例外を投げます。 |
| `hardenEChartsOption(option)`, `sanitizeEChartsOption`, `restrictEChartsOption` | その堅牢化の各ステップ。 |
| `ECHARTS_ALLOWED_OPTION_KEYS`, `ECHARTS_ALLOWED_SERIES_TYPES`, `ECHARTS_LIMITS`, `EChartsLimitError` | その許可リストと上限。 |
| `applyChartTextTheme(option, color)`, `applyLargeDataDefaults(option)` | レンダラーが追加するテーマカラーと大量データ向けのデフォルト。 |

これらを使えば、同じルールを他の場所でも適用できます。たとえば、回答を保存する前にサーバー上でチェックする場合です。

```ts
import { parseEChartsSource, sanitizeMarkdownUrl } from 'react-llm-markdown/core';

sanitizeMarkdownUrl('javascript:alert(1)'); // null
parseEChartsSource('{"series":[{"type":"custom"}]}'); // { series: [] }
```
