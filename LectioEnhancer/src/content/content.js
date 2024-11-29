function enhanceSchedulePage() {
  // Tjek om vi er på skema-siden
  if (window.location.href.includes("SkemaNy.aspx")) {
    // Find skema-relaterede elementer
    const scheduleContainer = document.querySelector(".ls-content-container");
    if (scheduleContainer) {
      saveCourses();
      scheduleContainer.classList.add("enhanced-schedule");

      // Tilføj denne linje
      applyGroupColors();
      setupInfoRows();
    }

    // Find alle tabeller i skemaet
    const tables = document.querySelectorAll("table");
    tables.forEach((table) => {
      table.classList.add("enhanced-table");
    });

    // Tilføj styling til overskrifter
    const headers = document.querySelectorAll(".ls-master-header");
    headers.forEach((header) => {
      header.classList.add("enhanced-header");
    });

    // Tilføj farver til holdene
    applyClassColors();
  }
}

// Tilføj en funktion til at håndtere dark mode
function toggleDarkMode() {
  document.body.classList.toggle("dark-mode");

  // Gem brugerens præference
  const isDarkMode = document.body.classList.contains("dark-mode");
  localStorage.setItem("lectioEnhancerDarkMode", isDarkMode);
}

function createEnhancerButton() {
  const button = document.createElement("button");
  button.id = "lectio-enhancer-btn";

  // Sæt initial tekst baseret på current mode
  const isDarkMode = document.body.classList.contains("dark-mode");
  button.innerHTML = isDarkMode ? "Light Mode" : "Dark Mode";

  button.style.position = "fixed";
  button.style.bottom = "20px";
  button.style.right = "20px";
  button.style.zIndex = "9999";

  button.addEventListener("click", () => {
    toggleDarkMode();
    // Opdater knappens tekst
    button.innerHTML = document.body.classList.contains("dark-mode")
      ? "Light Mode"
      : "Dark Mode";
  });

  document.body.appendChild(button);
}

function enhanceLectio() {
  document.body.classList.add("lectio-enhanced");

  // Check om brugeren tidligere har valgt dark mode
  const savedDarkMode = localStorage.getItem("lectioEnhancerDarkMode");
  if (savedDarkMode === "true") {
    document.body.classList.add("dark-mode");
  }

  createEnhancerButton();
  enhanceSchedulePage();
}

// Vent på at siden er helt indlæst
window.addEventListener("load", enhanceLectio);

// Tilføj denne nye funktion
function applyClassColors() {
  // Find alle skemabrikker
  const elements = document.querySelectorAll(".s2skemabrik");

  elements.forEach((element) => {
    const text = element.textContent.toLowerCase();

    // Tilføj klasser baseret på holdnavn
    if (text.includes("dt3h")) {
      element.classList.add("class-dt3h");
    } else if (text.includes("dteux3h")) {
      element.classList.add("class-dteux3h");
    } else if (text.includes("dt2h")) {
      element.classList.add("class-dt2h");
    } else if (text.includes("dt1h")) {
      element.classList.add("class-dt1h");
    }
    // Tilføj flere holdtyper efter behov
  });
}

// Tilføj denne funktion til content.js
function saveCourses() {
  chrome.storage.sync.get("lectioEnhancerCourses", (data) => {
    const existingCourses = data.lectioEnhancerCourses || {};
    const courseGroups = {
      ...existingCourses,
      ANDRE: new Set(existingCourses.ANDRE || []),
    };

    // Hjælpefunktion til at tjekke om et kursus allerede eksisterer i nogen kategori
    const courseExistsAnywhere = (courseName) => {
      return Object.values(existingCourses).some((courses) =>
        courses.includes(courseName)
      );
    };

    const elements = document.querySelectorAll(".s2skemabrik");

    elements.forEach((element) => {
      const courseElements = element.querySelectorAll(
        '[data-lectiocontextcard^="HE"]'
      );

      courseElements.forEach((course) => {
        const courseName = course.textContent.trim();

        // Hvis kurset allerede eksisterer et sted, spring det over
        if (courseExistsAnywhere(courseName)) {
          return;
        }

        const subjectMatch = courseName.match(/\b([A-Za-z]{2,3})$/);

        if (subjectMatch) {
          const subject = subjectMatch[1].toUpperCase();
          if (!courseGroups[subject]) {
            courseGroups[subject] = new Set();
          }
          courseGroups[subject].add(courseName);
        } else {
          courseGroups.ANDRE.add(courseName);
        }
      });
    });

    const groupedCourses = Object.fromEntries(
      Object.entries(courseGroups).map(([subject, courses]) => [
        subject,
        Array.from(courses),
      ])
    );

    if (groupedCourses.ANDRE?.length === 0) {
      delete groupedCourses.ANDRE;
    }

    chrome.storage.sync.set({
      lectioEnhancerCourses: groupedCourses,
      lastUpdated: new Date().toISOString(),
    });
  });
}

