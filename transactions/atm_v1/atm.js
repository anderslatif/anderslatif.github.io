let actualBalance = 1000;
let displayedBalance = '???';
let pendingBalance = null;

let bobOperations = [];
let bankOperations = [];


let achievements = loadAchievements();
let achievementReplays = loadReplays();

let exploitsThisSession = new Set();
let isRecording = false;
let currentRecording = [];


// DOM elements
const balanceDisplay = document.getElementById('balance');
const withdrawBtn = document.getElementById('withdraw');
const depositBtn = document.getElementById('deposit');
const readBalanceBtn = document.getElementById('read-balance');
const updateBalanceBtn = document.getElementById('update-balance');
const bobOpsDiv = document.getElementById('bob-operations');
const bankOpsDiv = document.getElementById('bank-operations');
const achievementsDiv = document.getElementById('achievements');

// Initialize
updateDisplay();
updateButtonStates();
displayAchievements();

// Start recording if there are still achievements to unlock
if (Object.values(achievements).some(val => !val)) {
    startRecording();
}

// Event listeners
withdrawBtn.addEventListener('click', withdraw);
depositBtn.addEventListener('click', deposit);
readBalanceBtn.addEventListener('click', readBalance);
updateBalanceBtn.addEventListener('click', updateBalance);

// Rules link
document.getElementById('rules-link').addEventListener('click', () => {
    showRules();
});

function showRules() {
    // First toast - Welcome
    new SnackBar({
        message: '👋 Welcome! Your goal is to exploit the ATM system and unlock all achievements.',
        timeout: false,
        position: 'tc',
        status: 'info'
    });

    setTimeout(() => {
        new SnackBar({
            message: '🎮 Rules: Read the balance, perform Bob/Bank operations, then update.',
            timeout: false,
            position: 'tc',
            status: 'warning'
        });
    }, 500);

    setTimeout(() => {
        new SnackBar({
            message: 'Refresh the page to reset the bank balance to 1000 DKK. You won\'t lose your achievements.',
            timeout: false,
            position: 'tc',
            status: 'warning'
        });
    }, 500);

    setTimeout(() => {
        new SnackBar({
            message: '🏆 Trophy Tip #1: Hover with your cursor over a trophy to see its details.',
            timeout: false,
            position: 'tc',
            status: 'success'
        });
    }, 3000);

    setTimeout(() => {
        new SnackBar({
            message: '🏆 Trophy Tip #2: Click and swipe a trophy off the table to reset it and try again.',
            timeout: false,
            position: 'tc',
            status: 'success'
        });
    }, 3000);

    setTimeout(() => {
        new SnackBar({
            message: '🏆 Trophy Tip #3: Double-click a trophy to replay the transaction that unlocked it.',
            timeout: false,
            position: 'tc',
            status: 'success'
        });
    }, 3000);
}

function updateDisplay() {
    balanceDisplay.textContent = displayedBalance;
}

function updateButtonStates() {
    const hasRead = pendingBalance !== null;
    withdrawBtn.disabled = !hasRead;
    depositBtn.disabled = !hasRead;
    updateBalanceBtn.disabled = bobOperations.length === 0 && bankOperations.length === 0;
}

function addBobOperation(text) {
    bobOperations.push(text);

    const p = document.createElement('p');
    p.textContent = text;
    p.className = 'operation-item';
    bobOpsDiv.appendChild(p);

    // Add matching spacer to Bank side
    const spacer = document.createElement('p');
    spacer.className = 'operation-spacer';
    spacer.innerHTML = '&nbsp;';
    bankOpsDiv.appendChild(spacer);

    // After render, match the heights
    requestAnimationFrame(() => {
        spacer.style.height = p.offsetHeight + 'px';
    });
}

function addBankOperation(text) {
    bankOperations.push(text);

    const p = document.createElement('p');
    p.textContent = text;
    p.className = 'operation-item';
    bankOpsDiv.appendChild(p);

    // Add matching spacer to Bob side
    const spacer = document.createElement('p');
    spacer.className = 'operation-spacer';
    spacer.innerHTML = '&nbsp;';
    bobOpsDiv.appendChild(spacer);

    // After render, match the heights
    requestAnimationFrame(() => {
        spacer.style.height = p.offsetHeight + 'px';
    });
}

function readBalance() {
    if (isRecording) currentRecording.push('readBalance');
    pendingBalance = actualBalance;
    displayedBalance = actualBalance;
    addBankOperation(`Read balance: ${actualBalance} DKK`);
    updateDisplay();
    updateButtonStates();
}

function withdraw() {
    if (isRecording) currentRecording.push('withdraw');
    pendingBalance -= 100;
    addBobOperation(`Withdraw 100 DKK (Balance now: ${pendingBalance} DKK)`);
    updateButtonStates();
}

function deposit() {
    if (isRecording) currentRecording.push('deposit');
    pendingBalance += 100;
    addBobOperation(`Deposit 100 DKK (Balance now: ${pendingBalance} DKK)`);
    updateButtonStates();
}

