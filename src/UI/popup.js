document.addEventListener("DOMContentLoaded", () => {
  displayCourses();
  setupMenu();
});

function setupMenu() {
  const menuButtons = document.querySelectorAll(".menu-item");
  const sections = {
    main: document.getElementById("mainSection"),
    colors: document.getElementById("colorSection"),
    settings: document.getElementById("settingsSection"),
    admin: document.getElementById("adminSection"),
  };

  // Tilføj opdateringsknap
  const refreshBtn = document.createElement("button");
  refreshBtn.textContent = "Opdater kursusliste";
  refreshBtn.className = "menu-item";
  refreshBtn.style.marginTop = "10px";

  refreshBtn.addEventListener("click", () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      chrome.tabs.sendMessage(tabs[0].id, { action: "updateCourses" }, () => {
        displayCourses();
      });
    });
  });

  document.querySelector(".courses-container")?.appendChild(refreshBtn);

  menuButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const targetSection = button.getAttribute("data-section");
      const targetElement = sections[targetSection];

      if (targetElement) {
        // Skjul alle sektioner
        Object.values(sections).forEach((section) => {
          if (section) section.classList.add("hidden");
        });

        // Fjern active class fra alle knapper
        menuButtons.forEach((btn) => btn.classList.remove("active"));

        // Aktiver den valgte sektion og knap
        button.classList.add("active");
        targetElement.classList.remove("hidden");

        // Hvis farve-sektionen er valgt, initialiser farve-vælgerne
        if (targetSection === "colors") {
          displayColorPickers();
        }

        if (targetSection === "admin") {
          displayStorageData();
        }
      }
    });
  });
}

function saveCourseList(courses) {
  return new Promise((resolve) => {
    chrome.storage.sync.set(
      {
        lectioEnhancerCourses: courses,
        lastUpdated: new Date().toISOString(),
      },
      () => {
        console.log("Kurser gemt med tidsstempel");
        resolve();
      }
    );
  });
}

function loadCourseList() {
  return new Promise((resolve) => {
    chrome.storage.sync.get(
      ["lectioEnhancerCourses", "lastUpdated"],
      (data) => {
        if (data.lectioEnhancerCourses) {
          console.log("Indlæste kurser fra:", data.lastUpdated);
          resolve(data.lectioEnhancerCourses);
        } else {
          resolve({});
        }
      }
    );
  });
}

async function displayCourses() {
  const coursesList = document.getElementById("coursesList");
  if (!coursesList) return;

  coursesList.innerHTML = "";

  const courses = await loadCourseList();

  if (Object.keys(courses).length > 0) {
    // Sorter fagene alfabetisk
    const subjects = Object.keys(courses).sort();

    subjects.forEach((subject) => {
      const groupDiv = document.createElement("div");
      groupDiv.className = "course-group";

      const subjectHeader = document.createElement("h4");
      subjectHeader.textContent = `${subject} Kurser`;

      // Tilføj tidsstempel hvis det findes
      if (courses.lastUpdated) {
        const timestamp = document.createElement("small");
        timestamp.style.fontSize = "10px";
        timestamp.style.color = "#666";
        timestamp.textContent = ` (Sidst opdateret: ${new Date(
          courses.lastUpdated
        ).toLocaleString("da-DK")})`;
        subjectHeader.appendChild(timestamp);
      }

      groupDiv.appendChild(subjectHeader);

      const courseList = document.createElement("ul");
      courses[subject].forEach((course) => {
        const li = document.createElement("li");
        li.textContent = course;
        courseList.appendChild(li);
      });

      groupDiv.appendChild(courseList);
      coursesList.appendChild(groupDiv);
    });
  } else {
    const li = document.createElement("li");
    li.textContent = "Ingen kurser fundet";
    li.style.fontStyle = "italic";
    coursesList.appendChild(li);
  }
}

async function displayColorPickers() {
  const groupColorsList = document.getElementById("groupColorsList");
  groupColorsList.innerHTML = "<h3>Fagfarver</h3>";

  const courses = await loadCourseList();
  const subjects = Object.keys(courses).sort();

  chrome.storage.sync.get("courseGroupColors", (data) => {
    const groupColors = data.courseGroupColors || {};

    subjects.forEach((subject) => {
      const colorGroup = document.createElement("div");
      colorGroup.className = "color-group";

      const label = document.createElement("label");
      label.textContent = `${subject} Kurser`;

      const colorPreview = document.createElement("div");
      colorPreview.className = "color-preview";

      const currentColor =
        groupColors[subject]?.background || generateRandomColor();
      let hexColor = currentColor;

      if (currentColor.startsWith("hsl")) {
        const { h, s, l } = parseHSL(currentColor);
        hexColor = hslToHex(h, s, l);
      }

      colorPreview.style.backgroundColor = currentColor;

      const colorPicker = document.createElement("input");
      colorPicker.type = "color";
      colorPicker.value = hexColor;
      colorPicker.dataset.subject = subject;

      const randomButton = document.createElement("button");
      randomButton.textContent = "🎲";
      randomButton.className = "random-color-btn";
      randomButton.title = "Generer tilfældig farve";

      randomButton.addEventListener("click", () => {
        const newColor = generateRandomColor();
        const newHex = hslToHex(...Object.values(parseHSL(newColor)));
        colorPreview.style.backgroundColor = newColor;
        colorPicker.value = newHex;
      });

      colorPicker.addEventListener("input", (e) => {
        colorPreview.style.backgroundColor = e.target.value;
      });

      colorGroup.appendChild(label);
      colorGroup.appendChild(colorPreview);
      colorGroup.appendChild(colorPicker);
      colorGroup.appendChild(randomButton);
      groupColorsList.appendChild(colorGroup);
    });
  });

  const saveButton = document.getElementById("saveColors");
  saveButton.addEventListener("click", saveColorChoices);
}

