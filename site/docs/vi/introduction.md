# Giới thiệu

**react-llm-markdown** render Markdown do language model viết — bằng React trên web và trong React Native — với
những rich block (khối nội dung phong phú) mà model hay dùng, và không để đoạn văn bản đó chạy code.

Câu trả lời của model là input không đáng tin cậy: một prompt injection có thể khiến model trả về HTML, link, sơ đồ hay
cấu hình biểu đồ được dựng sẵn để chạy script, gửi dữ liệu về máy chủ của kẻ tấn công hoặc đánh lừa người đọc. Thư viện
này render tất cả những thứ đó và vô hiệu hoá phần còn lại.

## Bạn nhận được gì

- **Rich block**: bảng GFM, task list và footnote, tô màu cú pháp (Shiki), công thức toán (KaTeX), sơ đồ Mermaid,
  biểu đồ ECharts từ một fence JSON, emphasis hiểu đúng văn bản CJK.
- **Streaming**: Markdown viết dở được sửa trong lúc câu trả lời đang stream về, nên bảng hay code fence không bao giờ
  làm vỡ layout và `**` không bao giờ nhấp nháy trên màn hình.
- **Xử lý sẵn thói quen của LLM**: công thức toán dạng `\( … \)` / `\[ … \]`, một lần xuống dòng là một ngắt dòng.
- **An toàn mặc định**: HTML được sanitize, allowlist cho URL, Mermaid và KaTeX bị khoá chặt, allowlist và giới hạn cho
  cấu hình biểu đồ — [đã kiểm thử với 27 payload tấn công](test-report) trên mọi renderer.
- **Web và native trong một package**, dùng chung parser và chính sách bảo mật.

## Ba entry point

| Import | Dành cho |
|---|---|
| `react-llm-markdown` (hoặc `/web`) | React trên web, xây dựng trên [Streamdown](https://streamdown.ai) |
| `react-llm-markdown/native` | React Native và Expo: view native, WebView cho công thức toán, Mermaid và biểu đồ |
| `react-llm-markdown/core` | Phần không phụ thuộc DOM mà cả hai dùng chung: parse, sửa Markdown khi streaming, chính sách bảo mật |

Trên React Native, `import … from 'react-llm-markdown'` tự resolve sang entry native.

Ngoài ra còn có một CLI mở bất kỳ file `.md` nào trên trình duyệt, tự tải lại khi file thay đổi:

```bash
npx react-llm-markdown README.md
```

## Tiếp theo

- [Bắt đầu](getting-started) — cài đặt và render câu trả lời đầu tiên
- [Playground](../../) — dán hoặc stream Markdown và so sánh web với React Native
- [Bảo mật](security) — những gì bị chặn, và vì sao
