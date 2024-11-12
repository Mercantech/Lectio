function enhanceSchedulePage() {
  // Tjek om vi er på skema-siden
  if (window.location.href.includes("SkemaNy.aspx")) {
    // Find skema-relaterede elementer
    const scheduleContainer = document.querySelector(".ls-content-container");
    if (scheduleContainer) {
      scheduleContainer.classList.add("enhanced-schedule");
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
