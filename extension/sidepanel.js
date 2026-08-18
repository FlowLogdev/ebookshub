// EbooksHub Assistant — side panel logic. Talks to background.js for auth
// state and page context, and to the ebookhubs.com backend for guidance.
// This file never touches the page the user is looking at — it only
// displays text. See extension/README.md for the scope decision.

const API_BASE = "https://ebookhubs.com" // change to http://localhost:3000 for local dev, see README.md

const connectView = document.getElementById("connectView")
const chatView = document.getElementById("chatView")
const connectBtn = document.getElementById("connectBtn")
const reconnectBtn = document.getElementById("reconnectBtn")
const messagesEl = document.getElementById("messages")
const chatForm = document.getElementById("chatForm")
const chatInput = document.getElementById("chatInput")
const sendBtn = document.getElementById("sendBtn")

let history = []

function sendToBackground(message) {
  return new Promise((resolve) => chrome.runtime.sendMessage(message, resolve))
}

async function getAuth() {
  return sendToBackground({ type: "GET_AUTH" })
}

function isExpired(auth) {
  return !auth?.token || (auth.expiresAt && new Date(auth.expiresAt).getTime() < Date.now())
}

async function refreshView() {
  const auth = await getAuth()
  if (isExpired(auth)) {
    connectView.hidden = false
    chatView.hidden = true
    reconnectBtn.hidden = true
  } else {
    connectView.hidden = true
    chatView.hidden = false
    reconnectBtn.hidden = false
  }
}

connectBtn.addEventListener("click", () => {
  chrome.tabs.create({ url: `${API_BASE}/extension/connect` })
})

reconnectBtn.addEventListener("click", async () => {
  await sendToBackground({ type: "CLEAR_AUTH" })
  history = []
  messagesEl.innerHTML = '<p class="empty-hint">Reconnecting…</p>'
  chrome.tabs.create({ url: `${API_BASE}/extension/connect` })
  await refreshView()
})

function appendMessage(role, text) {
  const el = document.createElement("div")
  el.className = `msg ${role}`
  el.textContent = text
  messagesEl.appendChild(el)
  messagesEl.scrollTop = messagesEl.scrollHeight
  return el
}

chatForm.addEventListener("submit", async (e) => {
  e.preventDefault()
  const content = chatInput.value.trim()
  if (!content) return

  const auth = await getAuth()
  if (isExpired(auth)) {
    await refreshView()
    return
  }

  chatInput.value = ""
  sendBtn.disabled = true
  history.push({ role: "user", content })
  appendMessage("user", content)
  const thinking = appendMessage("thinking", "Looking at the page…")

  try {
    const page = await sendToBackground({ type: "GET_PAGE_CONTEXT" })
    if (page?.error) throw new Error(page.error)

    const res = await fetch(`${API_BASE}/api/copilot/suggest`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${auth.token}` },
      body: JSON.stringify({ messages: history, page }),
    })
    const data = await res.json()
    thinking.remove()

    if (!res.ok) {
      if (res.status === 401) {
        await sendToBackground({ type: "CLEAR_AUTH" })
        await refreshView()
        appendMessage("error", "Your connection expired. Reconnect your account to keep going.")
        return
      }
      throw new Error(data.error ?? "Something went wrong.")
    }

    history.push({ role: "assistant", content: data.reply })
    appendMessage("assistant", data.reply)
  } catch (err) {
    thinking.remove()
    appendMessage("error", err instanceof Error ? err.message : "Something went wrong.")
    history.pop() // don't keep an unanswered turn in the context sent next time
  } finally {
    sendBtn.disabled = false
  }
})

refreshView()
