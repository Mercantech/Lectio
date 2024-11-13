document.addEventListener("DOMContentLoaded", () => {
  displayCourses();

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

  document.querySelector(".courses-container").appendChild(refreshBtn);
});

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
