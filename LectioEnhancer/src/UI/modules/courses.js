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

export function setupCategoryControls() {
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

// Tilføj import af nødvendige funktioner
import { generateRandomColor } from './colors.js';

function generateBorderColor(backgroundColor) {
    return adjustColor(backgroundColor, -20);
}

import { adjustColor } from './colors.js';
 