import express from "express";
import { createClient } from "redis";

const app = express();
app.use(express.json());

/* ================= REDIS ================= */
const redis = createClient({
  url: "redis://red-d5217qe3jp1c73f6t5s0:6379"
});

redis.connect().then(() => {
  console.log("✅ Redis connected");
});

/* =============== SAVE API KEY =============== */
app.post("/api/save-key", async (req, res) => {
  const { key } = req.body;
  if (!key) return res.status(400).json({ error: "Missing key" });

  await redis.set("GEMINI_KEY", key);
  res.json({ ok: true });
});

/* =============== CHAT =============== */
app.post("/api/chat", async (req, res) => {
  const { message, mode, grade } = req.body;

  const apiKey = await redis.get("GEMINI_KEY");
  if (!apiKey) {
    return res.json({ reply: "⚠️ Chưa nhập API key" });
  }

  const prompt = `
Bạn là học sinh lớp ${grade}.
Trình độ: ${mode}.
Yêu cầu: trả lời giống người thật, trình bày tự nhiên.
Câu hỏi: ${message}
`;

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }]
      })
    }
  );

  const data = await response.json();
  const reply =
    data.candidates?.[0]?.content?.parts?.[0]?.text ||
    "❌ AI không phản hồi";

  res.json({ reply });
});

/* =============== UI (FULL MOBILE) =============== */
app.get("/", (req, res) => {
  res.send(`
<!DOCTYPE html>
<html>
<head>
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>AI Chat</title>
<style>
body{margin:0;font-family:sans-serif;background:#0f172a;color:#fff}
#chat{height:100vh;display:flex;flex-direction:column}
#messages{flex:1;overflow:auto;padding:10px}
.msg{margin:8px 0}
.user{color:#60a5fa}
.ai{color:#34d399}
#bar{display:flex}
input,select,button{font-size:16px}
input{flex:1;padding:10px}
button{padding:10px}
#settings{position:fixed;top:0;right:0;background:#020617;width:100%;height:100%;display:none;padding:20px}
</style>
</head>
<body>

<div id="chat">
  <div id="messages"></div>
  <div id="bar">
    <input id="msg" placeholder="Nhập đề bài..." />
    <button onclick="send()">Gửi</button>
    <button onclick="openSet()">⋮</button>
  </div>
</div>

<div id="settings">
  <h3>⚙️ Cài đặt</h3>
  <input id="key" placeholder="Gemini API Key" />
  <button onclick="saveKey()">Lưu key</button>
  <br><br>
  <select id="grade">
    ${[...Array(12)].map((_,i)=>`<option>Lớp ${i+1}</option>`).join("")}
  </select>
  <select id="mode">
    <option>Giỏi</option>
    <option>Khá</option>
    <option>Trung bình</option>
    <option>Yếu</option>
  </select>
  <br><br>
  <button onclick="closeSet()">Đóng</button>
</div>

<script>
function add(t,c){messages.innerHTML+=\`<div class="msg \${c}">\${t}</div>\`;messages.scrollTop=99999}

async function send(){
  const m=msg.value; if(!m)return;
  add("Bạn: "+m,"user"); msg.value="";
  const r=await fetch("/api/chat",{method:"POST",headers:{'Content-Type':'application/json'},
    body:JSON.stringify({message:m,grade:grade.value,mode:mode.value})});
  const j=await r.json(); add("AI: "+j.reply,"ai");
}

async function saveKey(){
  await fetch("/api/save-key",{method:"POST",headers:{'Content-Type':'application/json'},
    body:JSON.stringify({key:key.value})});
  alert("Đã lưu key (không cần redeploy)");
}

function openSet(){settings.style.display="block"}
function closeSet(){settings.style.display="none"}
</script>
</body>
</html>
`);
});

/* =============== START =============== */
app.listen(3000, () => console.log("🚀 Server running"));
