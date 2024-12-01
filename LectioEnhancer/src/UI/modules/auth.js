export async function setupAuth() {
    const userArea = document.getElementById("userArea");
    
    // Tjek login status og opret/log ind automatisk hvis ikke logget ind
    chrome.storage.sync.get(["authToken", "currentUser"], async (data) => {
        if (data.authToken && data.currentUser) {
            // Bruger er allerede logget ind
            userArea.innerHTML = `<div class="auth-status">Logget ind som: ${data.currentUser.name}</div>`;
        } else {
            // Vis "ikke logget ind" besked
            userArea.innerHTML = `<div class="auth-status">Bruger ikke logget ind</div>`;
            
            // Bruger er ikke logget ind - forsøg automatisk login
            try {
                const tabs = await chrome.tabs.query({
                    active: true,
                    currentWindow: true,
                });
                
                const userInfo = await chrome.tabs.sendMessage(tabs[0].id, {
                    action: "getUserInfo",
                });

                if (!userInfo) return;

                // Forsøg at logge ind først
                const loginResponse = await fetch(
                    "https://lectioapi.mercantec.tech/api/Users/simple-login",
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

                // Hvis login fejler, opret ny bruger
                if (!loginResponse.ok) {
                    const signupResponse = await fetch(
                        "https://lectioapi.mercantec.tech/api/Users/simple",
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

                    if (signupResponse.ok) {
                        const data = await signupResponse.json();
                        await handleSuccessfulAuth(data, userInfo);
                    }
                } else {
                    const data = await loginResponse.json();
                    await handleSuccessfulAuth(data, userInfo);
                }
            } catch (error) {
                console.error("Auth fejl:", error);
            }
        }
    });
}

// Hjælpefunktion til at håndtere vellykket auth
async function handleSuccessfulAuth(data, userInfo) {
    await chrome.storage.sync.set({
        authToken: data.token,
        currentUser: {
            name: data.name,
            id: data.id,
            schoolId: userInfo.schoolId,
        },
    });
    document.getElementById("userArea").innerHTML = `<div class="auth-status">Logget ind som: ${data.name}</div>`;
}

// Beholder updateUserDisplay funktionen
export function updateUserDisplay(username) {
    const userDisplay = document.createElement("div");
    userDisplay.className = "user-info";
    userDisplay.innerHTML = `
        <span class="user-icon">👤</span>
        <span class="username">${username}</span>
    `;

    document.querySelector(".header")?.appendChild(userDisplay);
} 