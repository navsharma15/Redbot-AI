let prompt = document.querySelector("#prompt");
let submitbtn = document.querySelector("#submit");
let chatContainer = document.querySelector(".chat-box");
let imagebtn = document.querySelector("#image");
let imageinput = document.querySelector("#imageInput");
let filePreview = document.getElementById("file-preview");

const Api_Url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=AIzaSyBhfhiI1ks1hSvtusc1ZFBWMOxDOWB8-hg";

let user = {
  message: null,
  file: { mime_type: null, data: null }
};

async function generateResponse(aiChatBox) {
  let text = aiChatBox.querySelector(".ai-chat-area");
  let bodyData = {
    contents: [{ parts: [{ text: user.message || " " }] }]
  };

  if (user.file.data) {
    bodyData.contents[0].parts.push({ inline_data: user.file });
  }

  try {
    let response = await fetch(Api_Url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(bodyData)
    });

    let data = await response.json();
    let reply = data?.candidates?.[0]?.content?.parts?.[0]?.text || "⚠️ No response from AI.";

    let imageHTML = "";
    if (user.file.data && user.file.mime_type.startsWith("image/")) {
      const format = user.file.mime_type.split("/")[1].toUpperCase();
      imageHTML = `
        <div>
          <strong>[Image - ${format}]</strong><br/>
          <img src="data:${user.file.mime_type};base64,${user.file.data}" class="chooseimg" />
        </div>
      `;
    }

    text.innerHTML = `<strong>RedBot:</strong> ${reply}<br>${imageHTML}`;
  } catch (error) {
    console.error("API error:", error);
    text.innerHTML = "❌ Error getting response from AI.";
  } finally {
    chatContainer.scrollTo({ top: chatContainer.scrollHeight, behavior: "smooth" });
    user.file = { mime_type: null, data: null };
    filePreview.style.display = "none";
    filePreview.innerHTML = "";
  }
}

function createChatBox(html, classes) {
  const div = document.createElement("div");
  div.classList.add(classes);
  div.innerHTML = html;
  return div;
}

function handleChatResponse(message) {
  if (!message.trim() && !user.file.data) return;
  user.message = message;

  let imageHTML = "";
  if (user.file.data) {
    const format = user.file.mime_type.split("/")[1].toUpperCase();
    if (user.file.mime_type.startsWith("image/")) {
      imageHTML = `
        <div>
          <strong>[Image - ${format}]</strong><br/>
          <img src="data:${user.file.mime_type};base64,${user.file.data}" class="chooseimg" />
        </div>
      `;
    } else {
      imageHTML = `<div><strong>📄 File - ${format}</strong></div>`;
    }
  }

  const userHTML = `
    <div class="user-chat-area">
      <strong>You:</strong> ${user.message || ""} ${imageHTML}
    </div>
  `;

  const userChatBox = createChatBox(userHTML, "user-chat-box");
  chatContainer.appendChild(userChatBox);
  chatContainer.scrollTo({ top: chatContainer.scrollHeight, behavior: "smooth" });

  setTimeout(() => {
    const botHTML = `
      <div class="ai-chat-area">
        <strong>RedBot:</strong> <img src="./assets/loading.gif" width="80" alt="Loading..." />
      </div>
    `;
    const aiChatBox = createChatBox(botHTML, "ai-chat-box");
    chatContainer.appendChild(aiChatBox);
    generateResponse(aiChatBox);
  }, 500);

  prompt.value = "";
  filePreview.style.display = "none";
  filePreview.innerHTML = "";
}

// ✅ FIX: Now allows sending even if just file is selected
submitbtn.addEventListener("click", () => {
  if (prompt.value.trim() || user.file.data) {
    handleChatResponse(prompt.value);
  }
});

prompt.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && (prompt.value.trim() || user.file.data)) {
    handleChatResponse(prompt.value);
  }
});

imagebtn.addEventListener("click", () => imageinput.click());

imageinput.addEventListener("change", () => {
  const file = imageinput.files[0];
  if (!file) return;

  user.file = { mime_type: file.type, data: null };

  const reader = new FileReader();
  reader.onload = (e) => {
    const base64String = e.target.result.split(",")[1];
    user.file.data = base64String;

    filePreview.style.display = "flex";

    if (file.type.startsWith("image/")) {
      filePreview.innerHTML = `
        <img src="${e.target.result}" alt="preview" />
        <span>${file.name} (${file.type.split("/")[1].toUpperCase()})</span>
      `;
    } else {
      filePreview.innerHTML = `<span>📄 ${file.name} (${file.type})</span>`;
    }
  };
  reader.readAsDataURL(file);
});

document.querySelector(".delete-btn").addEventListener("click", () => {
  if (confirm("Delete all chat?")) {
    chatContainer.innerHTML = "";
  }
});

document.querySelector(".export-btn").addEventListener("click", async () => {
  const { jsPDF } = window.jspdf;
  const pdf = new jsPDF();
  let y = 10;

  const chats = document.querySelectorAll(".user-chat-box, .ai-chat-box");

  chats.forEach((chat) => {
    const message = chat.innerText.trim();
    const lines = pdf.splitTextToSize(message, 180);

    if (y + lines.length * 10 > 280) {
      pdf.addPage();
      y = 10;
    }

    lines.forEach(line => {
      pdf.text(line, 10, y);
      y += 10;
    });

    y += 5;
  });

  pdf.save("RedBot_Chat.pdf");
});
