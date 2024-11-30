window.LectioEnhancer = window.LectioEnhancer || {};

window.LectioEnhancer.setupInfoRows = function() {
  const infoRows = document.querySelectorAll("tr:has(.s2infoHeader)");

  infoRows.forEach((row, index) => {
    const headerRow = row.previousElementSibling;
    if (!headerRow) return;

    const rowId = `info-row-${index}`;
    row.dataset.infoRowId = rowId;

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
      row.style.display = isExpanding ? "table-row" : "none";
      toggleBtn.classList.toggle("expanded");
      toggleBtn.innerHTML = isExpanding ? "" : "";
      localStorage.setItem(rowId, isExpanding);

      return false;
    });
  });
};

window.LectioEnhancer.enhanceSchedulePage = function() {
  if (window.location.href.includes("SkemaNy.aspx")) {
    const scheduleContainer = document.querySelector(".ls-content-container");
    if (scheduleContainer) {
      LectioEnhancer.saveCourses();
      scheduleContainer.classList.add("enhanced-schedule");
      LectioEnhancer.applyGroupColors();
      LectioEnhancer.setupInfoRows();
    }

    const tables = document.querySelectorAll("table");
    tables.forEach((table) => {
      table.classList.add("enhanced-table");
    });

    const headers = document.querySelectorAll(".ls-master-header");
    headers.forEach((header) => {
      header.classList.add("enhanced-header");
    });
  }
}; 