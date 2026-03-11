/**
 * debug-workflow.js
 * Autonomous Socket.IO integration test.
 * Run: node scripts/debug-workflow.js
 */
import { io } from 'socket.io-client';
import axios from 'axios';

const BASE_URL = 'http://192.168.1.40:8000';
const EMAIL    = 'admin@gmail.com';
const PASSWORD = 'admin';
const PROMPT   = 'Tìm tin tức mới nhất về tình hình Iran và viết báo cáo chi tiết';
const TIMEOUT_MS = 120_000; // 2 minutes — LLM workflows can take a while

async function run() {
  // ── Step 1: Auth ───────────────────────────────────────────────────────────
  console.log('\n━━━ STEP 1: Authenticate ━━━');
  let token;
  try {
    const form = new URLSearchParams();
    form.append('username', EMAIL);
    form.append('password', PASSWORD);
    const res = await axios.post(`${BASE_URL}/auth/token`, form.toString(), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
    token = res.data.access_token;
    console.log(`✅ Auth OK — token: ${token.slice(0, 30)}…`);
  } catch (e) {
    console.error('❌ Auth FAILED:', e.response?.data ?? e.message);
    process.exit(1);
  }

  // ── Step 2: Pick a workflow ────────────────────────────────────────────────
  console.log('\n━━━ STEP 2: Fetch Workflows ━━━');
  let workflowId;
  try {
    const res = await axios.get(`${BASE_URL}/workflows/`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const wfs = res.data;
    if (!wfs.length) { console.error('❌ No workflows found.'); process.exit(1); }
    workflowId = wfs[0].id;
    console.log(`✅ Using workflow: "${wfs[0].name}" (${workflowId})`);
    console.log('   Available:', wfs.map(w => `${w.name}(${w.id.slice(0,8)})`).join(', '));
  } catch (e) {
    console.error('❌ Workflow fetch FAILED:', e.response?.data ?? e.message);
    process.exit(1);
  }

  // ── Step 3: Socket.IO ─────────────────────────────────────────────────────
  console.log('\n━━━ STEP 3: Connect Socket.IO ━━━');
  console.log(`   Target: ${BASE_URL}`);
  console.log(`   Token : ${token.slice(0, 30)}…\n`);

  console.log(`   Transport will start with: polling → websocket upgrade`);

  const socket = io(BASE_URL, {
    path: '/socket.io',
    transports: ['polling', 'websocket'],
    withCredentials: true,
    auth: { token },
    forceNew: true,
    reconnection: false,
    timeout: 10_000,   // 10s Engine.IO connect timeout
  });

  // ── Low-level Engine.IO transport hooks ────────────────────────────────────
  // These fire BEFORE Socket.IO events and tell us exactly where it stalls
  socket.io.on('open',  () => console.log('  [EIO] Transport open — sending Socket.IO auth packet…'));
  socket.io.on('error', (e) => console.error('  [EIO] Transport error:', e));
  socket.io.on('close', (reason) => console.warn('  [EIO] Transport closed:', reason));
  socket.io.on('packet', (pkt) => {
    // Show first few raw packets to understand what back-end is sending
    const short = JSON.stringify(pkt).slice(0, 120);
    console.log('  [EIO] ← packet:', short);
  });

  // 20-second connect-phase watchdog (separate from global 120s timeout)
  const connectWatchdog = setTimeout(() => {
    console.error('\n⏱️  20s connect watchdog fired — Socket.IO auth ACK never received.');
    console.error('   This confirms the backend python-socketio "connect" handler is');
    console.error('   not calling sio.emit or returning True after verifying the token.');
    console.error('\n   BACKEND FIX NEEDED: ensure @sio.event async def connect() returns True');
    socket.disconnect();
    process.exit(1);
  }, 20_000);

  // ── Step 4: Event listeners ───────────────────────────────────────────────
  socket.on('connect', () => {
    clearTimeout(connectWatchdog);
    const transport = socket.io.engine.transport.name;
    console.log(`✅ Socket CONNECTED!  sid=${socket.id}  transport=${transport}`);
    console.log('\n━━━ STEP 4: Emit workflow_chat ━━━');
    console.log(`   workflow_id : ${workflowId}`);
    console.log(`   message     : ${PROMPT}\n`);
    socket.emit('workflow_chat', { workflow_id: workflowId, message: PROMPT });
  });

  socket.on('connect_error', (err) => {
    clearTimeout(connectWatchdog);
    console.error('\n❌ connect_error:', err.message);
    console.error('   context:', err.context);
    console.error('   description:', err.description);
    console.error('   data:', err.data);
    process.exit(1);
  });

  socket.on('node_started', (d) =>
    console.log(`🟢 node_started      node_id=${d.node_id}  type=${d.node_type}`));

  socket.on('workflow_agent_started', (d) =>
    console.log(`🤖 agent_started     node_id=${d.node_id}  agent=${d.agent_name}`));

  let chunkTotal = 0;
  socket.on('workflow_agent_chunk', (d) => {
    chunkTotal++;
    // Print first chunk + every 20th one so we can see streaming progress
    if (chunkTotal === 1 || chunkTotal % 20 === 0) {
      const text = Array.isArray(d.data) ? d.data[0] : JSON.stringify(d.data);
      process.stdout.write(`\r   ✍️  chunks: ${chunkTotal}  last: "${text.slice(0, 40)}…"`);
    }
  });

  socket.on('workflow_agent_completed', (d) =>
    console.log(`\n🏁 agent_completed   node_id=${d.node_id}  agent=${d.agent_name}`));

  socket.on('node_completed', (d) =>
    console.log(`🔴 node_completed    node_id=${d.node_id}`));

  socket.on('workflow_completed', (d) => {
    const answer = d?.state?.final_answer ?? '(no final_answer in state)';
    console.log('\n\n' + '═'.repeat(60));
    console.log('🎉  WORKFLOW COMPLETED SUCCESSFULLY!');
    console.log('═'.repeat(60));
    console.log('Final Answer (first 500 chars):\n');
    console.log(answer.slice(0, 500));
    console.log('\n' + '═'.repeat(60));
    socket.disconnect();
    process.exit(0);
  });

  socket.on('error', (d) => {
    console.error('\n❌ Socket error event:', d);
  });

  // ── Global timeout ────────────────────────────────────────────────────────
  setTimeout(() => {
    console.error(`\n⏱️  ${TIMEOUT_MS / 1000}s timeout — no workflow_completed received.`);
    console.error(`   Total chunks received : ${chunkTotal}`);
    console.error('   Check backend logs for errors.');
    socket.disconnect();
    process.exit(1);
  }, TIMEOUT_MS);
}

run();
