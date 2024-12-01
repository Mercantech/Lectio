window.LectioEnhancer = window.LectioEnhancer || {};

window.LectioEnhancer.saveCourses = function() {
  const holdElements = document.querySelectorAll('.linklist-horizontal li a');
  const courses = {};

  holdElements.forEach(hold => {
    const courseName = hold.textContent.trim();
    courses[courseName] = [courseName];
  });

  // Gem kurserne
  chrome.storage.sync.set({
    lectioEnhancerCourses: courses,
    lastUpdated: new Date().toISOString()
  });

  return courses;
}; 