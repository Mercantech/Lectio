document.addEventListener("DOMContentLoaded", () => {
  displayCourses();
  setupMenu();
  setupCategoryControls();
  setupAuth();
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
  const groupColors = await new Promise((resolve) => {
    chrome.storage.sync.get("courseGroupColors", (data) => {
      resolve(data.courseGroupColors || {});
    });
  });

  // Vis alle kategorier, selv dem der er tomme
  const subjects = Object.keys(courses).sort();
  const colorSubjects = Object.keys(groupColors).sort();
  const allSubjects = [...new Set([...subjects, ...colorSubjects])];

  allSubjects.forEach((subject) => {
    const groupDiv = document.createElement("div");
    groupDiv.className = "course-group";
    groupDiv.dataset.subject = subject;

    const subjectHeader = document.createElement("h4");
    const subjectTitle = document.createElement("span");
    subjectTitle.textContent = `${subject} Kurser`;

    const courseCount = document.createElement("span");
    courseCount.className = "course-count";
    courseCount.textContent = `(${courses[subject]?.length || 0})`;

    subjectHeader.appendChild(subjectTitle);
    subjectHeader.appendChild(courseCount);
    groupDiv.appendChild(subjectHeader);

    const courseList = document.createElement("ul");
    if (courses[subject]) {
      courses[subject].forEach((course) => {
        const li = document.createElement("li");
        li.className = "course-item";
        li.textContent = course;
        li.draggable = true;

        // Tilføj drag events
        li.addEventListener("dragstart", (e) => {
          li.classList.add("dragging");
          e.dataTransfer.setData(
            "text/plain",
            JSON.stringify({
              course: course,
              fromSubject: subject,
            })
          );
        });

        li.addEventListener("dragend", () => {
          li.classList.remove("dragging");
        });

        courseList.appendChild(li);
      });
    }

    groupDiv.appendChild(courseList);

    // Tilføj drop events til gruppen
    groupDiv.addEventListener("dragover", (e) => {
      e.preventDefault();
      groupDiv.classList.add("drag-over");
    });

    groupDiv.addEventListener("dragleave", () => {
      groupDiv.classList.remove("drag-over");
    });

    groupDiv.addEventListener("drop", async (e) => {
      e.preventDefault();
      groupDiv.classList.remove("drag-over");

      const data = JSON.parse(e.dataTransfer.getData("text/plain"));
      const targetSubject = groupDiv.dataset.subject;

      if (data.fromSubject !== targetSubject) {
        // Opdater kursuslisten
        const updatedCourses = { ...courses };

        // Hent de nuværende farver
        chrome.storage.sync.get("courseGroupColors", async (colorData) => {
          const groupColors = colorData.courseGroupColors || {};

          // Fjern kurset fra den gamle kategori
          updatedCourses[data.fromSubject] = updatedCourses[
            data.fromSubject
          ].filter((c) => c !== data.course);

          // Hvis den gamle kategori er tom, fjern den og dens farver
          if (updatedCourses[data.fromSubject].length === 0) {
            delete updatedCourses[data.fromSubject];
            delete groupColors[data.fromSubject];
          }

          // Tilføj til ny kategori
          if (!updatedCourses[targetSubject]) {
            updatedCourses[targetSubject] = [];
            // Generer ny farve for ny kategori hvis den ikke findes
            if (!groupColors[targetSubject]) {
              const backgroundColor = generateRandomColor();
              const borderColor = generateBorderColor(backgroundColor);
              groupColors[targetSubject] = {
                background: backgroundColor,
                border: borderColor,
              };
            }
          }
          updatedCourses[targetSubject].push(data.course);

          // Gem både kurser og farver
          await Promise.all([
            saveCourseList(updatedCourses),
            new Promise((resolve) => {
              chrome.storage.sync.set(
                { courseGroupColors: groupColors },
                resolve
              );
            }),
          ]);

          // Opdater farver på Lectio siden
          chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            chrome.tabs.sendMessage(tabs[0].id, {
              action: "updateColors",
              colors: groupColors,
            });
          });

          // Opdater popup visningen
          displayCourses();
        });
      }
    });

    coursesList.appendChild(groupDiv);
  });
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

      const colorPicker = document.createElement("input");
      colorPicker.type = "color";
      colorPicker.className = "color-preview-picker";
      const currentColor =
        groupColors[subject]?.background || generateRandomColor();
      let hexColor = currentColor;

      if (currentColor.startsWith("hsl")) {
        const { h, s, l } = parseHSL(currentColor);
        hexColor = hslToHex(h, s, l);
      }

      colorPicker.value = hexColor;
      colorPicker.dataset.subject = subject;

      const randomButton = document.createElement("button");
      randomButton.textContent = "🎲";
      randomButton.className = "random-color-btn";
      randomButton.title = "Generer tilfældig farve";

      randomButton.addEventListener("click", () => {
        const newColor = generateRandomColor();
        const newHex = hslToHex(...Object.values(parseHSL(newColor)));
        colorPicker.value = newHex;
      });

      colorGroup.appendChild(label);
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

