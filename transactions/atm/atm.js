let actualBalance = 1000;
let displayedBalance = '???';
let pendingBalance = null;

let bobOperations = [];
let bankOperations = [];


let achievements = loadAchievements();

let exploitsThisSession = new Set();


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

// Event listeners
withdrawBtn.addEventListener('click', withdraw);
depositBtn.addEventListener('click', deposit);
readBalanceBtn.addEventListener('click', readBalance);
updateBalanceBtn.addEventListener('click', updateBalance);

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
    bobOpsDiv.appendChild(p);
}

function addBankOperation(text) {
    bankOperations.push(text);
    const p = document.createElement('p');
    p.textContent = text;
    bankOpsDiv.appendChild(p);
}

function readBalance() {
    pendingBalance = actualBalance;
    displayedBalance = actualBalance;
    addBankOperation(`Read balance: DKK ${actualBalance}`);
    updateDisplay();
    updateButtonStates();
}

function withdraw() {
    pendingBalance -= 100;
    addBobOperation(`Withdraw DKK 100 (Balance now: DKK ${pendingBalance})`);
    updateButtonStates();
}

function deposit() {
    pendingBalance += 100;
    addBobOperation(`Deposit DKK 100 (Balance now: DKK ${pendingBalance})`);
    updateButtonStates();
}

function updateBalance() {
    const oldBalance = actualBalance;
    actualBalance = pendingBalance;
    addBankOperation(`Update balance: DKK ${oldBalance} → DKK ${actualBalance}`);
    
    checkAchievements(oldBalance);
    resetTransaction();
}

function checkAchievements(oldBalance) {
    const operationCount = bobOperations.length;
    const balanceChange = actualBalance - oldBalance;
    
    // First Steps
    if (!achievements.firstSteps) {
        achievements.firstSteps = true;
        unlockAchievement('First Steps', 'firstSteps', true);
    }

    // By the Book (single operation with correct result)
    if (operationCount === 1 && (balanceChange === 100 || balanceChange === -100)) {
        const wasNew = !achievements.byTheBook;
        if (!achievements.byTheBook) {
            achievements.byTheBook = true;
        }
        unlockAchievement('By the Book', 'byTheBook', wasNew);
    }

    // Double Dip (multiple withdrawals)
    if (operationCount >= 2 && bobOperations.filter(op => op.includes('Withdraw')).length >= 2) {
        const wasNew = !achievements.doubleDip;
        if (!achievements.doubleDip) {
            achievements.doubleDip = true;
            exploitsThisSession.add('doubleDip');
        }
        unlockAchievement('Double Dip', 'doubleDip', wasNew);
    }

    // Money Printer (gained more than expected through multiple deposits)
    const depositCount = bobOperations.filter(op => op.includes('Deposit')).length;
    if (depositCount >= 2 && balanceChange > 100) {
        const wasNew = !achievements.moneyPrinter;
        if (!achievements.moneyPrinter) {
            achievements.moneyPrinter = true;
            exploitsThisSession.add('moneyPrinter');
        }
        unlockAchievement('Money Printer', 'moneyPrinter', wasNew);
    }

    // Bob the Robber (negative balance or overdraft)
    if (actualBalance < 0 || actualBalance < oldBalance - 100) {
        const wasNew = !achievements.bobTheRobber;
        if (!achievements.bobTheRobber) {
            achievements.bobTheRobber = true;
            exploitsThisSession.add('robber');
        }
        unlockAchievement('Bob the Robber', 'bobTheRobber', wasNew);
    }

    // Fat Banker (500+ profit)
    if (actualBalance >= 1500) {
        const wasNew = !achievements.fatBanker;
        if (!achievements.fatBanker) {
            achievements.fatBanker = true;
        }
        unlockAchievement('Fat Banker', 'fatBanker', wasNew);
    }

    // Race Condition Master (3+ operations with exploit)
    if (operationCount >= 3 && (balanceChange !== 100 && balanceChange !== -100 && balanceChange !== 0)) {
        const wasNew = !achievements.raceConditionMaster;
        if (!achievements.raceConditionMaster) {
            achievements.raceConditionMaster = true;
            exploitsThisSession.add('raceCondition');
        }
        unlockAchievement('Race Condition Master', 'raceConditionMaster', wasNew);
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
        doubleDip: false,
        moneyPrinter: false,
        bobTheRobber: false,
        fatBanker: false,
        raceConditionMaster: false
    };
}

function saveAchievements() {
    localStorage.setItem('achievements', JSON.stringify(achievements));
}

function displayAchievements() {
    achievementsDiv.innerHTML = '';
    const achievementNames = {
        firstSteps: 'First Steps',
        byTheBook: 'By the Book',
        doubleDip: 'Double Dip',
        moneyPrinter: 'Money Printer',
        bobTheRobber: 'Bob the Robber',
        raceConditionMaster: 'Race Condition Master',
        fatBanker: 'Fat Banker',
    };

    const achievementDescriptions = {
        firstSteps: 'Complete your first transaction',
        byTheBook: 'Complete a single legitimate operation',
        doubleDip: 'Withdraw multiple times in one transaction',
        moneyPrinter: 'Gain more money than you should have',
        bobTheRobber: 'Create a negative balance or overdraft',
        raceConditionMaster: 'Perform 3+ operations in a single transaction',   
        fatBanker: 'Accumulate 1500 DKK or more'
    };

    const achievementCategories = {
        firstSteps: 'Innocent',
        byTheBook: 'Innocent',
        doubleDip: 'Hacker',
        moneyPrinter: 'Hacker',
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
        const nameDisplay = unlocked ? `<div style="font-size: 11px; margin-top: 5px; white-space: nowrap;">${name}</div>` : '';
        const category = achievementCategories[key];
        const categoryColor = category === 'Innocent' ? '#2196F3' : (category === 'Hacker' ? '#f44336' : '#FFC107');
        const categoryDisplay = `<div style="font-size: 8px; margin-top: 3px; color: ${categoryColor}; font-weight: bold;">${category}</div>`;
        div.innerHTML = `🏆${nameDisplay}${categoryDisplay}`;

        // Add swipe-to-delete functionality
        if (unlocked) {
            addSwipeToDelete(div, key);
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
    console.log(`🏆 Achievement ${isNewlyUnlocked ? 'Unlocked' : 'Achieved'}: ${name}`);

    // Determine achievement type and color
    const hackerAchievements = ['doubleDip', 'moneyPrinter', 'bobTheRobber', 'raceConditionMaster'];
    const bankAchievements = ['fatBanker'];

    const message = isNewlyUnlocked ? `🏆 Achievement Unlocked: ${name}` : `🏆 ${name}`;

    new SnackBar({
        message: message,
        status: hackerAchievements.includes(id) ? 'danger' : (bankAchievements.includes(id) ? 'warning' : 'success')
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
}