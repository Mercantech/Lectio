window.LectioEnhancer = window.LectioEnhancer || {};

window.LectioEnhancer.updateLeaderboard = async function(container) {
  container.innerHTML = `
    <div class="leaderboard-loading">
      <div class="spinner"></div>
      <p>Indlæser rangliste...</p>
    </div>
  `;

  try {
    const storage = await chrome.storage.sync.get(["currentUser"]);
    const currentUser = storage.currentUser;
    const isGlobalView = localStorage.getItem("leaderboardView") !== "school";

    const endpoint = isGlobalView
      ? "https://lectioapi.mercantec.tech/api/Leaderboard/Top10"
      : `https://lectioapi.mercantec.tech/api/Leaderboard/school/${currentUser.schoolId}`;

    const response = await fetch(endpoint);
    const data = await response.json();

    let html = `
      <div class="leaderboard-section">
        <div class="leaderboard-header">
          <h4>🏆 ${isGlobalView ? "Global Top 10" : "Skole Top 10"}</h4>
          <button class="toggle-view-btn" id="toggleLeaderboardView">
            ${isGlobalView ? "🏫 Vis skolens" : "🌍 Vis global"}
          </button>
        </div>
        <table>
    `;

    data.forEach((item) => {
      const medal = item.position === 1 ? "🥇" : item.position === 2 ? "🥈" : item.position === 3 ? "🥉" : "";
      const isCurrentUser = currentUser && item.userName === currentUser.name;
      const rowClass = isCurrentUser ? "current-user-row" : "";

      html += `
        <tr class="${rowClass}">
          <td>${medal} #${item.position}</td>
          <td>${item.userName}</td>
          <td>${item.totalPoints} pts</td>
        </tr>
      `;
    });

    html += "</table></div>";
    container.innerHTML = html;

    const toggleBtn = container.querySelector("#toggleLeaderboardView");
    if (toggleBtn) {
      toggleBtn.addEventListener("click", async () => {
        const newView = isGlobalView ? "school" : "global";
        localStorage.setItem("leaderboardView", newView);
        LectioEnhancer.updateLeaderboard(container);
      });
    }
  } catch (error) {
    console.error("Leaderboard fejl:", error);
    container.innerHTML = `
      <p>Kunne ikke indlæse ranglisten for skolen.</p>
      <button class="switch-view-btn" id="switchToGlobalView">Vis global rangliste</button>
    `;

    const switchButton = container.querySelector("#switchToGlobalView");
    if (switchButton) {
      switchButton.addEventListener("click", () => {
        localStorage.setItem("leaderboardView", "global");
        LectioEnhancer.updateLeaderboard(container);
      });
    }
  }
}; 