# Agent Admin Backend API Flow (for UI)

Tài liệu này tổng hợp **toàn bộ API** hiện có theo đúng flow triển khai bạn đang làm: 
**Auth → User → Agent → Workflow → Run/Streaming → Tools**.

Base URL mặc định:
- HTTP API: `http://localhost:8000`
- Socket.IO: `http://localhost:8000`

---

## 1) Flow tổng quát cho UI

## Flow A - Khởi tạo & Đăng nhập
1. `POST /users/setup-admin-first-time` (chỉ lần đầu hoặc reset admin cùng email)
2. `POST /auth/token` để lấy JWT
3. Gắn header cho các API protected:
   - `Authorization: Bearer <access_token>`
4. (optional) `GET /me` để lấy user hiện tại

## Flow B - Quản lý Agent
1. `POST /agents/` tạo agent
2. `GET /agents/` list agent
3. `PUT /agents/{agent_id}` update prompt/model/tools
4. `POST /agents/import` hoặc `POST /agents/import/json` (import hàng loạt)

## Flow C - Quản lý Workflow (steps-based)
1. `POST /workflows/` với `steps = [agent_id_1, agent_id_2, ...]`
2. `GET /workflows/` list workflow user nhìn thấy
3. `PUT /workflows/{workflow_id}` cập nhật name/steps/is_public
4. `POST /workflows/{workflow_id}/share` chia sẻ cho user khác

## Flow D - Chạy Workflow
- Không streaming: `POST /workflows/{workflow_id}/chat` hoặc `POST /workflows/{workflow_id}/run`
- Streaming realtime: Socket.IO event `workflow_chat`

## Flow E - Chat trực tiếp với 1 Agent
- HTTP: `POST /agents/{agent_id}/chat`
- Realtime: Socket.IO event `agent_chat`

---

## 2) Authentication APIs

## `POST /users/setup-admin-first-time`
Khởi tạo admin đầu tiên hoặc reset mật khẩu admin hiện có (khi trùng email admin).

Request:
```json
{
  "name": "Admin",
  "email": "admin@example.com",
  "password": "admin"
}
```

Success: `201` (hoặc `409` nếu admin đã tồn tại mà email không khớp).

## `POST /auth/token`
OAuth2 password flow, trả JWT.

Form-data:
- `username` = email
- `password`

Response:
```json
{
  "access_token": "...",
  "token_type": "bearer",
  "user": {
    "id": "uuid",
    "email": "admin@example.com",
    "name": "Admin",
    "is_admin": true
  }
}
```

## `GET /me`
Lấy thông tin user từ token hiện tại.

---

## 3) User APIs (`/users`)

## `POST /users/` (admin only)
Tạo user thường.

## `GET /users/` (admin only)
Danh sách tất cả users.

## `GET /users/me/profile`
Profile của user hiện tại.

## `GET /users/{user_id}`
- Admin: xem user bất kỳ
- User thường: chỉ xem chính mình

---

## 4) Agent APIs (`/agents`)

## `GET /agents/`
List agents:
- Admin: thấy tất cả
- User thường: chỉ thấy agent do mình sở hữu

## `POST /agents/`
Tạo agent.
- `owner_user_id` có thể bỏ qua, backend tự lấy từ token.

Request mẫu:
```json
{
  "name": "NewsResearcherAgent",
  "description": "...",
  "system_prompt": "...",
  "model": "gemini-2.5-flash",
  "tools": ["memory", "web_search"],
  "temperature": 0.5
}
```

## `GET /agents/{agent_id}`
Chi tiết 1 agent.

## `PUT /agents/{agent_id}`
Update các field agent (`name`, `description`, `system_prompt`, `model`, `tools`, `temperature`, `config`).

## `PUT /agents/{agent_id}/tools`
Update riêng tools.

## `DELETE /agents/{agent_id}`
Xóa agent.

## `POST /agents/import` (multipart)
Import agents từ file TOML.

## `POST /agents/import/json`
Import agents từ JSON.

## `POST /agents/{agent_id}/chat`
Chat đồng bộ (non-stream HTTP) với 1 agent.

---

## 5) Workflow APIs (`/workflows`)

> Workflow ở UI nên thao tác theo `steps` (mảng agent IDs). Backend tự convert nội bộ thành nodes/edges.

## `POST /workflows/`
Tạo workflow.

Request mẫu:
```json
{
  "name": "Iran News Research & Report",
  "steps": ["agent_uuid_1", "agent_uuid_2"],
  "is_public": false
}
```

## `POST /workflows/import/json`
Import workflow hàng loạt qua JSON.

## `GET /workflows/`
List workflows user có quyền xem (owner/public/shared/admin).

## `GET /workflows/{workflow_id}`
Chi tiết workflow.

## `PUT /workflows/{workflow_id}`
Update workflow (`name`, `steps`, `is_public`).

## `DELETE /workflows/{workflow_id}`
Xóa workflow (owner/admin).

