import asyncio
import json
import os
import urllib.error
import urllib.parse
import urllib.request
from typing import Any, Dict, Optional

import socketio


API_BASE = os.getenv("API_BASE", "http://localhost:8000")
ADMIN_NAME = os.getenv("ADMIN_NAME", "Admin")
ADMIN_EMAIL = os.getenv("ADMIN_EMAIL", "admin@gmail.com")
ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD", "admin")


def _request_json(
    method: str,
    path: str,
    *,
    payload: Optional[Dict[str, Any]] = None,
    form: Optional[Dict[str, str]] = None,
    token: Optional[str] = None,
) -> tuple[int, Dict[str, Any]]:
    url = f"{API_BASE}{path}"
    headers = {"Accept": "application/json"}
    data: Optional[bytes] = None

    if token:
        headers["Authorization"] = f"Bearer {token}"

    if payload is not None:
        headers["Content-Type"] = "application/json"
        data = json.dumps(payload).encode("utf-8")
    elif form is not None:
        headers["Content-Type"] = "application/x-www-form-urlencoded"
        data = urllib.parse.urlencode(form).encode("utf-8")

    req = urllib.request.Request(url, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            raw = resp.read().decode("utf-8")
            return resp.getcode(), json.loads(raw) if raw else {}
    except urllib.error.HTTPError as e:
        raw = e.read().decode("utf-8")
        try:
            return e.code, json.loads(raw) if raw else {}
        except Exception:
            return e.code, {"detail": raw}


def run_full_workflow_stream_test(task: str = "Tìm tin tức mới nhất về chiến tranh Iran rồi viết báo cáo") -> Dict[str, Any]:
    """
    Workflow: News Research → Report Writing
    1) Agent 1 (NewsResearcherAgent): Search latest Iran war news using web_search
    2) Agent 2 (ReportWriterAgent): Write detailed report using file_editing tool
    3) Coordinator routes from agent 1 to agent 2 after news gathered
    4) Test via Socket.IO streaming
    """

    async def _run() -> Dict[str, Any]:
        # 1) Setup admin (idempotent)
        setup_status, setup_data = _request_json(
            "POST",
            "/users/setup-admin-first-time",
            payload={
                "name": ADMIN_NAME,
                "email": ADMIN_EMAIL,
                "password": ADMIN_PASSWORD,
            },
        )
        if setup_status not in (201, 409):
            raise RuntimeError(f"setup-admin failed: {setup_status} {setup_data}")

        # 2) Login OAuth2
        token_status, token_data = _request_json(
            "POST",
            "/auth/token",
            form={"username": ADMIN_EMAIL, "password": ADMIN_PASSWORD},
        )
        if token_status != 200 or "access_token" not in token_data:
            raise RuntimeError(f"login failed: {token_status} {token_data}")
        token = token_data["access_token"]

        me_status, me = _request_json("GET", "/me", token=token)
        if me_status != 200:
            raise RuntimeError(f"/me failed: {me_status} {me}")

        # 3) Create agents
        agent_1_payload = {
            "name": "NewsResearcherAgent",
            "description": "Tìm tin tức mới nhất về chiến tranh Iran từ web",
            "system_prompt": "Bạn là nhà nghiên cứu tin tức. Tìm kiếm tin tức Iran. Sẽ được cập nhật sau khi tạo agent 2.",
            "tools": ["memory", "web_search"],
            "temperature": 0.5,
        }
        agent_2_payload = {
            "name": "ReportWriterAgent",
            "description": "Viết báo cáo chi tiết về tin tức Iran vào file",
            "system_prompt": """Bạn là nhà viết báo cáo chuyên nghiệp.
Nhiệm vụ:
1. Nhận thông tin tin tức từ NewsResearcherAgent
2. Soạn báo cáo có cấu trúc:
   - Tiêu đề: "Iran War News Report - Current Situation"
   - Tóm tắt (summary)
   - Chi tiết sự kiện
   - Các bên liên quan
   - Tác động và dự báo
3. QUAN TRỌNG: Bạn PHẢI tạo file báo cáo bằng write_or_edit_file tool:
   - Gọi tool với:
     * file_path: "iran_news_report.txt"
     * text_or_search_replace_blocks: [{"search": "", "replace": "Báo cáo Tin Tức Iran..."}]
   - Empty search + replace = tạo file mới
4. Sau khi tạo file, trả về: "✓ File created successfully at iran_news_report.txt"
5. Đảm bảo chuyên nghiệp, dễ đọc, chi tiết""",
            "tools": ["memory", "file_editing"],
            "temperature": 0.6,
        }

        a1_status, a1 = _request_json("POST", "/agents/", payload=agent_1_payload, token=token)
        if a1_status not in (200, 201):
            raise RuntimeError(f"create agent 1 failed: {a1_status} {a1}")

        a2_status, a2 = _request_json("POST", "/agents/", payload=agent_2_payload, token=token)
        if a2_status not in (200, 201):
            raise RuntimeError(f"create agent 2 failed: {a2_status} {a2}")

        agent_1_id = a1["id"]
        agent_2_id = a2["id"]
        
        print(f"\n[DEBUG] Agent IDs:")
        print(f"  NewsResearcherAgent (Coordinator): {agent_1_id}")
        print(f"  ReportWriterAgent (Worker): {agent_2_id}")
        
        # Update coordinator prompt with ACTUAL agent ID - must use exact UUID format
        coordinator_prompt_with_id = f"""Bạn là nhà nghiên cứu tin tức chuyên môn và là coordinator agent.
Nhiệm vụ:
1. Tìm kiếm tin tức mới nhất về chiến tranh Iran bằng web_search tool
2. Thu thập thông tin chi tiết từ nhiều nguồn
3. Tóm tắt các điểm chính: hiện tại, những sự kiện gần đây, các bên liên quan

SAU KHI CÓ THÔNG TIN, BẠN PHẢI QUYẾT ĐỊNH HÀNH ĐỘNG TIẾP THEO:
Gửi thông tin tới ReportWriterAgent để viết báo cáo chi tiết vào file

ĐỊNH DẠNG QUYẾT ĐỊNH CỦA BẠN (trong bình luận cuối cùng của response):
```json
{{
  "next_agents": ["{agent_2_id}"],
  "message_to_next": "Chi tiết tin tức: [tóm tắt thông tin tìm kiếm bao gồm sự kiện, bên liên quan, tình hình hiện tại]",
  "done": false,
  "final_answer": ""
}}
```

QUAN TRỌNG:
- Sử dụng ĐÚNG agent ID: {agent_2_id}
- Đừng sử dụng tên agent, chỉ sử dụng UUID
- Đừng thêm tên vào UUID

Hãy tìm tin tức cụ thể và chi tiết."""
        
        update_payload = {"system_prompt": coordinator_prompt_with_id}
        update_status, update_result = _request_json("PUT", f"/agents/{agent_1_id}", payload=update_payload, token=token)
        if update_status not in (200, 201):
            print(f"Warning: could not update agent 1 prompt: {update_status} {update_result}")

        # 4) Create simple workflow with only steps (agent IDs)
        # Coordinator will dynamically route from agent 1 → agent 2 based on task content
        wf_status, wf = _request_json(
            "POST",
            "/workflows/",
            payload={
                "name": "Iran News Research & Report",
                "steps": [agent_1_id, agent_2_id],
                "is_public": False,
            },
            token=token,
        )
        if wf_status not in (200, 201):
            raise RuntimeError(f"create workflow failed: {wf_status} {wf}")
        workflow_id = wf["id"]

        # 5) Socket.IO workflow streaming test
        sio = socketio.AsyncClient(reconnection=False, logger=False, engineio_logger=False)
        done = asyncio.get_running_loop().create_future()

        @sio.on("node_started")
        async def on_node_started(data):
            print(f"[STEP START] turn={data.get('turn')} node={data.get('node_id')} type={data.get('node_type')}")

        @sio.on("workflow_agent_started")
        async def on_agent_started(data):
            print(f"[AGENT START] node={data.get('node_id')} agent={data.get('agent_name')}")

        @sio.on("workflow_agent_chunk")
        async def on_agent_chunk(data):
            node_id = data.get("node_id")
            chunk_data = data.get("data") or ["", ""]
            chunk_text = chunk_data[0] if isinstance(chunk_data, (list, tuple)) and chunk_data else ""
            if chunk_text:
                print(chunk_text, end="", flush=True)

        @sio.on("workflow_agent_completed")
        async def on_agent_completed(data):
            print(f"\n[AGENT DONE] node={data.get('node_id')} agent={data.get('agent_name')}")

        @sio.on("node_completed")
        async def on_node_completed(data):
            print(f"[STEP DONE] turn={data.get('turn')} node={data.get('node_id')}")

        @sio.on("workflow_completed")
        async def on_workflow_completed(data):
            print("\n[WORKFLOW DONE]")
            if not done.done():
                done.set_result(data)

        @sio.on("error")
        async def on_error(data):
            print(f"\n[WORKFLOW ERROR] {data}")
            if not done.done():
                done.set_exception(RuntimeError(str(data)))

        await sio.connect(API_BASE)
        await sio.emit("workflow_chat", {"workflow_id": workflow_id, "message": task})

        try:
            workflow_result = await asyncio.wait_for(done, timeout=240)
        finally:
            await sio.disconnect()

        return {
            "user": me,
            "agent_ids": [agent_1_id, agent_2_id],
            "workflow_id": workflow_id,
            "workflow_result": workflow_result,
        }

    return asyncio.run(_run())


if __name__ == "__main__":
    result = run_full_workflow_stream_test()
    print("\n\n" + "="*80)
    print("=== TEST SUMMARY ===")
    print("="*80)
    print(json.dumps(result, ensure_ascii=False, indent=2))
    
    # Check if output file was created
    import os
    # Try multiple possible output directory locations
    possible_dirs = [
        os.path.abspath(os.path.expanduser(os.getenv("AGENTCREW_OUTPUT_DIR", "./agent_outputs"))),
        os.path.join(os.path.dirname(__file__), "..", "..", "agent_outputs"),
        "/home/dragon/agentagent/AgentCrew-main (2)/AgentCrew-main/AgentCrew-main/agent_outputs",
    ]
    
    report_path = None
    output_dir = None
    
    print("\n" + "="*80)
    print("=== FILE CHECK ===")
    print("="*80)
    for dir_candidate in possible_dirs:
        abs_dir = os.path.abspath(dir_candidate)
        if os.path.exists(abs_dir):
            output_dir = abs_dir
            report_path = os.path.join(output_dir, "iran_news_report.txt")
            print(f"✓ Found output directory: {output_dir}")
            break
    
    if output_dir is None:
        print(f"✗ Output directory not found. Searched:")
        for d in possible_dirs:
            print(f"  - {os.path.abspath(d)}")
    elif report_path and os.path.exists(report_path):
        print(f"\n✓ SUCCESS! Report file created: {report_path}")
        with open(report_path, "r", encoding="utf-8") as f:
            content = f.read()
            print(f"  File size: {len(content)} bytes")
            print(f"\n  --- File Content ---")
            print(content)
            print(f"  --- End of File ---")
    else:
        print(f"\n✗ Report file NOT created at {report_path}")
        # List what files do exist
        if output_dir and os.path.exists(output_dir):
            files = [f for f in os.listdir(output_dir) if os.path.isfile(os.path.join(output_dir, f))]
            if files:
                print(f"\n  Files in agent_outputs: {files}")
                for f in files:
                    fpath = os.path.join(output_dir, f)
                    fsize = os.path.getsize(fpath)
                    print(f"    - {f} ({fsize} bytes)")
            else:
                print("\n  No files in agent_outputs directory yet")
        
        print(f"\n  Workflow state from result:")
        state = result.get("workflow_result", {}).get("state", {})
        final_answer = state.get("final_answer", "")
        if final_answer:
            print(f"  Final answer: {final_answer[:200]}...")
        
        print(f"\n  To check manually, run:")
        print(f"    ls -la {output_dir or 'agent_outputs'}")
        print(f"    find agent_outputs -type f")
