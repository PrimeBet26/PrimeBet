function initialize() {
    let storedVersion = null;

    try {
        storedVersion = localStorage.getItem("gambabetDataVersion");
    } catch (error) {
        console.warn("Local storage is unavailable:", error);
    }

    if (storedVersion !== DATA_VERSION) {
        // Starting demo positions
        balance = 0;

        bets = [
            {
                id: "GB-450923",
                selection: "Trump visits Mar-a-Lago 20+ times (May 2026–May 2027)",
                odds: 2.10,
                openedOdds: 2.10,
                amount: 2254.62,
                payout: 4734.70,
                status: "PENDING",
                date: "Demo starting position"
            },
            {
                id: "GB-450924",
                selection: "Trump visits Mar-a-Lago under 25 times (May 2026–May 2027)",
                odds: 1.90,
                openedOdds: 1.90,
                amount: 2254.61,
                payout: 4283.76,
                status: "PENDING",
                date: "Demo starting position"
            }
        ];

        saveData();
    } else {
        try {
            balance = Math.max(0, Number(localStorage.getItem("gambabetCash")) || 0);
            const savedBets = JSON.parse(localStorage.getItem("gambabetBets") || "[]");
            bets = Array.isArray(savedBets) ? savedBets.map(normalizeBet) : [];
        } catch (error) {
            console.warn("Could not load saved demo data:", error);
            balance = 0;
            bets = [];
        }
    }

    updateBalance();
    renderBets();
    loadSport("NFL");

    const nflTab = document.querySelector(".sport-tab");
    if (nflTab) {
        document.querySelectorAll(".sport-tab").forEach(tab => tab.classList.remove("active"));
        nflTab.classList.add("active");
    }

    renderMarketMovers();
    startMarketMovement();
}

// ==================================================
// SPORT RENDERING
// ==================================================

function loadSport(sportName, clickedButton) {
    const data = sports[sportName];
    if (!data) return;

    document.querySelectorAll(".sport-tab").forEach(button => {
        button.classList.remove("active");
    });

    if (clickedButton) {
        clickedButton.classList.add("active");
    } else {
        const matchingTab = [...document.querySelectorAll(".sport-tab")]
            .find(button => button.textContent.includes(sportName));
        if (matchingTab) matchingTab.classList.add("active");
    }

    const title = document.getElementById("sportTitle");
    const container = document.getElementById("sportsContainer");

    if (title) title.textContent = sportName;
    if (!container) return;

    let html = `
        <section class="game-section">
            <div class="section-heading">
                <h2>🏆 Upcoming Games</h2>
                <span>Demo multipliers</span>
            </div>
    `;

    data.games.forEach(game => {
        html += `
            <article class="game-card">
                <div class="game-header">
                    <div class="game-title">${escapeHTML(game.title)}</div>
                    <div class="game-time">${escapeHTML(game.time)}</div>
                </div>
                <div class="game-odds">
        `;

        game.markets.forEach(market => {
            html += `
                <button class="game-bet-button"
                    onclick="selectBet(${JSON.stringify(game.title + " — " + market[0])}, ${Number(market[1])})">
                    <span>${escapeHTML(market[0])}</span>
                    <b>${Number(market[1]).toFixed(2)}x</b>
                </button>
            `;
        });

        html += `
                </div>
            </article>
        `;
    });

    html += `
        </section>

        <section class="game-section">
            <div class="section-heading">
                <h2>🎯 Player & Game Props</h2>
                <span>Example markets</span>
            </div>
            <div class="prop-grid">
    `;

    data.props.forEach((prop, index) => {
        const overOdds = (1.75 + (index % 5) * 0.12).toFixed(2);
        const underOdds = (1.85 + (index % 4) * 0.10).toFixed(2);

        html += `
            <article class="prop">
                <div class="prop-name">${escapeHTML(prop[0])}</div>
                <div class="prop-buttons">
                    <button onclick="selectBet(${JSON.stringify(sportName + " — " + prop[0] + " — " + prop[1])}, ${overOdds})">
                        <span>${escapeHTML(prop[1])}</span>
                        <b>${overOdds}x</b>
                    </button>
                    <button onclick="selectBet(${JSON.stringify(sportName + " — " + prop[0] + " — " + prop[2])}, ${underOdds})">
                        <span>${escapeHTML(prop[2])}</span>
                        <b>${underOdds}x</b>
                    </button>
                </div>
            </article>
        `;
    });

    html += `
            </div>
        </section>

        <section class="game-section">
            <div class="section-heading">
                <h2>🏅 Futures</h2>
                <span>Long-term demo markets</span>
            </div>
            <div class="future-list">
    `;

    data.futures.forEach(future => {
        html += `
            <div class="future">
                <span>${escapeHTML(future[0])}</span>
                <button onclick="selectBet(${JSON.stringify(future[0])}, ${Number(future[1])})">
                    ${Number(future[1]).toFixed(2)}x
                </button>
            </div>
        `;
    });

    html += `
            </div>
        </section>
    `;

    container.innerHTML = html;
}