function saveColorChoices() {
  const colorPickers = document.querySelectorAll(
    '#groupColorsList input[type="color"]'
  );
  const newColors = {};

  colorPickers.forEach((picker) => {
    const subject = picker.dataset.subject;
    const hexColor = picker.value;
    // Behold den originale HSL farve hvis den findes
    const backgroundColor = picker.dataset.originalColor || hexColor;
    const borderColor = adjustColor(backgroundColor, -20);

    newColors[subject] = {
      background: backgroundColor,
      border: borderColor,
    };
  });

  chrome.storage.sync.set({ courseGroupColors: newColors }, () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      chrome.tabs.sendMessage(tabs[0].id, {
        action: "updateColors",
        colors: newColors,
      });
    });
  });
}

function adjustColor(color, amount) {
  // Konverter hex til RGB og juster lysstyrke
  const hex = color.replace("#", "");
  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);

  const darkerR = Math.max(0, r + amount);
  const darkerG = Math.max(0, g + amount);
  const darkerB = Math.max(0, b + amount);

  return `#${darkerR.toString(16).padStart(2, "0")}${darkerG
    .toString(16)
    .padStart(2, "0")}${darkerB.toString(16).padStart(2, "0")}`;
}

// Tilføj denne hjælpefunktion hvis du ikke allerede har den
function generateRandomColor() {
  const hue = Math.floor(Math.random() * 360);
  return `hsl(${hue}, 70%, 85%)`; // Returnerer en lys farve
}

// Tilføj disse hjælpefunktioner
function hslToHex(h, s, l) {
  l /= 100;
  const a = (s * Math.min(l, 1 - l)) / 100;
  const f = (n) => {
    const k = (n + h / 30) % 12;
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color)
      .toString(16)
      .padStart(2, "0");
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

function parseHSL(hslString) {
  const matches = hslString.match(/hsl\((\d+),\s*(\d+)%,\s*(\d+)%\)/);
  if (matches) {
    return {
      h: parseInt(matches[1]),
      s: parseInt(matches[2]),
      l: parseInt(matches[3]),
    };
  }
  return null;
}

function displayStorageData() {
  const storageList = document.getElementById("storageList");
  storageList.innerHTML = "";

  chrome.storage.sync.get(null, (data) => {
    // Vis courseGroupColors
    if (data.courseGroupColors) {
      const colorSection = document.createElement("div");
      colorSection.className = "storage-item";
      colorSection.innerHTML = "<h4>Fagfarver</h4>";

      const colorList = document.createElement("div");
      Object.entries(data.courseGroupColors).forEach(([subject, colors]) => {
        const colorItem = document.createElement("div");
        colorItem.style.marginBottom = "8px";

        const colorBox = document.createElement("span");
        colorBox.className = "color-preview-box";
        colorBox.style.backgroundColor = colors.background;
        colorBox.style.borderLeft = `4px solid ${colors.border}`;

        colorItem.appendChild(colorBox);
        colorItem.appendChild(
          document.createTextNode(
            `${subject}: ${colors.background} (border: ${colors.border})`
          )
        );
        colorList.appendChild(colorItem);
      });
      colorSection.appendChild(colorList);
      storageList.appendChild(colorSection);
    }

    // Vis kurser
    if (data.lectioEnhancerCourses) {
      const coursesSection = document.createElement("div");
      coursesSection.className = "storage-item";
      coursesSection.innerHTML = `
        <h4>Kurser (Sidst opdateret: ${new Date(
          data.lastUpdated
        ).toLocaleString("da-DK")})</h4>
        <pre>${JSON.stringify(data.lectioEnhancerCourses, null, 2)}</pre>
      `;
      storageList.appendChild(coursesSection);
    }
  });

  // Tilføj clear storage knap funktionalitet
  document.getElementById("clearStorage").addEventListener("click", () => {
    if (confirm("Er du sikker på at du vil rydde al gemt data?")) {
      chrome.storage.sync.clear(() => {
        displayStorageData();
      });
    }
  });
}