// Tilføj disse hjælpefunktioner
function generateRandomColor() {
  // Generer lysere farver ved at starte fra midten af farvespektret
  const hue = Math.floor(Math.random() * 360);
  return `hsl(${hue}, 70%, 85%)`; // Høj lightness for lysere farver
}

function generateBorderColor(backgroundColor) {
  // Konverter til mørkere version af samme farve til border
  return backgroundColor.replace("85%", "45%");
}

function applyGroupColors() {
  // Hent eller generer farver for hver gruppe
  chrome.storage.sync.get("courseGroupColors", (data) => {
    let groupColors = data.courseGroupColors || {};
    let hasNewColors = false;

    // Find alle unikke grupper og tildel farver
    document.querySelectorAll(".s2skemabrik").forEach((element) => {
      const courseElements = element.querySelectorAll(
        '[data-lectiocontextcard^="HE"]'
      );

      courseElements.forEach((course) => {
        const courseName = course.textContent.trim();
        const subjectMatch = courseName.match(/\b([A-Za-z]{2,3})$/);

        if (subjectMatch) {
          const subject = subjectMatch[1].toUpperCase();

          // Hvis gruppen ikke har en farve, generer en ny
          if (!groupColors[subject]) {
            const backgroundColor = generateRandomColor();
            const borderColor = generateBorderColor(backgroundColor);
            groupColors[subject] = {
              background: backgroundColor,
              border: borderColor,
            };
            hasNewColors = true;
          }

          // Anvend farver på skemabrikken
          element.style.backgroundColor = groupColors[subject].background;
          element.style.borderLeft = `4px solid ${groupColors[subject].border}`;
        }
      });
    });

    // Gem nye farver hvis der blev genereret nogen
    if (hasNewColors) {
      chrome.storage.sync.set({ courseGroupColors: groupColors });
    }
  });
}

// Tilføj message listener for farve-opdateringer
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "updateCourses") {
    saveCourses();
    applyGroupColors(); // Generer nye farver ved opdatering
    sendResponse({ success: true });
  }
  if (request.action === "updateColors") {
    // Opdater farverne med de nye værdier
    const elements = document.querySelectorAll(".s2skemabrik");
    elements.forEach((element) => {
      const courseElements = element.querySelectorAll(
        '[data-lectiocontextcard^="HE"]'
      );
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
});

// Tilføj denne funktion til enhanceSchedulePage
function setupInfoRows() {
  const infoRows = document.querySelectorAll("tr:has(.s2infoHeader)");

  infoRows.forEach((row, index) => {
    const headerRow = row.previousElementSibling;
    if (!headerRow) return;

    const rowId = `info-row-${index}`;
    row.dataset.infoRowId = rowId;

    // Skjul hele rækken som standard
    row.style.display = "none";

    const wasExpanded = localStorage.getItem(rowId) === "true";
    if (wasExpanded) {
      row.style.display = "table-row";
    }

    const toggleBtn = document.createElement("button");
    toggleBtn.className = `info-toggle-btn ${wasExpanded ? "expanded" : ""}`;
    toggleBtn.innerHTML = wasExpanded ? "" : "";

    const firstCell = headerRow.querySelector("td");
    if (firstCell) {
      firstCell.style.position = "relative";
      firstCell.appendChild(toggleBtn);
    }

    toggleBtn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();

      const isExpanding = !toggleBtn.classList.contains("expanded");

      // Vis/skjul hele rækken
      row.style.display = isExpanding ? "table-row" : "none";

      toggleBtn.classList.toggle("expanded");
      toggleBtn.innerHTML = isExpanding ? "" : "";

      localStorage.setItem(rowId, isExpanding);

      return false;
    });
  });
}
