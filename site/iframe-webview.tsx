// A stand-in for react-native-webview in the browser: the same HTML document the native renderer would load into a
// WebView, in a sandboxed <iframe> (scripts allowed, no same-origin access). `ReactNativeWebView.postMessage` is
// bridged to the parent with window.postMessage, so the block reports its height exactly as it does on a phone.
import { useEffect, useMemo, useRef } from 'react';

import type { WebViewLikeProps } from '../src/native/index.ts';

let nextId = 0;

export function IframeWebView({ source, onMessage, style }: WebViewLikeProps) {
  const frame = useRef<HTMLIFrameElement>(null);
  const id = useMemo(() => `rlm-${++nextId}`, []);
  const html = useMemo(
    () =>
      source.html.replace(
        '<head>',
        `<head><script>window.ReactNativeWebView={postMessage:function(d){parent.postMessage({rlm:${JSON.stringify(id)},data:d},'*')}}</script>`,
      ),
    [source.html, id],
  );

  useEffect(() => {
    const listen = (event: MessageEvent) => {
      if (event.source !== frame.current?.contentWindow) return;
      const message = event.data as { rlm?: string; data?: string };
      if (message?.rlm === id && typeof message.data === 'string') onMessage?.({ nativeEvent: { data: message.data } });
    };
    window.addEventListener('message', listen);
    return () => window.removeEventListener('message', listen);
  }, [id, onMessage]);

  return (
    <iframe
      ref={frame}
      sandbox="allow-scripts"
      srcDoc={html}
      style={{ border: 0, width: '100%', height: '100%', background: 'transparent', ...(style as object) }}
      title="WebView block"
    />
  );
}
