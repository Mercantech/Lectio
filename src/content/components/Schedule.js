import {
  saveCourses,
  applyGroupColors,
  applyClassColors,
} from "../utils/courses.js";

export function enhanceSchedulePage() {
  if (window.location.href.includes("SkemaNy.aspx")) {
    const scheduleContainer = document.querySelector(".ls-content-container");
    if (scheduleContainer) {
      saveCourses();
      scheduleContainer.classList.add("enhanced-schedule");
      applyGroupColors();
    }

    const tables = document.querySelectorAll("table");
    tables.forEach((table) => {
      table.classList.add("enhanced-table");
    });

    const headers = document.querySelectorAll(".ls-master-header");
    headers.forEach((header) => {
      header.classList.add("enhanced-header");
    });

    applyClassColors();
  }
}
