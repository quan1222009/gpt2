import express from "express";

const app = express();
app.use(express.json({ limit: "25mb" }));

/* ================== GIAO DIỆN ================== */
app.get("/", (req, res) => {
  res.send(`<!DOCTYPE html>
<html lang="vi">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Human AI</title>

<style>
*{box-sizing:border-box}
body{margin:0;font-family:-apple-system,BlinkMacSystemFont,sans-serif;background:#0f172a;color:#fff}
#app{display:flex;flex-direction:column;height:100vh}
header{height:50px;background:#020617;display:flex;align-items:center;justify-content:space-between;padding:0 12px}
header span{font-weight:600}
header button{background:none;border:none;color:#fff;font-size:22px}

#chat{flex:1;overflow:auto;padding:10px}
.msg{max-width:85%;padding:10px 12px;border-radius:14px;margin-bottom:8px;white-space:pre-wrap;line-height:1.45}
.user{background:#2563eb;margin-left:auto}
.ai{background:#1e293b}

#inputBar{display:flex;gap:6px;padding:8px;background:#020617}
textarea{flex:1;resize:none;border:none;border-radius:10px;padding:8px;font-size:15px}
textarea:focus{outline:none}
button.send{background:#22c55e;color:#000;font-weight:600}
button.icon{background:#334155;color:#fff}

#panel{position:fixed;top:0;right:-100%;width:100%;height:100%;background:#020617;padding:16px;transition:.3s;z-index:10}
#panel.show{right:0}
input,select{width:100%;margin-bottom:10px;padding:8px;border-radius:8px;border:none}
.panelBtn{width:100%;padding:10px;border:none;border-radius:10px;font-weight:600;margin-top:6px}
.save{background:#22c55e}
.close{background:#ef4444}
</style>
</head>

<body>
<div id="app">
<header>
<span>🤖 Human AI</span>
<button onclick="togglePanel()">⋮</button>
</header>

<div id="chat"></div>

<div id="inputBar">
<button class="icon" onclick="imgInput.click()">📷</button>
<textarea id="textInput" rows="1" placeholder="Nhập đề bài hoặc câu hỏi..."></textarea>
<button class="send" onclick="send()">➤</button>
<input type="file" id="imgInput" accept="image/*" hidden>
</div>
</div>

<div id="panel">
<h3>Cài đặt</h3>

<label>Gemini API Key</label>
<input id="apiKeyInput" placeholder="AIza...">

<label>Chọn lớp</label>
<select id="lopSelect">
${Array.from({length:12},(_,i)=>`<option value="${i+1}">Lớp ${i+1}</option>`).join("")}
</select>

<button class="panelBtn save" onclick="saveSetting()">💾 Lưu</button>
<button class="panelBtn close" onclick="togglePanel()">❌ Đóng</button>
</div>

<script>
const chat = document.getElementById("chat");
const textInput = document.getElementById("textInput");
const imgInput = document.getElementById("imgInput");
const apiKeyInput = document.getElementById("apiKeyInput");
const lopSelect = document.getElementById("lopSelect");

apiKeyInput.value = localStorage.apiKey || "";
lopSelect.value = localStorage.lop || "9";

function togglePanel(){panel.classList.toggle("show")}

function saveSetting(){
  localStorage.apiKey = apiKeyInput.value.trim();
  localStorage.lop = lopSelect.value;
  alert("Đã lưu cài đặt");
}

function addMsg(role, text){
  const div = document.createElement("div");
  div.className = "msg " + role;
  div.textContent = text;
  chat.appendChild(div);
  chat.scrollTop = chat.scrollHeight;
}

async function send(extra = {}){
  if(!textInput.value && !extra.image) return;

  addMsg("user", textInput.value || "[Đã gửi ảnh]");
  const payload = {
    message: textInput.value,
    image: extra.image,
    apiKey: localStorage.apiKey,
    lop: localStorage.lop
  };
  textInput.value = "";

  const res = await fetch("/generate", {
    method: "POST",
    headers: {"Content-Type":"application/json"},
    body: JSON.stringify(payload)
  });
  const data = await res.json();
  addMsg("ai", data.reply || "❌ Lỗi");
}

imgInput.onchange = () => {
  const r = new FileReader();
  r.onload = () => send({ image: r.result.split(",")[1] });
  r.readAsDataURL(imgInput.files[0]);
};
</script>
</body>
</html>`);
});

/* ================== AI ================== */
app.post("/generate", async (req, res) => {
  const { message = "", image, apiKey, lop = "9" } = req.body;
  if (!apiKey) return res.json({ reply: "❌ Bạn chưa nhập Gemini API key" });

  const prompt = `
Bạn là học sinh Việt Nam lớp ${lop}.
Tự nhận dạng đề.

- Nếu là TOÁN:
  + Trình bày như vở học sinh
  + Có "Giải" và "Kết luận"
  + Không nói lý thuyết AI

- Nếu là VĂN:
  + Viết đúng dạng đề nghị luận
  + Có Mở bài – Thân bài – Kết bài
  + Văn phong học sinh, tự nhiên

- Không bao giờ nói mình là AI
- Không ghi chú thừa

Đề bài:
${message}
`;

  const body = {
    contents: [{
      parts: [
        image ? { inline_data:{ mime_type:"image/jpeg", data:image } } : null,
        { text: prompt }
      ].filter(Boolean)
    }]
  };

  const r = await fetch(
    "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=" + apiKey,
    { method:"POST", headers:{ "Content-Type":"application/json" }, body:JSON.stringify(body) }
  );

  const j = await r.json();
  res.json({ reply: j.candidates?.[0]?.content?.parts?.[0]?.text || "❌ AI không trả lời" });
});

app.listen(process.env.PORT || 3000);