function escapeHTML(value) {
    return String(value).replace(/[&<>"']/g, character => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    })[character]);
}// ==================================================
// PAGE SWITCHING
// ==================================================

function showPage(page) {
    const pages = ["sports", "markets", "politics", "bets", "profile"];

    pages.forEach(pageName => {
        const element = document.getElementById(pageName + "Page");
        if (element) {
            element.classList.toggle("hidden", pageName !== page);
        }
    });

    document.querySelectorAll(".nav-btn").forEach(button => {
        button.classList.toggle("active", button.dataset.page === page);
    });

    closeSlip();

    if (page === "bets") {
        renderBets();
    }
}

// ==================================================
// BET SLIP
// ==================================================

function selectBet(selection, odds) {
    const numericOdds = Number(odds);

    if (!selection || !Number.isFinite(numericOdds) || numericOdds <= 1) {
        return;
    }

    selectedBet = String(selection);
    selectedOdds = numericOdds;
    selectedOpenedOdds = numericOdds;

    const selectionElement = document.getElementById("selectedBet");
    const oddsElement = document.getElementById("selectedOdds");
    const amountInput = document.getElementById("betAmount");
    const slip = document.getElementById("betSlip");

    if (selectionElement) selectionElement.textContent = selectedBet;
    if (oddsElement) oddsElement.textContent = selectedOdds.toFixed(2) + "x";
    if (amountInput) amountInput.value = "";

    updateBetSlip();

    if (slip) {
        slip.classList.remove("hidden");
    }
}

function updateBetSlip() {
    const input = document.getElementById("betAmount");
    const amount = input ? Math.max(0, Number(input.value) || 0) : 0;

    const totalReturn = amount * selectedOdds;
    const potentialProfit = Math.max(0, totalReturn - amount);

    const amountElement = document.getElementById("slipBetAmount");
    const profitElement = document.getElementById("slipPotentialProfit");
    const returnElement = document.getElementById("slipTotalReturn");
    const payoutElement = document.getElementById("payout");

    if (amountElement) amountElement.textContent = money(amount);
    if (profitElement) profitElement.textContent = money(potentialProfit);
    if (returnElement) returnElement.textContent = money(totalReturn);
    if (payoutElement) payoutElement.textContent = money(totalReturn);
}

function setBetAmount(amount) {
    const input = document.getElementById("betAmount");

    if (!input) return;

    input.value = Math.max(0, Number(amount) || 0).toFixed(2);
    updateBetSlip();
}

function closeSlip() {
    const slip = document.getElementById("betSlip");

    if (slip) {
        slip.classList.add("hidden");
    }
}

function calculatePayout() {
    updateBetSlip();
}

// ==================================================
// PLACE A PLAY-MONEY POSITION
// ==================================================

function placeBet() {
    const input = document.getElementById("betAmount");
    const amount = input ? Number(input.value) : 0;

    if (!selectedBet) {
        return alert("Choose a demo market first.");
    }

    if (!Number.isFinite(amount) || amount <= 0) {
        return alert("Enter a valid demo amount.");
    }

    if (amount > balance) {
        return alert("You do not have enough demo cash. Your current cash balance is $0.00.");
    }

    const payout = Math.round(amount * selectedOdds * 100) / 100;

    const newBet = {
        id: generateBetID(),
        selection: selectedBet,
        odds: selectedOdds,
        openedOdds: selectedOpenedOdds,
        amount: Math.round(amount * 100) / 100,
        payout,
        status: "PENDING",
        date: "Just now"
    };

    balance = Math.round((balance - amount) * 100) / 100;

    bets.unshift(newBet);

    saveData();
    updateBalance();
    closeSlip();
    renderBets();
    showBetConfirmation(newBet);
}

function showBetConfirmation(bet) {
    const confirmation = document.getElementById("betConfirmation");

    if (!confirmation) return;

    const selection = document.getElementById("confirmationSelection");
    const details = document.getElementById("confirmationDetails");

    if (selection) selection.textContent = bet.selection;

    if (details) {
        details.textContent = `${bet.id} • ${money(bet.amount)}`;
    }

    confirmation.classList.remove("hidden");

    window.setTimeout(() => {
        confirmation.classList.add("hidden");
    }, 3500);
}

// ==================================================
// MARKET MOVERS - SIMULATED ONLY
// ==================================================

function renderMarketMovers() {
    const container = document.getElementById("marketMovers");

    if (!container) return;

    container.innerHTML = "";

    marketMovers.forEach(market => {
        const button = document.createElement("button");

        button.type = "button";
        button.className = "market-mover";

        button.innerHTML = `
            <span class="market-mover-title">${escapeHTML(market.name)}</span>
            <b class="market-mover-odds">${market.odds.toFixed(2)}x</b>
        `;

        button.addEventListener("click", () => {
            selectBet(market.name, market.odds);
        });

        container.appendChild(button);
    });
}

function startMarketMovement() {
    const delay = Math.floor(Math.random() * 10000) + 10000;

    window.setTimeout(() => {
        marketMovers.forEach(market => {
            const movement = Math.random() * 0.10 - 0.05;

            market.odds = Math.max(
                1.10,
                Number((market.odds + movement).toFixed(2))
            );
        });

        renderMarketMovers();
        startMarketMovement();

    }, delay);
}

// ==================================================
// MY BETS / POSITIONS
// ==================================================

function renderBets() {
    const container = document.getElementById("betsContainer");

    const totalWagered = bets.reduce((sum, bet) => {
        return sum + (Number(bet.amount) || 0);
    }, 0);

    const potentialPayout = bets.reduce((sum, bet) => {
        return sum + (
            bet.status === "PENDING"
                ? Number(bet.payout) || 0
                : 0
        );
    }, 0);

    const totalBetsElement = document.getElementById("totalBets");
    const totalWageredElement = document.getElementById("totalWagered");
    const potentialPayoutElement = document.getElementById("potentialPayout");

    if (totalBetsElement) {
        totalBetsElement.textContent = bets.length;
    }

    if (totalWageredElement) {
        totalWageredElement.textContent = money(totalWagered);
    }

    if (potentialPayoutElement) {
        potentialPayoutElement.textContent = money(potentialPayout);
    }

    if (!container) return;

    const pending = bets.filter(bet => bet.status === "PENDING");

    const settled = bets.filter(bet =>
        bet.status === "WON" || bet.status === "LOST"
    );

    let html = "";

    if (pending.length) {
        html += `
            <section class="bet-history-section">
                <div class="bet-history-heading">
                    <h2>🟡 Open Positions</h2>
                    <span>${pending.length}</span>
                </div>
        `;

        pending.forEach(bet => {
            html += createBetHTML(bet);
        });

        html += `</section>`;
    }

    if (settled.length) {
        html += `
            <section class="bet-history-section settled-section">
                <div class="bet-history-heading">
                    <h2>📋 Settled Positions</h2>
                    <span>${settled.length}</span>
                </div>
        `;

        settled.forEach(bet => {
            html += createBetHTML(bet);
        });

        html += `</section>`;
    }

    if (!html) {
        html = `
            <div class="empty-bets">
                <div>📭</div>
                <h3>No positions yet</h3>
                <p>Choose a market to create a demo position.</p>
            </div>
        `;
    }

    container.innerHTML = html;
}

function getOddsMovement(bet) {
    const current = Number(bet.odds);
    const opened = Number(bet.openedOdds || bet.odds);

    if (current > opened) {
        return { arrow: "↑", className: "odds-up" };
    }

    if (current < opened) {
        return { arrow: "↓", className: "odds-down" };
    }

    return { arrow: "→", className: "odds-same" };
}

function createBetHTML(bet) {
    const statusClass = String(bet.status).toLowerCase();
    const movement = getOddsMovement(bet);

    const resultText =
        bet.status === "WON"
            ? "+" + money(bet.payout)
            : bet.status === "LOST"
                ? "-" + money(bet.amount)
                : money(bet.payout) + " potential";

    const returnLabel =
        bet.status === "PENDING"
            ? "Potential Return"
            : "Result";

    return `
        <article class="bet-history-card">

            <div class="bet-history-top">
                <div>
                    <h3>${escapeHTML(bet.selection)}</h3>
                    <small>${escapeHTML(bet.date || "")}</small>
                </div>

                <span class="status ${statusClass}">
                    ${escapeHTML(bet.status)}
                </span>
            </div>

            <div class="bet-id">
                POSITION #${escapeHTML(bet.id)}
            </div>

            <div class="bet-details">

                <div>
                    <small>Position</small>
                    <strong>${money(bet.amount)}</strong>
                </div>

                <div>
                    <small>Multiplier</small>

                    <strong class="history-odds ${movement.className}">
                        ${Number(bet.odds).toFixed(2)}x ${movement.arrow}
                    </strong>

                    <small class="opened-odds">
                        Started at ${Number(bet.openedOdds || bet.odds).toFixed(2)}x
                    </small>
                </div>

                <div>
                    <small>${returnLabel}</small>

                    <strong class="bet-result ${statusClass}">
                        ${resultText}
                    </strong>
                </div>

            </div>
        </article>
    `;
}

// ==================================================
// DEMO-ONLY DEPOSIT / WITHDRAW MESSAGE
// ==================================================

function showDepositMessage() {
    const modal = document.getElementById("depositModal");

    if (modal) {
        modal.classList.remove("hidden");
    }
}

function closeDepositMessage() {
    const modal = document.getElementById("depositModal");

    if (modal) {
        modal.classList.add("hidden");
    }
}

// ==================================================
// START THE APP
// ==================================================

document.addEventListener("DOMContentLoaded", initialize);
