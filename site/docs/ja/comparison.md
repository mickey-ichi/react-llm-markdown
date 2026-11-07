# 比較

react-llm-markdown と、よく使われる Markdown レンダラーとの比較です。2026-11-07 時点で、各プロジェクトの README、
ドキュメント、公開ソースをもとに確認しました。誤りがあれば [issue](https://github.com/mickey-ichi/react-llm-markdown/issues)
でお知らせください。

Web では react-llm-markdown は Streamdown の**上に**構築されており、ストリーミングと描画のコアを引き継いだうえで、
それ以外の機能を追加しています。

## Web

| | react-llm-markdown | [Streamdown](https://streamdown.ai) | [react-markdown](https://github.com/remarkjs/react-markdown) |
|---|---|---|---|
| ストリーミング中の Markdown 補完 | ✅ 途中のテーブルや閉じていない記号も | ✅（[remend](https://github.com/vercel/streamdown)） | — |
| GFM テーブル・タスクリスト・脚注 | ✅ | ✅ | `remark-gfm` で対応 |
| コードのハイライト | ✅ Shiki | `@streamdown/code`（Shiki）で対応 | 自前で組み込み |
| 数式 | ✅ KaTeX、`\( \)` / `\[ \]` も | `@streamdown/math` で対応 | `remark-math` + `rehype-katex` で対応 |
| Mermaid 図 | ✅ strict モード、ディレクティブ除去 | `@streamdown/mermaid` で対応 | — |
| コードフェンスからのグラフ | ✅ ECharts（オプションの許可リストと上限付き） | カスタムレンダラーで対応 | — |
| 生の HTML | サニタイズ | サニタイズ（GitHub スキーマ） | 既定で無効。`rehype-raw` + `rehype-sanitize` で有効化 |
| `javascript:` リンクのブロック | ✅ | ✅ | ✅ |
| リンク・画像の許可リスト | 既定で厳格（http、https、mailto、相対）。`isImageAllowed` フック | あり（既定は `*`） | `urlTransform` で独自に実装 |
| スタイル | ビルド済み・プレフィックス付き CSS | Tailwind の設定（`@source`）と shadcn/ui の変数が必要 | スタイルなし |
| ライセンス | MIT | Apache-2.0 | MIT |

さらに react-llm-markdown は、変更のたびに実ブラウザで両レンダラーに対して [27 種類の攻撃ペイロード](test-report)を実行しています。

## React Native

| | react-llm-markdown | [react-native-marked](https://github.com/gmsgowtham/react-native-marked) | [react-native-markdown-display（RonRadtke 版フォーク）](https://github.com/RonRadtke/react-native-markdown-display) |
|---|---|---|---|
| ネイティブビュー | ✅ | ✅ | ✅ |
| ストリーミング中の Markdown 補完 | ✅ Web と同じルール | — | 開いたコードフェンスのみ閉じる |
| GFM テーブル / タスクリスト / 脚注 | ✅ / ✅ / ✅ | ✅ / — / — | ✅ / — / — |
| コードのハイライト | ✅ Shiki（JS エンジン、Hermes 対応） | カスタムレンダラー | ✅ prism-react-renderer |
| 数式・Mermaid・グラフ | ✅ サンドボックス化した WebView 内（CSP、SRI 付きの固定スクリプト） | — | — |
| 生の HTML | テキストとして表示 | テキストとして表示 | 無効 |
| `javascript:` リンクのブロック | ✅（http、https、mailto のみ） | ドキュメントに記載なし | ✅（markdown-it） |
| 画像の許可リスト | `isImageAllowed` | — | `allowedImageHandlers` |
| Expo Go | ✅ | ✅ | アイコンフォントが必要 |
| Web と同じパーサーとルール | ✅ | — | — |

元の `react-native-markdown-display`（最終リリース 2023 年）は、README で積極的なメンテナンスを終了したと案内しています。

## 他のライブラリを選ぶべき場合

- **react-markdown** — 信頼できる完成済みの Markdown を Web で表示し、unified のプラグインエコシステム全体を使える、
  最小で実績のある部品が欲しい場合。
- **Streamdown** — アプリがすでに Tailwind と shadcn/ui を使っていて Web のみで動作し、その既定値に自分のポリシーを
  組み合わせたい場合。
- **react-native-marked** — React Native アプリで Markdown をテキストとして表示できれば十分で（ストリーミング、数式、
  図は不要）、依存関係を最小にしたい場合。

Markdown がモデルから届く場合は react-llm-markdown を選んでください。ストリーミングされ、プロンプトインジェクションで
操作される可能性があり、ブラウザでもスマートフォンでも同じリッチブロックと同じ安全ルールが必要なケースです。
