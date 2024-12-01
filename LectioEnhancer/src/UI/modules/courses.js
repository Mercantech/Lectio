export async function displayCourses() {
    const coursesList = document.getElementById("coursesList");
    if (!coursesList) return;

    coursesList.innerHTML = "";

    const courses = await loadCourseList();
    const groupColors = await new Promise((resolve) => {
        chrome.storage.sync.get("courseGroupColors", (data) => {
            resolve(data.courseGroupColors || {});
        });
    });

    const courseNames = Object.keys(courses).sort();

    courseNames.forEach((courseName) => {
        const li = document.createElement("li");
        li.className = "course-item";
        
        const container = document.createElement("div");
        container.style.display = "flex";
        container.style.alignItems = "center";
        container.style.gap = "10px";
        
        const colorIndicator = document.createElement("div");
        colorIndicator.style.width = "20px";
        colorIndicator.style.height = "20px";
        colorIndicator.style.borderRadius = "4px";
        colorIndicator.style.backgroundColor = groupColors[courseName]?.background || "#ffffff";
        colorIndicator.style.border = "1px solid #ccc";
        
        const randomButton = document.createElement("button");
        randomButton.textContent = "🎲";
        randomButton.className = "random-color-btn";
        randomButton.title = "Generer tilfældig farve";
        randomButton.style.marginLeft = "auto";
        
        randomButton.addEventListener("click", () => {
            const newColor = generateRandomColor();
            colorIndicator.style.backgroundColor = newColor;
            
            const borderColor = adjustColor(newColor, -20);
            groupColors[courseName] = {
                background: newColor,
                border: borderColor,
            };
            
            chrome.storage.sync.set({ courseGroupColors: groupColors }, () => {
                chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                    chrome.tabs.sendMessage(tabs[0].id, {
                        action: "updateColors",
                    });
                });
            });
        });

        const text = document.createElement("span");
        text.textContent = courseName;
        
        container.appendChild(colorIndicator);
        container.appendChild(text);
        container.appendChild(randomButton);
        li.appendChild(container);
        coursesList.appendChild(li);
    });
}

export function saveCourseList(courses) {
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

export function loadCourseList() {
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

import { generateRandomColor } from './colors.js';
import { adjustColor } from './colors.js';
 