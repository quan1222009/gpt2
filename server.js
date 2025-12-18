import express from "express";
import fetch from "node-fetch";

const app = express();
app.use(express.json());

/* ================= SERVER ================= */

app.post("/api/chat", async (req, res) => {
  const { apiKey, message, level } = req.body;

  if (!apiKey) {
    return res.json({ reply: "Chưa nhập API key." });
  }

  const style = {
    gioi: "Trả lời như học sinh giỏi, lập luận rõ ràng, không dùng từ ngữ AI.",
    kha: "Trả lời như học sinh khá, dễ hiểu, có thể thiếu 1-2 chi tiết nhỏ.",
    trungbinh: "Trả lời đơn giản, đúng trọng tâm, không quá dài.",
    yeu: "Trả lời ngắn, dễ hiểu, giống người làm bài mức cơ bản."
  }[level || "trungbinh"];

  const prompt = `
Bạn là con người, không phải AI.
${style}
Viết tự nhiên như người làm bài tập.
Không nói bạn là AI.
Không dùng văn mẫu.

Câu hỏi:
${message}
`;

  try {
    const r = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }]
        })
      }
    );

    const data = await r.json();
    const reply =
      data.candidates?.[0]?.content?.parts?.[0]?.text ||
      "Không có phản hồi.";

    res.json({ reply });
  } catch (e) {
    res.json({ reply: "Lỗi kết nối Gemini." });
  }
});

/* ================= WEB ================= */

app.get("/", (req, res) => {
  res.send(`<!DOCTYPE html>
<html lang="vi">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>AI Chat</title>
<style>
*{box-sizing:border-box;font-family:system-ui}
body{margin:0;background:#0f172a;color:#fff;height:100vh}
#app{display:flex;flex-direction:column;height:100vh}
header{padding:12px 16px;background:#020617;display:flex;justify-content:space-between;align-items:center}
header span{font-weight:600}
header button{background:none;border:none;color:#fff;font-size:22px}
#chat{flex:1;overflow:auto;padding:12px}
.msg{max-width:85%;padding:10px 12px;border-radius:12px;margin-bottom:8px;white-space:pre-wrap}
.user{background:#2563eb;margin-left:auto}
.bot{background:#1e293b}
#inputBar{display:flex;padding:10px;background:#020617}
#input{flex:1;padding:10px;border-radius:10px;border:none}
#send{margin-left:8px;padding:0 16px;border:none;border-radius:10px;background:#22c55e;color:#000;font-weight:600}
#menu{position:fixed;top:0;right:-100%;width:100%;height:100%;background:#020617;padding:20px;transition:.3s}
#menu h3{margin-top:0}
#menu input,#menu select{width:100%;padding:10px;margin:8px 0;border-radius:8px;border:none}
#menu button{width:100%;padding:10px;margin-top:10px;border:none;border-radius:8px;background:#22c55e;font-weight:600}
</style>
</head>
<body>
<div id="app">
<header>
  <span>Chat AI</span>
  <button onclick="toggle()">⋮</button>
</header>

<div id="chat"></div>

<div id="inputBar">
  <input id="input" placeholder="Nhập câu hỏi..." />
  <button id="send" onclick="send()">Gửi</button>
</div>
</div>

<div id="menu">
<h3>Cài đặt</h3>
<input id="key" placeholder="Gemini API key" />
<select id="level">
<option value="gioi">Học sinh giỏi</option>
<option value="kha">Học sinh khá</option>
<option value="trungbinh">Học sinh trung bình</option>
<option value="yeu">Học sinh yếu</option>
</select>
<button onclick="save()">Lưu</button>
</div>

<script>
const chat = document.getElementById("chat");
const input = document.getElementById("input");

function toggle(){
  const m=document.getElementById("menu");
  m.style.right = m.style.right==="0px" ? "-100%" : "0px";
}

function save(){
  localStorage.setItem("gemini_key", key.value);
  localStorage.setItem("level", level.value);
  alert("Đã lưu");
  toggle();
}

function add(text, cls){
  const d=document.createElement("div");
  d.className="msg "+cls;
  d.innerText=text;
  chat.appendChild(d);
  chat.scrollTop=chat.scrollHeight;
}

async function send(){
  const msg=input.value.trim();
  if(!msg) return;
  add(msg,"user");
  input.value="";
  add("Đang trả lời...","bot");

  const r=await fetch("/api/chat",{
    method:"POST",
    headers:{"Content-Type":"application/json"},
    body:JSON.stringify({
      apiKey:localStorage.getItem("gemini_key"),
      level:localStorage.getItem("level"),
      message:msg
    })
  });

  const data=await r.json();
  chat.lastChild.innerText=data.reply;
}

input.addEventListener("keydown",e=>{
  if(e.key==="Enter") send();
});

key.value=localStorage.getItem("gemini_key")||"";
level.value=localStorage.getItem("level")||"trungbinh";
</script>
</body>
</html>`);
});

app.listen(process.env.PORT || 3000);
