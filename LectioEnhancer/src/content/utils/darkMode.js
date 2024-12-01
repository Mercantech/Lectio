window.LectioEnhancer = window.LectioEnhancer || {};

window.LectioEnhancer.toggleDarkMode = function() {
  document.body.classList.toggle("dark-mode");
  const isDarkMode = document.body.classList.contains("dark-mode");
  localStorage.setItem("lectioEnhancerDarkMode", isDarkMode);
};

window.LectioEnhancer.initDarkMode = function() {
  const savedDarkMode = localStorage.getItem("lectioEnhancerDarkMode");
  if (savedDarkMode === "true") {
    document.body.classList.add("dark-mode");
  }
}; 