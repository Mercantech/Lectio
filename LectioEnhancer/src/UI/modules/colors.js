export function generateRandomColor() {
    const colors = [
        "216, 43%, 84%", 
        "101, 43%, 84%",
        "341, 64%, 82%",
        "31, 100%, 81%",
        "197, 100%, 87%",
        "207, 33%, 60%",
        "136, 42%, 85%",
        "189, 27%, 60%",
        "0, 100%, 75%",
        "0, 50%, 66%",
        "0, 100%, 77%",
        "149, 40%, 70%",
        "29, 34%, 58%",
        "28, 58%, 68%",
        "195, 22%, 75%",
        "58, 75%, 77%",
        "359, 68%, 79%",
        "300, 26%, 61%",
        "192, 72%, 70%",
        "141, 69%, 78%",
        "61, 76%, 86%",
        "0, 64%, 90%",
        "165, 52%, 66%",
        "336, 100%, 78%",
        "336, 100%, 87%",
        "123, 46%, 77%",
        "84, 21%, 63%",
        "201, 67%, 89%",
        "97, 26%, 80%",
        "82, 16%, 59%",
        "168, 52%, 71%",
        "195, 22%, 75%",
        "190, 30%, 80%",
    ];

    const random = Math.floor(Math.random() * colors.length);
    const hue = colors[random];
    return `hsl(${hue})`;
}

export async function displayColorPickers() {
    const groupColorsList = document.getElementById("groupColorsList");
    groupColorsList.innerHTML = "<h3>Fagfarver</h3>";

    const courses = await loadCourseList();
    const courseNames = Object.keys(courses).sort();

    chrome.storage.sync.get("courseGroupColors", (data) => {
        const groupColors = data.courseGroupColors || {};

        courseNames.forEach((courseName) => {
            const colorGroup = document.createElement("div");
            colorGroup.className = "color-group";

            const label = document.createElement("label");
            label.textContent = courseName;

            const colorPicker = document.createElement("input");
            colorPicker.type = "color";
            colorPicker.className = "color-preview-picker";
            const currentColor = groupColors[courseName]?.background || generateRandomColor();
            let hexColor = currentColor;

            if (currentColor.startsWith("hsl")) {
                const { h, s, l } = parseHSL(currentColor);
                hexColor = hslToHex(h, s, l);
            }

            colorPicker.value = hexColor;
            colorPicker.dataset.course = courseName;

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

export function saveColorChoices() {
    const colorPickers = document.querySelectorAll('#groupColorsList input[type="color"]');
    const newColors = {};

    colorPickers.forEach((picker) => {
        const courseName = picker.dataset.course;
        const hexColor = picker.value;
        const backgroundColor = hexColor;
        const borderColor = adjustColor(backgroundColor, -20);

        newColors[courseName] = {
            background: backgroundColor,
            border: borderColor,
        };
    });

    chrome.storage.sync.set({ courseGroupColors: newColors }, () => {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            chrome.tabs.sendMessage(tabs[0].id, {
                action: "updateColors",
                colors: newColors,
            }, () => {
                displayColorPickers();
            });
        });
    });
}

export function adjustColor(color, amount) {
    const hex = color.replace("#", "");
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);

    const darkerR = Math.max(0, r + amount);
    const darkerG = Math.max(0, g + amount);
    const darkerB = Math.max(0, b + amount);

    return `#${darkerR.toString(16).padStart(2, "0")}${darkerG.toString(16).padStart(2, "0")}${darkerB.toString(16).padStart(2, "0")}`;
}

// Tilføj import af nødvendige funktioner
import { parseHSL, hslToHex } from './utils.js';
import { loadCourseList } from './courses.js';