function setupCategoryControls() {
  const input = document.getElementById("newCategoryInput");
  const addBtn = document.getElementById("addCategoryBtn");

  addBtn.addEventListener("click", async () => {
    const categoryName = input.value.trim().toUpperCase();
    if (categoryName) {
      const courses = await loadCourseList();

      // Tjek om kategorien allerede eksisterer
      if (courses[categoryName]) {
        alert("Denne kategori findes allerede");
        return;
      }

      // Tilføj ny tom kategori
      const updatedCourses = {
        ...courses,
        [categoryName]: [],
      };

      // Gem opdaterede kurser
      await saveCourseList(updatedCourses);

      // Generer farve til den nye kategori
      chrome.storage.sync.get("courseGroupColors", (data) => {
        const groupColors = data.courseGroupColors || {};
        const backgroundColor = generateRandomColor();
        const borderColor = generateBorderColor(backgroundColor);

        groupColors[categoryName] = {
          background: backgroundColor,
          border: borderColor,
        };

        chrome.storage.sync.set({ courseGroupColors: groupColors }, () => {
          // Opdater visningen
          displayCourses();
          input.value = "";
        });
      });
    }
  });
}

async function setupAuth() {
  const userArea = document.getElementById("userArea");
  const signupBtn = document.getElementById("oneClickSignup");
  const loginBtn = document.getElementById("simpleLogin");
  const logoutBtn = document.getElementById("logoutBtn");

  // Tjek login status
  chrome.storage.sync.get(["authToken", "currentUser"], (data) => {
    if (data.authToken && data.currentUser) {
      document.getElementById("logoutBtn").classList.remove("hidden");
      userArea.classList.add("hidden"); // Skjul hele userArea
    } else {
      document.getElementById("logoutBtn").classList.add("hidden");
      userArea.classList.remove("hidden"); // Vis userArea
    }
  });

  // Setup login
  loginBtn?.addEventListener("click", async () => {
    try {
      if (!loginBtn) return;
      loginBtn.classList.add("loading");

      const tabs = await chrome.tabs.query({
        active: true,
        currentWindow: true,
      });
      const userInfo = await chrome.tabs.sendMessage(tabs[0].id, {
        action: "getUserInfo",
      });

      if (!userInfo) {
        loginBtn?.classList.remove("loading");
        return;
      }

      const response = await fetch(
        "https://lectio-api.onrender.com/api/Users/simple-login",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: userInfo.name,
            schoolId: userInfo.schoolId,
          }),
        }
      );

      if (response.ok) {
        const data = await response.json();
        chrome.storage.sync.set({
          authToken: data.token,
          currentUser: {
            name: data.name,
            id: data.id,
            schoolId: userInfo.schoolId,
          },
        });
        document.getElementById("logoutBtn").classList.remove("hidden");
        userArea.classList.add("hidden"); // Skjul userArea efter login
      }
    } catch (error) {
      console.error("Login fejl:", error);
    } finally {
      loginBtn?.classList.remove("loading");
    }
  });

  // Setup logout
  logoutBtn?.addEventListener("click", () => {
    chrome.storage.sync.remove(["authToken", "currentUser"], () => {
      document.getElementById("logoutBtn").classList.add("hidden");
      userArea.classList.remove("hidden"); // Vis userArea efter logout
    });
  });
}

function updateUserDisplay(username) {
  const userDisplay = document.createElement("div");
  userDisplay.className = "user-info";
  userDisplay.innerHTML = `
    <span class="user-icon">👤</span>
    <span class="username">${username}</span>
  `;

  document.querySelector(".header")?.appendChild(userDisplay);
}