function updateBalance() {
    if (isRecording) currentRecording.push('updateBalance');
    const oldBalance = actualBalance;
    actualBalance = pendingBalance;
    addBankOperation(`Update balance: ${oldBalance} DKK → ${actualBalance} DKK`);

    checkAchievements(oldBalance);
    resetTransaction();
}

function checkAchievements(oldBalance) {
    const operationCount = bobOperations.length;
    const balanceChange = actualBalance - oldBalance;

    let unlockedAchievements = [];

    // First Steps
    if (!achievements.firstSteps) {
        achievements.firstSteps = true;
        unlockAchievement('First Steps', 'firstSteps', true);
        unlockedAchievements.push('firstSteps');
    }

    // By the Book (single operation with correct result)
    if (operationCount === 1 && (balanceChange === 100 || balanceChange === -100)) {
        const wasNew = !achievements.byTheBook;
        if (!achievements.byTheBook) {
            achievements.byTheBook = true;
            unlockedAchievements.push('byTheBook');
        }
        unlockAchievement('By the Book', 'byTheBook', wasNew);
    }

    // Triple Dip (three withdrawals)
    if (operationCount >= 3 && bobOperations.filter(op => op.includes('Withdraw')).length >= 3) {
        const wasNew = !achievements.tripleDip;
        if (!achievements.tripleDip) {
            achievements.tripleDip = true;
            exploitsThisSession.add('tripleDip');
            unlockedAchievements.push('tripleDip');
        }
        unlockAchievement('Triple Dip', 'tripleDip', wasNew);
    }

    // Money Printer (lost more than expected through multiple deposits)
    const depositCount = bobOperations.filter(op => op.includes('Deposit')).length;
    if (depositCount >= 2 && balanceChange > 100) {
        const wasNew = !achievements.moneyPrinter;
        if (!achievements.moneyPrinter) {
            achievements.moneyPrinter = true;
            exploitsThisSession.add('moneyPrinter');
            unlockedAchievements.push('moneyPrinter');
        }
        unlockAchievement('Money Printer', 'moneyPrinter', wasNew);
    }

    // Bob the Robber (negative balance or overdraft)
    if (actualBalance < 0 || actualBalance < oldBalance - 100) {
        const wasNew = !achievements.bobTheRobber;
        if (!achievements.bobTheRobber) {
            achievements.bobTheRobber = true;
            exploitsThisSession.add('bobTheRobber');
            unlockedAchievements.push('bobTheRobber');
        }
        unlockAchievement('Bob the Robber', 'bobTheRobber', wasNew);
    }

    // Fat Banker (500+ profit)
    if (actualBalance >= 1500) {
        const wasNew = !achievements.fatBanker;
        if (!achievements.fatBanker) {
            achievements.fatBanker = true;
            unlockedAchievements.push('fatBanker');
        }
        unlockAchievement('Fat Banker', 'fatBanker', wasNew);
    }

    // Race Condition Master (3+ operations with exploit)
    if (operationCount >= 3 && (balanceChange !== 100 && balanceChange !== -100 && balanceChange !== 0)) {
        const wasNew = !achievements.raceConditionMaster;
        if (!achievements.raceConditionMaster) {
            achievements.raceConditionMaster = true;
            exploitsThisSession.add('raceCondition');
            unlockedAchievements.push('raceConditionMaster');
        }
        unlockAchievement('Race Condition Master', 'raceConditionMaster', wasNew);
    }

    // Save recording for newly unlocked achievements
    if (unlockedAchievements.length > 0) {
        unlockedAchievements.forEach(key => stopRecording(key));
    }
}

function loadAchievements() {
    const saved = localStorage.getItem('achievements');
    if (saved) {
        return JSON.parse(saved);
    }
    return {
        firstSteps: false,
        byTheBook: false,
        tripleDip: false,
        moneyPrinter: false,
        bobTheRobber: false,
        fatBanker: false,
        raceConditionMaster: false
    };
}

function saveAchievements() {
    localStorage.setItem('achievements', JSON.stringify(achievements));
}

function loadReplays() {
    const saved = localStorage.getItem('achievementReplays');
    if (saved) {
        return JSON.parse(saved);
    }
    return {};
}

function saveReplays() {
    localStorage.setItem('achievementReplays', JSON.stringify(achievementReplays));
}

function startRecording() {
    isRecording = true;
    currentRecording = [];
}

function stopRecording(achievementKey) {
    isRecording = false;
    if (currentRecording.length > 0) {
        achievementReplays[achievementKey] = [...currentRecording];
        saveReplays();
    }
    currentRecording = [];
}

function replayAchievement(achievementKey) {
    const replay = achievementReplays[achievementKey];
    if (!replay || replay.length === 0) {
        new SnackBar({
            message: 'No replay available for this achievement',
            status: 'warning'
        });
        return;
    }

    // Reset the transaction state
    resetTransaction();

    // Disable buttons during replay
    const allButtons = [withdrawBtn, depositBtn, readBalanceBtn, updateBalanceBtn];
    allButtons.forEach(btn => btn.disabled = true);

    // Replay actions with delay
    let index = 0;
    const replayInterval = setInterval(() => {
        if (index >= replay.length) {
            clearInterval(replayInterval);
            allButtons.forEach(btn => btn.disabled = false);
            updateButtonStates();
            return;
        }

        const action = replay[index];
        switch(action) {
            case 'readBalance':
                readBalance();
                break;
            case 'withdraw':
                withdraw();
                break;
            case 'deposit':
                deposit();
                break;
            case 'updateBalance':
                updateBalance();
                break;
        }
        index++;
    }, 500);
}

