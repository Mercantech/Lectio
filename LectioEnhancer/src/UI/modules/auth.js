export async function setupAuth() {
    const userArea = document.getElementById("userArea");
    const signupBtn = document.getElementById("oneClickSignup");
    const loginBtn = document.getElementById("simpleLogin");
    const logoutBtn = document.getElementById("logoutBtn");

    // Tjek login status
    chrome.storage.sync.get(["authToken", "currentUser"], (data) => {
        if (data.authToken && data.currentUser) {
            document.getElementById("logoutBtn").classList.remove("hidden");
            userArea.classList.add("hidden"); 
        } else {
            document.getElementById("logoutBtn").classList.add("hidden");
            userArea.classList.remove("hidden"); 
        }
    });

    // Setup login
    loginBtn?.addEventListener("click", async () => {
        try {
            if (!loginBtn) return;
            loginBtn.classList.add("loading");

            const tabs = await chrome.tabs.query({
                active: true,
                currentWindow: true,
            });
            const userInfo = await chrome.tabs.sendMessage(tabs[0].id, {
                action: "getUserInfo",
            });

            if (!userInfo) {
                loginBtn?.classList.remove("loading");
                return;
            }

            const response = await fetch(
                "https://lectio-api.onrender.com/api/Users/simple-login",
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        name: userInfo.name,
                        schoolId: userInfo.schoolId,
                    }),
                }
            );

            if (response.ok) {
                const data = await response.json();
                chrome.storage.sync.set({
                    authToken: data.token,
                    currentUser: {
                        name: data.name,
                        id: data.id,
                        schoolId: userInfo.schoolId,
                    },
                });
                document.getElementById("logoutBtn").classList.remove("hidden");
                userArea.classList.add("hidden");
            }
        } catch (error) {
            console.error("Login fejl:", error);
        } finally {
            loginBtn?.classList.remove("loading");
        }
    });

    // Setup logout
    logoutBtn?.addEventListener("click", () => {
        chrome.storage.sync.remove(["authToken", "currentUser"], () => {
            document.getElementById("logoutBtn").classList.add("hidden");
            userArea.classList.remove("hidden");
        });
    });

    // Setup signup
    signupBtn?.addEventListener("click", async () => {
        try {
            if (!signupBtn) return;
            signupBtn.classList.add("loading");

            const tabs = await chrome.tabs.query({
                active: true,
                currentWindow: true,
            });
            const userInfo = await chrome.tabs.sendMessage(tabs[0].id, {
                action: "getUserInfo",
            });

            if (!userInfo) {
                signupBtn?.classList.remove("loading");
                return;
            }

            const response = await fetch(
                "https://lectio-api.onrender.com/api/Users/simple",
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        name: userInfo.name,
                        schoolId: userInfo.schoolId,
                    }),
                }
            );

            if (response.ok) {
                const data = await response.json();
                chrome.storage.sync.set({
                    authToken: data.token,
                    currentUser: {
                        name: data.name,
                        id: data.id,
                        schoolId: userInfo.schoolId,
                    },
                });
                document.getElementById("logoutBtn").classList.remove("hidden");
                userArea.classList.add("hidden");
            }
        } catch (error) {
            console.error("Signup fejl:", error);
        } finally {
            signupBtn?.classList.remove("loading");
        }
    });
}

export function updateUserDisplay(username) {
    const userDisplay = document.createElement("div");
    userDisplay.className = "user-info";
    userDisplay.innerHTML = `
        <span class="user-icon">👤</span>
        <span class="username">${username}</span>
    `;

    document.querySelector(".header")?.appendChild(userDisplay);
} 