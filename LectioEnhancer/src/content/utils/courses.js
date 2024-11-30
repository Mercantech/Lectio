window.LectioEnhancer = window.LectioEnhancer || {};

window.LectioEnhancer.saveCourses = function() {
  chrome.storage.sync.get("lectioEnhancerCourses", (data) => {
    const existingCourses = data.lectioEnhancerCourses || {};
    const courseGroups = {
      ...existingCourses,
      ANDRE: new Set(existingCourses.ANDRE || []),
    };

    const courseExistsAnywhere = (courseName) => {
      return Object.values(existingCourses).some((courses) =>
        courses.includes(courseName)
      );
    };

    const elements = document.querySelectorAll(".s2skemabrik");

    elements.forEach((element) => {
      const courseElements = element.querySelectorAll(
        '[data-lectiocontextcard^="HE"]'
      );

      courseElements.forEach((course) => {
        const courseName = course.textContent.trim();

        if (courseExistsAnywhere(courseName)) {
          return;
        }

        const subjectMatch = courseName.match(/\b([A-Za-z]{2,3})$/);

        if (subjectMatch) {
          const subject = subjectMatch[1].toUpperCase();
          if (!courseGroups[subject]) {
            courseGroups[subject] = new Set();
          }
          courseGroups[subject].add(courseName);
        } else {
          courseGroups.ANDRE.add(courseName);
        }
      });
    });

    const groupedCourses = Object.fromEntries(
      Object.entries(courseGroups).map(([subject, courses]) => [
        subject,
        Array.from(courses),
      ])
    );

    if (groupedCourses.ANDRE?.length === 0) {
      delete groupedCourses.ANDRE;
    }

    chrome.storage.sync.set({
      lectioEnhancerCourses: groupedCourses,
      lastUpdated: new Date().toISOString(),
    });
  });
}; 