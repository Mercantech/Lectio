window.LectioEnhancer = window.LectioEnhancer || {};


window.LectioEnhancer.applyGroupColors = function() {
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
            const backgroundColor = LectioEnhancer.generateRandomColor();
            const borderColor = LectioEnhancer.generateBorderColor(backgroundColor);
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
}; 