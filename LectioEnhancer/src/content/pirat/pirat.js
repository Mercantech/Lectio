class PiratBridgeClient {
  constructor() {
    this.socket = null;
    this.gameId = null;
    this.playerName = null;
    this.connected = false;

    this.initializeEventListeners();
    this.fetchCards();
    this.createSessionListBox();
    this.requestSessionList();
  }

  createSessionListBox() {
    const sessionListDiv = document.createElement('div');
    sessionListDiv.id = 'session-list';
    sessionListDiv.className = 'session-box';
    document.getElementById('lobby').appendChild(sessionListDiv);
  }

  initializeEventListeners() {
    document.getElementById("create-game").addEventListener("click", () => {
      this.playerName = prompt("Indtast dit navn:");
      if (this.playerName) {
        this.connectAndCreateGame();
      }
    });

    document.getElementById("join-game").addEventListener("click", () => {
      this.gameId = prompt("Indtast spil-ID:");
      this.playerName = prompt("Indtast dit navn:");
      if (this.gameId && this.playerName) {
        this.connectAndJoinGame();
      }
    });
  }

  async connectAndCreateGame() {
    try {
      if (!this.connected) {
        await this.connectWebSocket();
      }
      console.log("Sender CREATE_GAME kommando:", {
        playerName: this.playerName,
      });
      this.sendCommand("CREATE_GAME", { playerName: this.playerName });
    } catch (error) {
      console.error("Fejl ved oprettelse af spil:", error);
    }
  }

  async connectAndJoinGame() {
    try {
      if (!this.connected) {
        await this.connectWebSocket();
      }
      this.sendCommand("JOIN_GAME", {
        gameId: this.gameId,
        playerName: this.playerName,
      });
    } catch (error) {
      console.error("Fejl ved tilslutning til spil:", error);
    }
  }

  async connectWebSocket() {
    return new Promise((resolve, reject) => {
      if (this.connected && this.socket?.readyState === WebSocket.OPEN) {
        resolve();
        return;
      }

      //"wss://localhost:7277/ws",
      const urls = [
        "wss://pirattest.mercantec.tech/ws",
      ];

      const tryConnect = (index) => {
        if (index >= urls.length) {
          reject(new Error("Kunne ikke oprette forbindelse til nogen af de angivne URLs"));
          return;
        }

        this.socket = new WebSocket(urls[index]);

        this.socket.onopen = () => {
          console.log(`Forbundet til server: ${urls[index]}`);
          this.connected = true;
          resolve();
        };

        this.socket.onclose = () => {
          console.log(`Forbindelse lukket: ${urls[index]}`);
          this.connected = false;
          tryConnect(index + 1);
        };

        this.socket.onerror = (error) => {
          console.error(`WebSocket fejl: ${urls[index]}`, error);
          this.connected = false;
          tryConnect(index + 1);
        };

        this.socket.onmessage = (event) => {
          this.handleMessage(JSON.parse(event.data));
        };
      };

      tryConnect(0);
    });
  }

  sendCommand(type, data) {
    const command = { type, data };
    console.log("Sender kommando:", command);
    this.socket.send(JSON.stringify(command));
  }

  handleMessage(message) {
    switch (message.type) {
      case "GAME_STATE":
        this.updateGameState(message);
        break;
      case "ERROR":
        alert(message.message);
        break;
      case "SESSION_LIST":
        this.displaySessionList(message.sessions);
        break;
    }
  }

  updateGameState(state) {
    if (!this.gameId) {
      this.gameId = state.gameId;
      alert(`Dit spil-ID er: ${this.gameId}`);
    }
    const bettingControls = document.getElementById("betting-controls");
    bettingControls.classList.toggle("hidden", state.state !== "Betting");

    const startGameButton = document.getElementById("start-game");
    const canStartGame = state.players.length >= 2 && 
                        state.state === "Ready" && 
                        state.players[0].name === this.playerName;
    
    if (startGameButton) {
      startGameButton.classList.toggle("hidden", !canStartGame);
    }

    document.getElementById("lobby").classList.add("hidden");
    document.getElementById("game-board").classList.remove("hidden");

    const playersDiv = document.getElementById("players");
    playersDiv.innerHTML = state.players
      .map((player) => {
        return `<div>${player.name || "Ukendt"}: ${
          player.score || 0
        } point</div>`;
      })
      .join("");
  }

  async fetchCards() {
    const ranks = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
    const suits = ['C', 'D', 'H', 'S'];
    const cards = [];

    for (const suit of suits) {
      for (const rank of ranks) {
        cards.push({ rank, suit });
      }
    }
    cards.push({ rank: 'JOKER', suit: 'J' });

    this.displayCards(cards);
  }

  displayCards(cards) {
    const cardDisplay = document.getElementById('card-display');
    const suitOrder = ['S', 'H', 'D', 'C', 'J'];
    const suitNames = {
      'S': 'Spar',
      'H': 'Hjerter',
      'D': 'Ruder',
      'C': 'Klør',
      'J': 'Joker'
    };

    const cardsBySuit = suitOrder.map(suit => {
      const suitCards = cards.filter(card => card.suit === suit);
      return `
        <div class="card-suit">
          <h3>${suitNames[suit]}</h3>
          ${suitCards.map(card => `
            <div class="card">
              <img src="https://piratr2.mercantec.tech/Cards/Cards/C-${card.rank}${card.suit}.SVG" alt="${card.rank} of ${card.suit}">
            </div>
          `).join('')}
        </div>
      `;
    }).join('');

    cardDisplay.innerHTML = cardsBySuit;
  }

  requestSessionList() {
    this.sendCommand("LIST_SESSIONS", {});
  }

  displaySessionList(sessions) {
    const sessionListDiv = document.getElementById("session-list");
    sessionListDiv.innerHTML = sessions.map(session => `
      <div class="session">
        <span>Spil ID: ${session.gameId}</span>
        <button onclick="window.game.joinSession('${session.gameId}')">Join</button>
      </div>
    `).join('');
  }

  joinSession(gameId) {
    this.gameId = gameId;
    this.playerName = prompt("Indtast dit navn:");
    if (this.playerName) {
      this.connectAndJoinGame();
    }
  }
}

