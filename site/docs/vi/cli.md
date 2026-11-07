# CLI viewer

```bash
npx react-llm-markdown README.md
```

Mở một file Markdown trên trình duyệt, render bằng renderer web, và tải lại mỗi lần bạn lưu. Hữu ích để đọc output của
model đã lưu ra đĩa, hoặc tài liệu của một dự án với sơ đồ và biểu đồ được vẽ ra.

## Cách dùng

```bash
react-llm-markdown [file.md | folder] [options]
```

| | |
|---|---|
| `file.md` | File cần mở. |
| `folder` | Mở `README.md` của thư mục đó (hoặc `readme.md`, `README.markdown`, `index.md`). Mặc định: thư mục hiện tại. |
| `-p, --port <n>` | Port để lắng nghe. Mặc định: một port còn trống. |
| `--no-open` | In URL ra thay vì mở trình duyệt. |
| `-v, --version` | In phiên bản. |
| `-h, --help` | Hiển thị trợ giúp. |

Link tới các file `.md` khác trong cùng thư mục cũng mở trong viewer, và ảnh tương đối được tải. Chuyển giữa sáng và tối
bằng nút trên thanh trên cùng.

## An toàn

- Chỉ lắng nghe trên `127.0.0.1`, và chỉ trả lời request gửi tới `127.0.0.1` hoặc `localhost` (nên một trang web không
  thể truy cập nó qua DNS rebinding).
- Chỉ phục vụ file từ thư mục của tài liệu — không bao giờ `..`, symlink trỏ ra ngoài thư mục, hay dotfile như `.env`.
- Render với cùng bộ sanitize như thư viện: HTML hay link trong file không thể chạy script.

Yêu cầu Node.js 20 trở lên. CLI không cần peer tuỳ chọn nào: chỉ cần `npx` là đủ.
