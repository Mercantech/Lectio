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

  const isDrawerOpen =
    localStorage.getItem("lectioEnhancerDrawerOpen") === "true";
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
      <br />
      <div class="filter-section">
        <div class="filter-group">
          <label>
            Skjul hold med
            <span class="tooltip" data-tooltip="Adskil flere hold med komma">ℹ️</span>
          </label>
          <div class="tag-container" id="hide-tags-container">
            <input type="text" class="tag-input" id="filter-hide-input" placeholder="Tryk Enter for at tilføje" />
          </div>
        </div>
        <div class="filter-group">
          <label>
            Behold kun hold med
            <span class="tooltip" data-tooltip="Adskil flere hold med komma">ℹ️</span>
          </label>
          <div class="tag-container" id="show-tags-container">
            <input type="text" class="tag-input" id="filter-show-input" placeholder="Tryk Enter for at tilføje" />
          </div>
        </div>
        <button id="apply-filters-button">
          <span class="filter-icon">🔍</span>
          Anvend filtre
        </button>
        <button id="copy-filtered-table-button" class="apply-filters-btn gradient-btn" style="margin-top:8px;">
          <span class="filter-icon">📋</span>
          Kopiér synlig tabel
        </button>
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
    icon.textContent = document.body.classList.contains("dark-mode")
      ? "☀️"
      : "🌙";
  });

  const filterHideInput = document.getElementById("filter-hide-input");
  const filterShowInput = document.getElementById("filter-show-input");
  const applyFiltersButton = document.getElementById("apply-filters-button");

  // Hent gemte filtre fra storage
  chrome.storage.local.get(["lectioFilters"], (result) => {
    const savedFilters = result.lectioFilters || {
      hide: ["inf", "it", "da"],
      show: ["dt4h2301aug", "pak"],
    };
    filterHideInput.value = savedFilters.hide.join(", ");
    filterShowInput.value = savedFilters.show.join(", ");
  });

  applyFiltersButton.addEventListener("click", () => {
    const hideFilters = filterHideInput.value
      .split(",")
      .map((f) => f.trim())
      .filter((f) => f.length > 0);

    const showFilters = filterShowInput.value
      .split(",")
      .map((f) => f.trim())
      .filter((f) => f.length > 0);

    // Gem filtrene til senere brug
    chrome.storage.local.set({
      lectioFilters: {
        hide: hideFilters,
        show: showFilters,
      },
    });

    applyBothFilters(hideFilters, showFilters);
  });

  // Hent gemte beskeder fra storage
  chrome.storage.local.get(["lectioMessages"], (data) => {
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

  // --- KOPIER TABEL KNAP ---
  const copyFilteredTableButton = document.getElementById("copy-filtered-table-button");
  copyFilteredTableButton.addEventListener("click", () => {
    copyVisibleFilteredTableRows();
  });
}

function updateMessageList(messages) {
  const messageList = document.querySelector(".message-list");
  if (!messageList) return;

  messageList.innerHTML = messages
    .map(
      (msg) => `
    <div class="message-item">
      <div class="message-subject">${msg.subject}</div>
      <div class="message-info">
        <span class="message-sender">${msg.sender}</span>
        <span class="message-date">${msg.date}</span>
      </div>
    </div>
  `
    )
    .join("");
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
  if (request.action === "filterRows") {
    filterRowsByHold(request.substring);
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

function filterRowsByHold(filters, mode = "hide") {
  // Find alle table rows, undtagen header rows
  const rows = document.querySelectorAll(
    "tbody tr:not(:first-child):not(:last-child)"
  );

  rows.forEach((row) => {
    // Find span elementet i første celle der indeholder holdnavnet
    const holdSpan = row.querySelector("td span[data-lectiocontextcard]");

    if (holdSpan) {
      const holdText = holdSpan.textContent.toLowerCase();
      const matchesFilter = filters.some((filter) =>
        holdText.includes(filter.toLowerCase())
      );

      if (mode === "hide") {
        // Skjul rækker der matcher filtrene
        row.style.display = matchesFilter ? "none" : "";
      } else if (mode === "show") {
        // Vis kun rækker der matcher filtrene
        row.style.display = matchesFilter ? "" : "none";
      }
    }
  });
}

function applyBothFilters(hideFilters, showFilters) {
  // Find alle table rows, undtagen header rows
  const rows = document.querySelectorAll(
    "tbody tr:not(:first-child):not(:last-child)"
  );

  rows.forEach((row) => {
    // Find span elementet i første celle der indeholder holdnavnet
    const holdSpan = row.querySelector("td span[data-lectiocontextcard]");

    if (holdSpan) {
      const holdText = holdSpan.textContent.toLowerCase();

      // Tjek om rækken matcher nogle af hide-filtrene
      const shouldHide = hideFilters.some((filter) =>
        holdText.includes(filter.toLowerCase())
      );

      // Tjek om rækken matcher nogle af show-filtrene
      const shouldShow =
        showFilters.length === 0 ||
        showFilters.some((filter) => holdText.includes(filter.toLowerCase()));

      // Vis kun rækken hvis den IKKE skal skjules OG den skal vises
      row.style.display = !shouldHide && shouldShow ? "" : "none";
    }
  });
}

// Funktion til at kopiere synlige rækker fra aktivitetsplan-tabellen (kun hoved-tbody)
function copyVisibleFilteredTableRows() {
  const table = document.getElementById("m_Content_aktivitetsplanDynamicTable");
  if (!table) {
    showToast("Tabellen med aktivitetsplanen blev ikke fundet!", true);
    return;
  }
  // Find første tbody direkte under tabellen
  const tbody = table.querySelector(":scope > tbody");
  if (!tbody) {
    showToast("Ingen tbody fundet i aktivitetsplan-tabellen!", true);
    return;
  }
  const rows = Array.from(tbody.children).filter(row => row.tagName === "TR");
  let output = [];
  rows.forEach(row => {
    if (row.style.display === "none") return;
    if (window.getComputedStyle(row).display === "none") return;
    let cells = Array.from(row.children).map(cell => cell.innerText.trim());
    output.push(cells.join("\t"));
  });
  const text = output.join("\n");
  navigator.clipboard.writeText(text).then(() => {
    showToast("Tabel kopieret til udklipsholderen! Du kan nu indsætte i Google Sheets eller Excel.");
  });
}

// Toast-funktion
function showToast(message, isError = false) {
  let toast = document.createElement("div");
  toast.className = "lectio-toast" + (isError ? " error" : "");
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => {
    toast.classList.add("show");
  }, 10);
  setTimeout(() => {
    toast.classList.remove("show");
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// Initialiser når siden er indlæst
window.addEventListener("load", enhanceLectio);
