import { setupAuth } from './modules/auth.js';
import { displayColorPickers } from './modules/colors.js';
import { displayCourses } from './modules/courses.js';
import { displayStorageData } from './modules/storage.js';

document.addEventListener("DOMContentLoaded", () => {
    displayCourses();
    setupMenu();
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
