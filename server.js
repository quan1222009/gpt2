import express from "express";
import fs from "fs";
import path from "path";

const app = express();
app.use(express.json({ limit: "20mb" }));
app.use(express.urlencoded({ extended: true }));

/* ================== CONFIG ================== */
const PORT = process.env.PORT || 3000;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || ""; // nhập trên Render

/* ================== UTILS ================== */
function detectQuestionType(text) {
  const lower = text.toLowerCase();
  if (
    lower.includes("a.") ||
    lower.includes("b.") ||
    lower.includes("c.") ||
    lower.includes("d.") ||
    lower.includes("chọn") ||
    lower.includes("trắc nghiệm")
  ) {
    return "multiple_choice";
  }
  return "essay";
}

function buildSystemPrompt({
  grade,
  mode,
  detailLevel,
  questionType,
}) {
  let base = `Bạn là trợ lý học tập cho học sinh lớp ${grade} tại Việt Nam.\n`;

  if (questionType === "multiple_choice") {
    base +=
      "Đây là đề TRẮC NGHIỆM. Hãy phân tích nhanh, chọn đáp án đúng và giải thích ngắn gọn.\n";
  } else {
    base +=
      "Đây là đề TỰ LUẬN. Hãy trình bày rõ ràng, logic, đúng chương trình học.\n";
  }

  if (mode === "math") {
    base +=
      "Giải toán theo kiểu vở học sinh: ghi từng bước, có lời giải, có đáp số.\n";
  }

  if (mode === "literature") {
    base +=
      "Làm bài văn nghị luận đúng cấu trúc: Mở bài, Thân bài, Kết bài. Văn phong học sinh.\n";
  }

  if (detailLevel === "fast") {
    base += "Trả lời NGẮN GỌN, tập trung kết quả.\n";
  } else {
    base +=
      "Trả lời CHI TIẾT, giải thích dễ hiểu, từng bước.\n";
  }

  return base;
}

/* ================== GEMINI CALL ================== */
async function callGemini(prompt) {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [{ text: prompt }],
          },
        ],
      }),
    }
  );

  const data = await res.json();
  return (
    data.candidates?.[0]?.content?.parts?.[0]?.text ||
    "❌ AI không trả lời được."
  );
}

/* ================== API CHAT ================== */
app.post("/api/chat", async (req, res) => {
  try {
    const {
      message,
      grade = "9",
      mode = "normal", // normal | math | literature
      detailLevel = "detail", // fast | detail
      imageBase64 = null,
    } = req.body;

    if (!message && !imageBase64) {
      return res.json({ reply: "❌ Chưa có nội dung câu hỏi." });
    }

    const questionType = detectQuestionType(message || "");

    const systemPrompt = buildSystemPrompt({
      grade,
      mode,
      detailLevel,
      questionType,
    });

    let finalPrompt = systemPrompt + "\nCâu hỏi:\n" + (message || "");

    if (imageBase64) {
      finalPrompt +=
        "\n(Học sinh gửi kèm hình ảnh đề bài, hãy phân tích nội dung trong ảnh.)";
    }

    const reply = await callGemini(finalPrompt);

    res.json({ reply });
  } catch (e) {
    res.json({ reply: "❌ Lỗi server: " + e.message });
  }
});

/* ================== ROOT ================== */
app.get("/", (req, res) => {
  res.send(`
<!DOCTYPE html>
<html>
<head>
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>AI Học Tập</title>
<style>
body{margin:0;font-family:sans-serif;background:#0f172a;color:#fff}
#chat{height:100vh;display:flex;flex-direction:column}
#messages{flex:1;overflow:auto;padding:10px}
.msg{margin:8px 0;padding:10px;border-radius:10px;max-width:90%}
.user{background:#2563eb;margin-left:auto}
.ai{background:#1e293b}
#controls{display:flex;gap:4px;padding:8px;background:#020617}
select,input,button{padding:8px;border-radius:6px;border:none}
input{flex:1}
</style>
</head>
<body>
<div id="chat">
  <div id="messages"></div>
  <div id="controls">
    <select id="grade">
      ${Array.from({ length: 12 }, (_, i) => `<option>${i + 1}</option>`).join("")}
    </select>
    <select id="mode">
      <option value="normal">Bình thường</option>
      <option value="math">Giải toán</option>
      <option value="literature">Văn nghị luận</option>
    </select>
    <select id="detail">
      <option value="fast">Nhanh</option>
      <option value="detail">Chi tiết</option>
    </select>
  </div>
  <div id="controls">
    <input id="input" placeholder="Nhập đề bài..." />
    <button onclick="send()">Gửi</button>
  </div>
</div>

<script>
async function send(){
  const input=document.getElementById("input");
  if(!input.value)return;
  add(input.value,"user");
  const res=await fetch("/api/chat",{
    method:"POST",
    headers:{"Content-Type":"application/json"},
    body:JSON.stringify({
      message:input.value,
      grade:document.getElementById("grade").value,
      mode:document.getElementById("mode").value,
      detailLevel:document.getElementById("detail").value
    })
  });
  const data=await res.json();
  add(data.reply,"ai");
  input.value="";
}
function add(t,c){
  const d=document.createElement("div");
  d.className="msg "+c;
  d.innerText=t;
  document.getElementById("messages").appendChild(d);
}
</script>
</body>
</html>
`);
});

/* ================== START ================== */
app.listen(PORT, () =>
  console.log("✅ Server chạy tại port " + PORT)
);