## `POST /workflows/{workflow_id}/share`
Chia sẻ workflow cho user khác.

Request:
```json
{
  "shared_with_user_id": "target_user_uuid",
  "permission": "read"
}
```
`permission` hỗ trợ: `read` | `edit`.

## `POST /workflows/{workflow_id}/chat`
Chạy workflow kiểu chat (non-stream HTTP), trả text cuối.

## `POST /workflows/{workflow_id}/run`
Chạy workflow và lưu execution record.

## `GET /workflows/executions/{execution_id}`
Lấy trạng thái execution (`running/completed/failed`) + context.

---

## 6) Utility APIs

## `GET /tools`
Liệt kê tools available + schema input để UI render dynamic form.

## `POST /execute`
Execute task trực tiếp theo `agent_id` (không qua workflow).

---

## 7) Socket.IO Realtime APIs (Streaming)

Kết nối Socket.IO tới server, sau đó emit event.

## A. Agent realtime chat
Client emit:
- Event: `agent_chat`
- Data:
```json
{
  "agent_id": "agent_uuid",
  "message": "..."
}
```

Server events trả về theo stream:
- `response_chunk` (text chunk)
- `assistant_response` (tuỳ implementation nội bộ)
- `error`

## B. Workflow realtime chat (quan trọng cho UI flow của bạn)
Client emit:
- Event: `workflow_chat`
- Data:
```json
{
  "workflow_id": "workflow_uuid",
  "message": "Tìm tin tức mới nhất về chiến tranh Iran rồi viết báo cáo"
}
```

Server streaming events:
- `node_started`  
  payload: `{ node_id, node_type, turn }`
- `workflow_agent_started`  
  payload: `{ node_id, agent_name }`
- `workflow_agent_chunk`  
  payload: `{ node_id, data: [chunk_text, assistant_response] }`
- `workflow_agent_completed`  
  payload: `{ node_id, agent_name }`
- `node_completed`  
  payload: `{ node_id, turn, result }`
- `workflow_completed`  
  payload: `{ state: {...final_context...} }`
- `error`

### UI rendering gợi ý cho streaming workflow
1. Nhận `node_started` → mở card step mới
2. Nhận `workflow_agent_started` → set trạng thái typing
3. Nhận `workflow_agent_chunk` → append text theo thời gian thực
4. Nhận `workflow_agent_completed` → đóng block agent
5. Nhận `workflow_completed` → render summary/final answer

---

## 8) Permission matrix (UI cần biết)

- Tất cả API (trừ setup-admin-first-time, auth/token) cần Bearer token.
- Agent:
  - Admin: full access
  - User thường: chỉ agent của mình
- Workflow:
  - Read: owner/admin/public/shared
  - Update/Delete/Share: owner hoặc admin
- User list/create: admin only

---

## 9) Data models tối thiểu cho UI

## Agent (rút gọn)
```json
{
  "id": "uuid",
  "owner_user_id": "uuid",
  "name": "string",
  "description": "string",
  "system_prompt": "string",
  "model": "string",
  "tools": ["memory", "web_search", "file_editing"],
  "temperature": 0.6,
  "config": {}
}
```

## Workflow (rút gọn)
```json
{
  "id": "uuid",
  "owner_user_id": "uuid",
  "name": "string",
  "is_public": false,
  "shared_with": ["user_uuid"],
  "steps": ["agent_uuid_1", "agent_uuid_2"],
  "created_at": "datetime"
}
```

## Workflow execution state (stream end)
```json
{
  "state": {
    "original_task": "...",
    "allowed_agents": ["agent_uuid_1", "agent_uuid_2"],
    "coordinator": "agent_uuid_1",
    "last_coordinator_decision": {
      "next_agents": ["agent_uuid_2"],
      "message_to_next": "...",
      "done": false,
      "final_answer": ""
    },
    "final_answer": "..."
  }
}
```

---

## 10) Flow mẫu đúng theo use-case của bạn (Iran news -> write report)

1. Login lấy JWT
2. Tạo `NewsResearcherAgent` (tools: `web_search`)
3. Tạo `ReportWriterAgent` (tools: `file_editing`)
4. Tạo workflow steps `[news_agent_id, report_agent_id]`
5. UI connect Socket.IO
6. UI emit `workflow_chat`
7. UI render toàn bộ event stream (`node_started`, `workflow_agent_chunk`, ...)
8. Kết thúc ở `workflow_completed`
9. UI có thể gọi thêm API file browser (nếu có) hoặc đọc output theo cơ chế lưu file của tool

---

## Ghi chú triển khai UI
- Không hardcode tên agent trong routing logic; luôn dùng `agent_id` UUID.
- Nếu hiển thị timeline, dùng `turn` + `node_id` để group message.
- Với streaming text, append chunk theo thứ tự nhận event.
- Có thể hiển thị realtime JSON quyết định của coordinator để debug route.
