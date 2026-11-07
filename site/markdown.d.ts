// Markdown files are bundled as text (esbuild `loader: { '.md': 'text' }`).
declare module '*.md' {
  const content: string;
  export default content;
}