if (window.location.pathname.endsWith('/pirat')) {
  // Fjern alle eksisterende elementer på siden
  document.body.innerHTML = '';

  // Tilføj din egen HTML-struktur
  const piratHtml = `
    <div id="game-container">
      <div id="lobby" class="screen">
        <h1>Piratbridge Online</h1>
        <div id="button-container">
          <button id="create-game" class="large-button">Opret nyt spil</button>
          <button id="join-game" class="large-button">Tilslut spil</button>
        </div>
        <div id="card-display"></div>
      </div>
      <div id="game-board" class="screen hidden">
        <div id="table">
          <div id="deck"></div>
          <div id="discard-pile"></div>
          <div id="players">
            <div class="player" id="player-1"></div>
            <div class="player" id="player-2"></div>
            <div class="player" id="player-3"></div>
            <div class="player" id="player-4"></div>
          </div>
        </div>
        <div id="betting-controls" class="hidden">
          <input type="number" id="num-matches" min="1" max="3" value="1">
          <button id="take-matches">Tag tændstikker</button>
        </div>
        <button id="start-game" class="hidden">Start spil</button>
        <div id="current-hand"></div>
      </div>
      <div id="session-list"></div>
    </div>
  `;

  document.body.innerHTML = piratHtml;

  // Start spillet når siden er indlæst
  window.addEventListener("load", () => {
    window.game = new PiratBridgeClient();
    
    document.getElementById("start-game").addEventListener("click", () => {
        window.game.sendCommand("START_GAME", { gameId: window.game.gameId });
    });
  });

  document.getElementById("take-matches").addEventListener("click", () => {
    const numMatches = parseInt(document.getElementById("num-matches").value);
    window.game.sendCommand("TAKE_MATCHES", { gameId: window.game.gameId, numMatches });
  });
}