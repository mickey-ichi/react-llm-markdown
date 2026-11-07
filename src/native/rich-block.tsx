import { type ComponentType, useState } from 'react';
import { View } from 'react-native';

/** The props this package passes to `WebView` from `react-native-webview`. */
export interface WebViewLikeProps {
  source: { html: string; baseUrl?: string };
  originWhitelist?: string[];
  onMessage?: (event: { nativeEvent: { data: string } }) => void;
  onShouldStartLoadWithRequest?: (request: { url: string }) => boolean;
  scrollEnabled?: boolean;
  javaScriptEnabled?: boolean;
  setSupportMultipleWindows?: boolean;
  allowFileAccess?: boolean;
  style?: object;
}

export type WebViewComponent = ComponentType<WebViewLikeProps>;

/** Only the document itself may load; a click on anything inside it navigates nowhere. */
export function allowWebViewRequest(request: { url: string }): boolean {
  return request.url === 'about:blank' || request.url.startsWith('data:');
}

/** A WebView sized to its content (the page reports its height with `postMessage`). */
export function RichBlock({ html, webView: WebView, minHeight }: { html: string; webView: WebViewComponent; minHeight: number }) {
  const [height, setHeight] = useState(minHeight);
  return (
    <View style={{ height, width: '100%' }}>
      <WebView
        allowFileAccess={false}
        javaScriptEnabled
        onMessage={(event) => {
          try {
            const next = (JSON.parse(event.nativeEvent.data) as { height?: unknown }).height;
            if (typeof next === 'number' && next > 0 && next < 20_000) setHeight(Math.ceil(next));
          } catch {
            // not ours
          }
        }}
        onShouldStartLoadWithRequest={allowWebViewRequest}
        originWhitelist={['about:blank', 'data:*']}
        scrollEnabled={false}
        setSupportMultipleWindows={false}
        source={{ html, baseUrl: 'about:blank' }}
        style={{ backgroundColor: 'transparent', flex: 1 }}
      />
    </View>
  );
}
