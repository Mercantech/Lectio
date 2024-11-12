function createEnhancerButton() {
  // Opret knappen
  const button = document.createElement("button");
  button.innerHTML = "Lectio Enhancer";
  button.id = "lectio-enhancer-btn";

  // Tilføj styling til knappen
  button.style.position = "fixed";
  button.style.bottom = "20px";
  button.style.right = "20px";
  button.style.zIndex = "9999";

  // Tilføj click event
  button.addEventListener("click", () => {
    console.log("Lectio Enhancer blev klikket!");
    console.log("Nuværende side:", window.location.href);
  });

  // Tilføj knappen til siden
  document.body.appendChild(button);
}

// Hovedfunktion der køres når siden indlæses
function enhanceLectio() {
  // Tilføj bedre styling til siden
  document.body.classList.add("lectio-enhanced");

  // Tilføj vores nye knap
  createEnhancerButton();

  // Eksempel på forbedring: Gør tabeller mere læsbare
  const tables = document.getElementsByTagName("table");
  for (let table of tables) {
    table.classList.add("enhanced-table");
  }
}

// Start forbedringerne når siden er indlæst
document.addEventListener("DOMContentLoaded", enhanceLectio);
