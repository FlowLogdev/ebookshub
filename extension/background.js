// EbooksHub Assistant — background service worker.
//
// Two jobs only: (1) receive the auth token handed off by
// app/extension/connect/page.tsx on ebookhubs.com and store it, and
// (2) capture read-only context (screenshot + visible text) from the
// active tab when the side panel asks for it. This worker never clicks,
// types, or submits anything — see README.md for why that's a deliberate
// scope decision, not a missing feature.

const AUTH_STORAGE_KEY = "ebookshub_copilot_auth"
const TRUSTED_ORIGINS = ["https://ebookhubs.com", "http://localhost:3000"]

chrome.runtime.onInstalled.addListener(() => {
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch(() => {})
})

// Handoff from the website: app/extension/connect/page.tsx calls
// chrome.runtime.sendMessage(EXTENSION_ID, {...}) after minting a token
// server-side. Only accepted from the origins this extension trusts
// (matches `externally_connectable` in manifest.json).
chrome.runtime.onMessageExternal.addListener((message, sender, sendResponse) => {
  if (!sender.origin || !TRUSTED_ORIGINS.includes(sender.origin)) {
    sendResponse({ ok: false, error: "Untrusted origin" })
    return
  }
  if (message?.type === "EBOOKSHUB_COPILOT_AUTH" && message.token) {
    chrome.storage.local.set(
      { [AUTH_STORAGE_KEY]: { token: message.token, expiresAt: message.expiresAt } },
      () => sendResponse({ ok: true }),
    )
    return true // keep the message channel open for the async sendResponse above
  }
  sendResponse({ ok: false, error: "Unknown message type" })
})

// Internal messages from sidepanel.js.
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === "GET_AUTH") {
    chrome.storage.local.get(AUTH_STORAGE_KEY, (result) => sendResponse(result[AUTH_STORAGE_KEY] ?? null))
    return true
  }

  if (message?.type === "CLEAR_AUTH") {
    chrome.storage.local.remove(AUTH_STORAGE_KEY, () => sendResponse({ ok: true }))
    return true
  }

  if (message?.type === "GET_PAGE_CONTEXT") {
    getPageContext().then(sendResponse).catch((err) => sendResponse({ error: err.message }))
    return true
  }

  return false
})

async function getPageContext() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
  if (!tab?.id) throw new Error("No active tab.")

  let screenshot
  try {
    screenshot = await chrome.tabs.captureVisibleTab(undefined, { format: "png" })
  } catch {
    // No permission for this tab's origin (outside host_permissions and no
    // activeTab grant yet) — fall back to text-only context.
    screenshot = undefined
  }

  let pageText
  try {
    const [{ result }] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => document.body?.innerText?.slice(0, 6000) ?? "",
    })
    pageText = result
  } catch {
    pageText = undefined
  }

  return { url: tab.url ?? "", title: tab.title ?? "", screenshot, pageText }
}
