/*
 * ReachTheSoul Chat Widget
 * Embed this on your website to receive messages directly into your ReachTheSoul dashboard.
 *
 * Usage:
 *   <script src="https://reachthesoul.org/widget.js" data-org="YOUR_ORG_ID"></script>
 *
 * Options (data attributes):
 *   data-org       (required) Your organization ID
 *   data-color     Primary color (default: #2563EB)
 *   data-title     Widget title (default: "Chat with us")
 *   data-subtitle  Subtitle text (default: "We usually reply within minutes")
 *   data-position  "right" or "left" (default: "right")
 */
(function () {
  "use strict";

  // Read config from script tag
  var script = document.currentScript || document.querySelector('script[data-org]');
  if (!script) return;

  var ORG_ID = script.getAttribute("data-org");
  if (!ORG_ID) { console.warn("[ReachTheSoul] data-org is required"); return; }

  var PRIMARY = script.getAttribute("data-color") || "#2563EB";
  var TITLE = script.getAttribute("data-title") || "Chat with us";
  var SUBTITLE = script.getAttribute("data-subtitle") || "We usually reply within minutes";
  var POSITION = script.getAttribute("data-position") || "right";
  var API_URL = "https://asia-southeast1-reachthesoul-prod.cloudfunctions.net/webhookFonnte";

  // Generate visitor ID (persist in localStorage)
  var VISITOR_KEY = "rts_visitor_" + ORG_ID;
  var visitorId = localStorage.getItem(VISITOR_KEY);
  if (!visitorId) {
    visitorId = "web_" + Math.random().toString(36).substr(2, 12) + "_" + Date.now();
    localStorage.setItem(VISITOR_KEY, visitorId);
  }

  // CSS
  var css = document.createElement("style");
  css.textContent = '\
    #rts-widget-btn{position:fixed;bottom:24px;' + POSITION + ':24px;z-index:99999;width:56px;height:56px;border-radius:50%;background:' + PRIMARY + ';color:#fff;border:none;cursor:pointer;box-shadow:0 4px 20px rgba(0,0,0,0.2);display:flex;align-items:center;justify-content:center;transition:all 0.3s;}\
    #rts-widget-btn:hover{transform:scale(1.08);box-shadow:0 6px 28px rgba(0,0,0,0.3);}\
    #rts-widget-btn svg{width:26px;height:26px;fill:currentColor;}\
    #rts-widget-badge{position:absolute;top:-2px;right:-2px;width:18px;height:18px;background:#EF4444;border-radius:50%;font-size:10px;font-weight:700;color:#fff;display:none;align-items:center;justify-content:center;border:2px solid #fff;}\
    #rts-widget-box{position:fixed;bottom:90px;' + POSITION + ':24px;z-index:99999;width:360px;max-width:calc(100vw - 32px);height:500px;max-height:calc(100vh - 120px);background:#fff;border-radius:16px;box-shadow:0 12px 48px rgba(0,0,0,0.15);display:none;flex-direction:column;overflow:hidden;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;}\
    #rts-widget-box.open{display:flex;}\
    #rts-widget-header{background:' + PRIMARY + ';color:#fff;padding:16px 20px;flex-shrink:0;}\
    #rts-widget-header h3{font-size:15px;font-weight:600;margin:0 0 2px;}\
    #rts-widget-header p{font-size:11px;opacity:0.7;margin:0;}\
    #rts-widget-close{position:absolute;top:12px;right:12px;background:none;border:none;color:#fff;cursor:pointer;opacity:0.7;font-size:20px;}\
    #rts-widget-close:hover{opacity:1;}\
    #rts-widget-messages{flex:1;overflow-y:auto;padding:16px;display:flex;flex-direction:column;gap:8px;}\
    .rts-msg{max-width:80%;padding:10px 14px;border-radius:12px;font-size:13px;line-height:1.5;word-wrap:break-word;}\
    .rts-msg-them{align-self:flex-start;background:#F1F5F9;color:#334155;border-bottom-left-radius:4px;}\
    .rts-msg-me{align-self:flex-end;background:' + PRIMARY + ';color:#fff;border-bottom-right-radius:4px;}\
    .rts-msg-time{font-size:9px;opacity:0.5;margin-top:4px;}\
    #rts-widget-input-wrap{display:flex;gap:8px;padding:12px 16px;border-top:1px solid #E2E8F0;flex-shrink:0;}\
    #rts-widget-input{flex:1;border:1px solid #E2E8F0;border-radius:8px;padding:8px 12px;font-size:13px;outline:none;font-family:inherit;}\
    #rts-widget-input:focus{border-color:' + PRIMARY + ';}\
    #rts-widget-send{background:' + PRIMARY + ';color:#fff;border:none;border-radius:8px;padding:8px 16px;cursor:pointer;font-size:13px;font-weight:600;font-family:inherit;}\
    #rts-widget-send:hover{opacity:0.9;}\
    #rts-widget-send:disabled{opacity:0.5;cursor:not-allowed;}\
    .rts-typing{align-self:flex-start;padding:10px 14px;background:#F1F5F9;border-radius:12px;font-size:12px;color:#94A3B8;}\
    .rts-powered{text-align:center;padding:6px;font-size:9px;color:#94A3B8;border-top:1px solid #F1F5F9;}\
    .rts-powered a{color:#64748B;text-decoration:none;font-weight:600;}\
  ';
  document.head.appendChild(css);

  // Button
  var btn = document.createElement("button");
  btn.id = "rts-widget-btn";
  btn.setAttribute("aria-label", "Open chat");
  btn.innerHTML = '<svg viewBox="0 0 24 24"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg><span id="rts-widget-badge">0</span>';
  document.body.appendChild(btn);

  // Chat box
  var box = document.createElement("div");
  box.id = "rts-widget-box";
  box.innerHTML = '\
    <div id="rts-widget-header" style="position:relative">\
      <h3>' + TITLE + '</h3>\
      <p>' + SUBTITLE + '</p>\
      <button id="rts-widget-close">&times;</button>\
    </div>\
    <div id="rts-widget-messages">\
      <div class="rts-msg rts-msg-them">Hi there! 👋 How can we help you today?</div>\
    </div>\
    <div id="rts-widget-input-wrap">\
      <input id="rts-widget-input" type="text" placeholder="Type a message..." />\
      <button id="rts-widget-send">Send</button>\
    </div>\
    <div class="rts-powered">Powered by <a href="https://reachthesoul.org" target="_blank">ReachTheSoul</a></div>\
  ';
  document.body.appendChild(box);

  // Elements
  var messagesEl = document.getElementById("rts-widget-messages");
  var inputEl = document.getElementById("rts-widget-input");
  var sendBtn = document.getElementById("rts-widget-send");
  var closeBtn = document.getElementById("rts-widget-close");
  var isOpen = false;

  // Toggle
  btn.onclick = function () {
    isOpen = !isOpen;
    box.classList.toggle("open", isOpen);
    if (isOpen) inputEl.focus();
  };
  closeBtn.onclick = function () {
    isOpen = false;
    box.classList.remove("open");
  };

  // Add message to UI
  function addMessage(text, isMine) {
    var el = document.createElement("div");
    el.className = "rts-msg " + (isMine ? "rts-msg-me" : "rts-msg-them");
    el.textContent = text;
    var timeEl = document.createElement("div");
    timeEl.className = "rts-msg-time";
    timeEl.textContent = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    el.appendChild(timeEl);
    messagesEl.appendChild(el);
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  // Show typing indicator
  function showTyping() {
    var el = document.createElement("div");
    el.className = "rts-typing";
    el.id = "rts-typing";
    el.textContent = "Typing...";
    messagesEl.appendChild(el);
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }
  function hideTyping() {
    var el = document.getElementById("rts-typing");
    if (el) el.remove();
  }

  // Send message
  function send() {
    var text = inputEl.value.trim();
    if (!text) return;

    addMessage(text, true);
    inputEl.value = "";
    sendBtn.disabled = true;

    // Send to webhook
    fetch(API_URL + "?org=" + encodeURIComponent(ORG_ID), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sender: visitorId,
        name: "Website Visitor",
        message: text,
        channel: "website",
      }),
    })
      .then(function (r) { return r.json(); })
      .then(function (data) {
        sendBtn.disabled = false;
        // If there's an AI reply in the response, show it
        if (data && data.aiReply) {
          addMessage(data.aiReply, false);
        } else {
          // Show default acknowledgment
          showTyping();
          setTimeout(function () {
            hideTyping();
            addMessage("Thanks for your message! We'll get back to you soon.", false);
          }, 1500);
        }
      })
      .catch(function () {
        sendBtn.disabled = false;
        addMessage("Sorry, something went wrong. Please try again.", false);
      });
  }

  sendBtn.onclick = send;
  inputEl.onkeydown = function (e) {
    if (e.key === "Enter") send();
  };
})();
