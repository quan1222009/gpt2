import express from "express";

const app = express();
app.use(express.json({ limit: "20mb" }));

/* ================== GIAO DIỆN ================== */
app.get("/", (req, res) => {
  res.send(`
<!DOCTYPE html>
<html lang="vi">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0"/>
<title>Human AI</title>
<style>
*{box-sizing:border-box}
body{margin:0;font-family:sans-serif;background:#0f172a;color:#fff}
#app{display:flex;flex-direction:column;height:100vh}
header{padding:12px;background:#020617;display:flex;justify-content:space-between;align-items:center}
header button{background:none;border:none;color:#fff;font-size:20px}
#chat{flex:1;overflow:auto;padding:10px}
.msg{max-width:85%;padding:10px;border-radius:12px;margin-bottom:8px;line-height:1.4}
.user{background:#2563eb;margin-left:auto}
.ai{background:#1e293b}
#inputBar{display:flex;padding:10px;background:#020617;gap:6px}
textarea{flex:1;resize:none;border-radius:8px;border:none;padding:8px}
button{border:none;border-radius:8px;padding:8px}
#panel{position:fixed;top:0;right:-100%;width:100%;height:100%;background:#020617;padding:15px;transition:.3s}
#panel.show{right:0}
select,input{width:100%;margin-bottom:10px;padding:8px;border-radius:6px;border:none}
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
<button onclick="img.click()">📷</button>
<textarea id="text" rows="1" placeholder="Nhập đề bài hoặc câu hỏi..."></textarea>
<button onclick="send()">➤</button>
<input type="file" id="img" accept="image/*" hidden />
</div>
</div>

<div id="panel">
<h3>Cài đặt</h3>
<label>Gemini API Key</label>
<input id="key"/>
<label>Chọn lớp</label>
<select id="lop">
${Array.from({length:12},(_,i)=>`<option>${i+1}</option>`).join("")}
</select>
<button onclick="save()">💾 Lưu</button>
<button onclick="togglePanel()">❌ Đóng</button>
</div>

<script>
const chat=document.getElementById("chat");
const text=document.getElementById("text");
const img=document.getElementById("img");
const key=document.getElementById("key");
const lop=document.getElementById("lop");

key.value=localStorage.key||"";
lop.value=localStorage.lop||"9";

function togglePanel(){panel.classList.toggle("show")}
function save(){
 localStorage.key=key.value;
 localStorage.lop=lop.value;
 alert("Đã lưu");
}

function add(role,content){
 const d=document.createElement("div");
 d.className="msg "+role;
 d.textContent=content;
 chat.appendChild(d);
 chat.scrollTop=chat.scrollHeight;
}

async function send(data={}){
 if(!text.value && !data.image) return;
 add("user", text.value||"[Đã gửi ảnh]");
 const res=await fetch("/generate",{
  method:"POST",
  headers:{"Content-Type":"application/json"},
  body:JSON.stringify({
   message:text.value,
   image:data.image,
   apiKey:localStorage.key,
   lop:localStorage.lop
  })
 });
 const j=await res.json();
 add("ai",j.reply);
 text.value="";
}

img.onchange=()=>{
 const r=new FileReader();
 r.onload=()=>send({image:r.result.split(",")[1]});
 r.readAsDataURL(img.files[0]);
};
</script>
</body>
</html>
`);
});

/* ================== AI ================== */
app.post("/generate", async (req, res) => {
  const { message = "", image, apiKey, lop = 9 } = req.body;
  if (!apiKey) return res.json({ reply: "❌ Chưa nhập API key Gemini" });

  const prompt = `
Bạn là học sinh Việt Nam lớp ${lop}.
Tự nhận dạng đề là Toán/Văn.
Nếu Toán: giải từng bước như vở học sinh, có Giải và Kết luận.
Nếu Văn: viết đúng dạng đề, có Mở-Thân-Kết, văn học sinh.
Không nói mình là AI.
Đề:
${message}
`;

  const body = {
    contents: [{
      parts: [
        image ? { inline_data: { mime_type: "image/jpeg", data: image } } : null,
        { text: prompt }
      ].filter(Boolean)
    }]
  };

  const r = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
    { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }
  );

  const j = await r.json();
  res.json({ reply: j.candidates?.[0]?.content?.parts?.[0]?.text || "❌ Lỗi AI" });
});

app.listen(process.env.PORT || 3000);
