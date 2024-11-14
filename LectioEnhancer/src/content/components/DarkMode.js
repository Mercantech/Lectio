export function setupDarkMode() {
  const savedDarkMode = localStorage.getItem("lectioEnhancerDarkMode");
  if (savedDarkMode === "true") {
    document.body.classList.add("dark-mode");
  }
  createEnhancerButton();
}

function toggleDarkMode() {
  document.body.classList.toggle("dark-mode");
  const isDarkMode = document.body.classList.contains("dark-mode");
  localStorage.setItem("lectioEnhancerDarkMode", isDarkMode);
}

function createEnhancerButton() {
  const button = document.createElement("button");
  button.id = "lectio-enhancer-btn";
  const isDarkMode = document.body.classList.contains("dark-mode");
  button.innerHTML = isDarkMode ? "Light Mode" : "Dark Mode";

  button.style.position = "fixed";
  button.style.bottom = "20px";
  button.style.right = "20px";
  button.style.zIndex = "9999";

  button.addEventListener("click", () => {
    toggleDarkMode();
    button.innerHTML = document.body.classList.contains("dark-mode")
      ? "Light Mode"
      : "Dark Mode";
  });

  document.body.appendChild(button);
}
