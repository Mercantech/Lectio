function enhanceLectio() {
  document.body.classList.add("lectio-enhanced");
  LectioEnhancer.initDarkMode();
  createDrawer();
  LectioEnhancer.enhanceSchedulePage();
}

function createDrawer() {
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
  updateLeaderboard(leaderboardContainer);

  const darkModeBtn = document.getElementById("drawer-dark-mode");
  darkModeBtn.addEventListener("click", () => {
    LectioEnhancer.toggleDarkMode();
    const icon = darkModeBtn.querySelector(".mode-icon");
    icon.textContent = document.body.classList.contains("dark-mode") ? "☀️" : "🌙";
  });
}

async function updateLeaderboard(container) {
  container.innerHTML = `
    <div class="leaderboard-loading">
      <div class="spinner"></div>
      <p>Indlæser rangliste...</p>
    </div>
  `;

  try {
    const currentUser = JSON.parse(localStorage.getItem("currentUser"));
    const isGlobalView = localStorage.getItem("leaderboardView") !== "school";

    const endpoint = isGlobalView
      ? "https://lectio-api.onrender.com/api/Leaderboard/Top10"
      : `https://lectio-api.onrender.com/api/Leaderboard/school/${currentUser.schoolId}`;

    const response = await fetch(endpoint);
    const data = await response.json();

    let html = `
      <div class="leaderboard-section">
        <div class="leaderboard-header">
          <h4>🏆 ${isGlobalView ? "Global Top 10" : "Skole Top 10"}</h4>
          <button class="toggle-view-btn" id="toggleLeaderboardView">
            ${isGlobalView ? "🏫 Vis skolens" : "🌍 Vis global"}
          </button>
        </div>
        <table>
    `;

    data.forEach((item) => {
      const medal = item.position === 1 ? "🥇" : item.position === 2 ? "🥈" : item.position === 3 ? "🥉" : "";
      const isCurrentUser = currentUser && item.userName === currentUser.name;
      const rowClass = isCurrentUser ? "current-user-row" : "";

      html += `
        <tr class="${rowClass}">
          <td>${medal} #${item.position}</td>
          <td>${item.userName}</td>
          <td>${item.totalPoints} pts</td>
        </tr>
      `;
    });

    html += "</table></div>";
    container.innerHTML = html;

    const toggleBtn = container.querySelector("#toggleLeaderboardView");
    if (toggleBtn) {
      toggleBtn.addEventListener("click", async () => {
        const newView = isGlobalView ? "school" : "global";
        localStorage.setItem("leaderboardView", newView);
        updateLeaderboard(container);
      });
    }
  } catch (error) {
    container.innerHTML = `
      <p>Kunne ikke indlæse ranglisten for skolen.</p>
      <button class="switch-view-btn" id="switchToGlobalView">Vis global rangliste</button>
    `;

    const switchButton = container.querySelector("#switchToGlobalView");
    if (switchButton) {
      switchButton.addEventListener("click", () => {
        localStorage.setItem("leaderboardView", "global");
        updateLeaderboard(container);
      });
    }
  }
}

// Message listeners
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "updateCourses") {
    LectioEnhancer.saveCourses();
    LectioEnhancer.applyGroupColors();
    sendResponse({ success: true });
  }
  if (request.action === "updateColors") {
    const elements = document.querySelectorAll(".s2skemabrik");
    elements.forEach((element) => {
      const courseElements = element.querySelectorAll('[data-lectiocontextcard^="HE"]');
      courseElements.forEach((course) => {
        const courseName = course.textContent.trim();
        const subjectMatch = courseName.match(/\b([A-Za-z]{2,3})$/);
        if (subjectMatch) {
          const subject = subjectMatch[1].toUpperCase();
          if (request.colors[subject]) {
            element.style.backgroundColor = request.colors[subject].background;
            element.style.borderLeft = `4px solid ${request.colors[subject].border}`;
          }
        }
      });
    });
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
    name = spanText.replace("Eleven ", "").split(",")[0].trim();
  } else if (spanText.startsWith("Læreren")) {
    name = spanText.split("-")[1].trim();
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
