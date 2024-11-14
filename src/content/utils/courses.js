import { generateRandomColor, generateBorderColor } from "./colors.js";

export function saveCourses() {
  const courseGroups = {};
  const elements = document.querySelectorAll(".s2skemabrik");

  elements.forEach((element) => {
    const courseElements = element.querySelectorAll(
      '[data-lectiocontextcard^="HE"]'
    );
    courseElements.forEach((course) => {
      const courseName = course.textContent.trim();
      const subjectMatch = courseName.match(/\b([A-Za-z]{2,3})$/);

      if (subjectMatch) {
        const subject = subjectMatch[1].toUpperCase();
        if (!courseGroups[subject]) {
          courseGroups[subject] = new Set();
        }
        courseGroups[subject].add(courseName);
      }
    });
  });

  const groupedCourses = Object.fromEntries(
    Object.entries(courseGroups).map(([subject, courses]) => [
      subject,
      Array.from(courses),
    ])
  );

  chrome.storage.sync.set({ lectioEnhancerCourses: groupedCourses });
}

export function applyGroupColors() {
  chrome.storage.sync.get("courseGroupColors", (data) => {
    let groupColors = data.courseGroupColors || {};
    let hasNewColors = false;

    document.querySelectorAll(".s2skemabrik").forEach((element) => {
      const courseElements = element.querySelectorAll(
        '[data-lectiocontextcard^="HE"]'
      );
      courseElements.forEach((course) => {
        const courseName = course.textContent.trim();
        const subjectMatch = courseName.match(/\b([A-Za-z]{2,3})$/);

        if (subjectMatch) {
          const subject = subjectMatch[1].toUpperCase();
          if (!groupColors[subject]) {
            const backgroundColor = generateRandomColor();
            const borderColor = generateBorderColor(backgroundColor);
            groupColors[subject] = {
              background: backgroundColor,
              border: borderColor,
            };
            hasNewColors = true;
          }
          element.style.backgroundColor = groupColors[subject].background;
          element.style.borderLeft = `4px solid ${groupColors[subject].border}`;
        }
      });
    });

    if (hasNewColors) {
      chrome.storage.sync.set({ courseGroupColors: groupColors });
    }
  });
}

export function applyClassColors() {
  const elements = document.querySelectorAll(".s2skemabrik");
  elements.forEach((element) => {
    const text = element.textContent.toLowerCase();
    if (text.includes("dt3h")) {
      element.classList.add("class-dt3h");
    } else if (text.includes("dteux3h")) {
      element.classList.add("class-dteux3h");
    } else if (text.includes("dt2h")) {
      element.classList.add("class-dt2h");
    } else if (text.includes("dt1h")) {
      element.classList.add("class-dt1h");
    }
  });
}