function displayAchievements() {
    achievementsDiv.innerHTML = '';
    const achievementNames = {
        firstSteps: 'First Steps',
        byTheBook: 'By the Book',
        bobTheRobber: 'Bob the Robber',
        tripleDip: 'Triple Dip',
        raceConditionMaster: 'Race Condition Master',
        moneyPrinter: 'Money Printer',
        fatBanker: 'Fat Banker',
    };

    const achievementDescriptions = {
        firstSteps: 'Complete your first transaction',
        byTheBook: 'Complete a single legitimate operation',
        tripleDip: 'Withdraw three times in one transaction',
        moneyPrinter: 'Lose more money than you should have',
        bobTheRobber: 'Create a negative balance or overdraft',
        raceConditionMaster: 'Perform 3+ operations in a single transaction',
        fatBanker: 'Accumulate 1500 DKK or more'
    };

    const achievementCategories = {
        firstSteps: 'Innocent',
        byTheBook: 'Innocent',
        tripleDip: 'Hacker',
        moneyPrinter: 'Financier',
        bobTheRobber: 'Hacker',
        fatBanker: 'Financier',
        raceConditionMaster: 'Hacker'
    };

    for (const [key, name] of Object.entries(achievementNames)) {
        const div = document.createElement('div');
        const unlocked = achievements[key];
        div.className = unlocked ? 'achievement-slot unlocked' : 'achievement-slot';
        div.title = achievementDescriptions[key];
        div.dataset.achievementKey = key;
        const nameDisplay = unlocked ? `<div class="achievement-name">${name}</div>` : '';
        const category = achievementCategories[key];
        const categoryClass = category === 'Innocent' ? 'category-innocent' : (category === 'Hacker' ? 'category-hacker' : 'category-financier');
        const categoryDisplay = `<div class="achievement-category ${categoryClass}">${category}</div>`;
        div.innerHTML = `🏆${nameDisplay}${categoryDisplay}`;

        // Add swipe-to-delete functionality
        if (unlocked) {
            addSwipeToDelete(div, key);

            // Add double-click to replay
            div.addEventListener('dblclick', (e) => {
                e.stopPropagation();
                replayAchievement(key);
            });
        }

        achievementsDiv.appendChild(div);
    }
}

function addSwipeToDelete(element, achievementKey) {
    let startX = 0;
    let currentX = 0;
    let isDragging = false;

    element.addEventListener('mousedown', (e) => {
        isDragging = true;
        startX = e.clientX;
        element.style.transition = 'none';
        element.style.cursor = 'grabbing';
    });

    document.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        currentX = e.clientX - startX;
        element.style.transform = `translateX(${currentX}px) rotate(${currentX * 0.1}deg)`;
    });

    document.addEventListener('mouseup', (e) => {
        if (!isDragging) return;
        isDragging = false;
        element.style.cursor = 'help';

        // If swiped more than 100px in either direction, delete it
        if (Math.abs(currentX) > 100) {
            element.style.transition = 'transform 0.3s ease-out, opacity 0.3s ease-out';
            element.style.transform = `translateX(${currentX > 0 ? '200%' : '-200%'}) rotate(${currentX > 0 ? '45deg' : '-45deg'})`;
            element.style.opacity = '0';

            setTimeout(() => {
                achievements[achievementKey] = false;
                saveAchievements();
                displayAchievements();
            }, 300);
        } else {
            // Snap back
            element.style.transition = 'transform 0.3s ease-out';
            element.style.transform = 'translateX(0) rotate(0)';
        }
    });
}

function unlockAchievement(name, id, isNewlyUnlocked) {

    // Determine achievement type and color
    const hackerAchievements = ['tripleDip', 'bobTheRobber', 'raceConditionMaster'];
    const bankAchievements = ['moneyPrinter', 'fatBanker'];
    const innocentAchievements = ['firstSteps', 'byTheBook'];

    const message = isNewlyUnlocked ? `🏆 Achievement Unlocked: ${name}` : `🏆 ${name}`;

    new SnackBar({
        message: message,
        status: hackerAchievements.includes(id) ? 'danger' : (bankAchievements.includes(id) ? 'warning' : (innocentAchievements.includes(id) ? 'info' : 'success'))
    });

    if (isNewlyUnlocked) {
        saveAchievements();
        displayAchievements();
    }
}

function resetTransaction() {
    pendingBalance = null;
    displayedBalance = '???';
    bobOperations = [];
    bankOperations = [];
    bobOpsDiv.innerHTML = '';
    bankOpsDiv.innerHTML = '';
    updateDisplay();
    updateButtonStates();

    // Restart recording if there are still achievements to unlock
    if (Object.values(achievements).some(val => !val)) {
        startRecording();
    }
}