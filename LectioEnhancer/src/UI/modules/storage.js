export function displayStorageData() {
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
    document.getElementById("clearStorage")?.addEventListener("click", () => {
        if (confirm("Er du sikker på at du vil rydde al gemt data?")) {
            chrome.storage.sync.clear(() => {
                displayStorageData();
            });
        }
    });
}

// Hjælpefunktioner til at gemme og hente data fra storage
export function saveToStorage(key, value) {
    return new Promise((resolve) => {
        chrome.storage.sync.set({ [key]: value }, resolve);
    });
}

export function getFromStorage(key) {
    return new Promise((resolve) => {
        chrome.storage.sync.get(key, (data) => {
            resolve(data[key]);
        });
    });
}

export function clearStorage() {
    return new Promise((resolve) => {
        chrome.storage.sync.clear(resolve);
    });
}

// Funktion til at hente al data fra storage
export function getAllStorageData() {
    return new Promise((resolve) => {
        chrome.storage.sync.get(null, resolve);
    });
}

