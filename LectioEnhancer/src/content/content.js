function enhanceLectio() {
  console.log("Enhancing Lectio...");
  document.body.classList.add("lectio-enhanced");
  LectioEnhancer.initDarkMode();
  createUnifiedDrawer();
  LectioEnhancer.enhanceSchedulePage();
}

function createUnifiedDrawer() {
  const drawer = document.createElement("div");
  drawer.className = "lectio-drawer";

  const isDrawerOpen = localStorage.getItem("lectioEnhancerDrawerOpen") === "true";
  if (isDrawerOpen) {
    drawer.classList.add("open");
  }

  drawer.innerHTML = `
    <div class="drawer-handle">
      <span class="handle-icon">${isDrawerOpen ? "▶" : "◀"}</span>
    </div>
    <div class="drawer-content">
      <h3>Lectio Enhancer</h3>
      <div id="drawer-leaderboard"></div>
      <button id="drawer-dark-mode">
        <span class="mode-icon">🌙</span>
        Dark Mode
      </button>
      <div class="drawer-messages">
        <h3>Beskeder</h3>
        <div class="message-list">
          <div class="loading">Indlæser beskeder...</div>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(drawer);

  const handle = drawer.querySelector(".drawer-handle");
  handle.addEventListener("click", () => {
    drawer.classList.toggle("open");
    const isOpen = drawer.classList.contains("open");
    handle.querySelector(".handle-icon").textContent = isOpen ? "▶" : "◀";
    localStorage.setItem("lectioEnhancerDrawerOpen", isOpen);
  });

  const leaderboardContainer = document.getElementById("drawer-leaderboard");
  LectioEnhancer.updateLeaderboard(leaderboardContainer);

  const darkModeBtn = document.getElementById("drawer-dark-mode");
  darkModeBtn.addEventListener("click", () => {
    LectioEnhancer.toggleDarkMode();
    const icon = darkModeBtn.querySelector(".mode-icon");
    icon.textContent = document.body.classList.contains("dark-mode") ? "☀️" : "🌙";
  });

  // Hent gemte beskeder fra storage
  chrome.storage.local.get(['lectioMessages'], (data) => {
    console.log("Got messages from storage:", data);
    if (data.lectioMessages) {
      updateMessageList(data.lectioMessages);
    }
  });

  // Lyt efter opdateringer fra background script
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "updateMessages") {
      updateMessageList(request.messages);
    }
  });
}

function updateMessageList(messages) {
  const messageList = document.querySelector('.message-list');
  if (!messageList) return;

  messageList.innerHTML = messages.map(msg => `
    <div class="message-item">
      <div class="message-subject">${msg.subject}</div>
      <div class="message-info">
        <span class="message-sender">${msg.sender}</span>
        <span class="message-date">${msg.date}</span>
      </div>
    </div>
  `).join('');
}

// Message listeners
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "updateCourses") {
    LectioEnhancer.saveCourses();
    LectioEnhancer.applyGroupColors();
    sendResponse({ success: true });
  }
  if (request.action === "updateColors") {
    LectioEnhancer.applyGroupColors();
    sendResponse({ success: true });
  }
  if (request.action === "getUserInfo") {
    const userInfo = extractUserInfo();
    sendResponse(userInfo);
  }
  if (request.action === "checkLoginStatus") {
    const userElement = document.querySelector(".ls-master-header-institution");
    const isLoggedIn = !!userElement;
    const username = isLoggedIn ? userElement.textContent.trim() : null;
    sendResponse({ isLoggedIn, username });
  }
  return true;
});

function extractUserInfo() {
  const schoolIdMatch = window.location.href.match(/lectio\/(\d+)\//);
  const schoolId = schoolIdMatch ? parseInt(schoolIdMatch[1]) : null;

  if (!window.location.href.endsWith("forside.aspx")) {
    return null;
  }

  const titleElement = document.querySelector("#s_m_HeaderContent_MainTitle");
  if (!titleElement || !titleElement.textContent.includes("Forside")) {
    return null;
  }

  const nameSpan = titleElement.querySelector(".ls-hidden-smallscreen");
  if (!nameSpan) return null;

  let name;
  const spanText = nameSpan.textContent;

  if (spanText.startsWith("Eleven")) {
    name = spanText.replace("Eleven ", "").split(" ")[0].trim();
  } else if (spanText.startsWith("Læreren")) {
    name = spanText.split("-")[1].trim().split(" ")[0];
  } else {
    return null;
  }

  return {
    name: name,
    schoolId: schoolId,
  };
}

// Initialiser når siden er indlæst
window.addEventListener("load", enhanceLectio);
