// Funktion til at håndtere login
async function handleAuth(tab) {
    try {
        // Hent brugerinfo fra siden
        const response = await chrome.tabs.sendMessage(tab.id, {
            action: "getUserInfo"
        });

        if (!response) return;

        // Forsøg at logge ind
        const loginResponse = await fetch(
            "https://lectioapi.mercantec.tech/api/Users/simple-login",
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    name: response.name,
                    schoolId: response.schoolId,
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
                        name: response.name,
                        schoolId: response.schoolId,
                    }),
                }
            );

            if (signupResponse.ok) {
                const data = await signupResponse.json();
                await saveAuthData(data, response);
            }
        } else {
            const data = await loginResponse.json();
            await saveAuthData(data, response);
        }
    } catch (error) {
        console.error("Auth fejl:", error);
    }
}

// Gem auth data
async function saveAuthData(data, userInfo) {
    await chrome.storage.sync.set({
        authToken: data.token,
        currentUser: {
            name: data.name,
            id: data.id,
            schoolId: userInfo.schoolId,
        },
    });
}

// Lyt efter tab opdateringer
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    // Tjek om siden er færdig med at indlæse og er en Lectio side
    if (changeInfo.status === 'complete' && tab.url?.includes('lectio')) {
        chrome.storage.sync.get(["authToken"], async (data) => {
            // Hvis vi ikke har en token, forsøg login
            if (!data.authToken) {
                handleAuth(tab);
            }
        });
    }
});

// Lyt efter installation/opdatering af extension
chrome.runtime.onInstalled.addListener(() => {
    // Tjek alle åbne Lectio tabs
    chrome.tabs.query({url: "*://lectio.dk/*"}, (tabs) => {
        tabs.forEach(tab => {
            handleAuth(tab);
        });
    });
});

// Opret en alarm der kører hver 5. minut
chrome.alarms.create('checkMessages', { periodInMinutes: 5 });
console.log("Message check alarm created");

// Lyt efter alarm events
chrome.alarms.onAlarm.addListener((alarm) => {
+ console.log("Alarm triggered:", alarm.name);
  if (alarm.name === 'checkMessages') {
    checkForNewMessages();
  }
});

async function checkForNewMessages() {
  console.log("Checking for new messages...");
  try {
    // Hent brugerens login status og skole ID
    const tabs = await chrome.tabs.query({url: "*://lectio.dk/*"});
    console.log("Found Lectio tabs:", tabs.length);
    if (tabs.length === 0) {
      console.log("No Lectio tabs open, skipping message check");
      return;
    }

    // Hent brugerdata fra storage
    const userData = await chrome.storage.sync.get(['currentUser']);
    console.log("User data:", userData);
    if (!userData.currentUser?.schoolId) {
      console.log("No school ID found, skipping message check");
      return;
    }

    // Opret en skjult fane til at hente beskeder
    console.log("Creating hidden tab for message scraping");
    const messageTab = await chrome.tabs.create({
      url: `https://lectio.dk/lectio/${userData.currentUser.schoolId}/beskeder2.aspx`,
      active: false
    });

    // Vent på at siden er indlæst og kør content script
    console.log("Executing message scraping script");
    const results = await chrome.scripting.executeScript({
      target: { tabId: messageTab.id },
      function: scrapeMessages
    });

    console.log("Message scraping results:", results);

    // Luk den skjulte fane igen
    await chrome.tabs.remove(messageTab.id);
    console.log("Closed message scraping tab");
  } catch (error) {
    console.error('Fejl ved besked-tjek:', error);
  }
}

// Funktion der kører i content script kontekst
function scrapeMessages() {
  console.log("Starting message scraping");
  const messages = [];
  const rows = document.querySelectorAll('#s_m_Content_Content_threadGV tr:not(:first-child)');
  console.log("Found message rows:", rows.length);

  rows.forEach((row, index) => {
    try {
      const subject = row.querySelector('.buttonlink a')?.textContent || '';
      const sender = row.querySelector('td:nth-child(5)')?.textContent || '';
      const date = row.querySelector('td.nowrap.textright')?.textContent || '';
      const messageId = row.querySelector('.buttonlink a')?.getAttribute('onclick')?.match(/\d+/)?.[0] || '';
      
      messages.push({
        id: messageId,
        subject: subject.trim(),
        sender: sender.trim(),
        date: date.trim(),
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error(`Error scraping message at index ${index}:`, error);
    }
  });

  console.log("Scraped messages:", messages);

  // Gem beskederne i storage
  chrome.storage.local.set({ 
    lectioMessages: messages,
    lastMessageCheck: new Date().toISOString()
  }, () => {
    console.log("Messages saved to storage");
  });

  // Send besked til alle aktive faner om at opdatere deres besked-visning
  chrome.tabs.query({}, (tabs) => {
    console.log("Broadcasting message update to tabs:", tabs.length);
    tabs.forEach(tab => {
      chrome.tabs.sendMessage(tab.id, {
        action: "updateMessages",
        messages: messages
      }).catch((error) => {
        console.log(`Failed to send update to tab ${tab.id}:`, error);
      });
    });
  });

  return messages;
} 