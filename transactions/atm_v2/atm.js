let actualBalance = 1000;
let displayedBalance = '???';
let pendingBalance = null;
let bobBalance = null; // Bob's view of the balance (separate from bank's actual balance)
let legitimateBalance = null; // What the balance should be if operations were applied correctly
let lastReadBalance = null; // The balance from the most recent read
let operationsSinceLastRead = 0; // Count operations since last read

let bobOperations = [];
let bankOperations = [];
let bobOperationBalances = []; // Track expected balance after each Bob operation
let awaitingGuess = false;
let firstOperationType = null; // Track first operation after read: 'deposit' or 'withdraw'


let achievements = loadAchievements();
let achievementReplays = loadReplays();

let exploitsThisSession = new Set();
let isRecording = false;
let currentRecording = [];
let isReplaying = false; // Flag to disable prompts during replay


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
    withdrawBtn.disabled = !hasRead || awaitingGuess;
    depositBtn.disabled = !hasRead || awaitingGuess;
    updateBalanceBtn.disabled = bobOperations.length === 0 && bankOperations.length === 0;

    // Update button text based on first operation after read
    if (firstOperationType === 'deposit') {
        updateBalanceBtn.textContent = 'Update +100 DKK';
    } else if (firstOperationType === 'withdraw') {
        updateBalanceBtn.textContent = 'Update -100 DKK';
    } else {
        updateBalanceBtn.textContent = 'Update Balance';
    }
}

function addBobOperation(text, expectedBalance) {
    bobOperations.push(text);
    bobOperationBalances.push(expectedBalance);

    const p = document.createElement('p');
    p.textContent = text;
    p.className = 'operation-item';
    p.dataset.operationIndex = bobOperations.length - 1;
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
    lastReadBalance = actualBalance;
    operationsSinceLastRead = 0;
    firstOperationType = null; // Reset on each read

    // Only set bobBalance if this is the first read (no operations yet)
    if (bobBalance === null) {
        bobBalance = actualBalance;
        legitimateBalance = actualBalance;
    }

    displayedBalance = actualBalance;
    addBankOperation(`Read balance: ${actualBalance} DKK`);
    updateDisplay();
    updateButtonStates();
}

function withdraw() {
    if (isRecording) currentRecording.push('withdraw');
    bobBalance -= 100;
    operationsSinceLastRead++;

    // Track first operation after read
    if (operationsSinceLastRead === 1) {
        firstOperationType = 'withdraw';
        legitimateBalance = lastReadBalance - 100;
    }

    addBobOperation(`Withdraw 100 DKK (Balance now: ???)`, bobBalance);

    if (!isReplaying) {
        awaitingGuess = true;
        updateButtonStates();
        promptBalanceGuess();
    } else {
        // During replay, just show the correct answer
        const lastOpElement = bobOpsDiv.querySelector(`p[data-operation-index="${bobOperations.length - 1}"]`);
        lastOpElement.textContent = `Withdraw 100 DKK (Balance now: ${bobBalance} DKK) ✓`;
        lastOpElement.style.borderLeftColor = '#4CAF50';
    }
}

function deposit() {
    if (isRecording) currentRecording.push('deposit');
    bobBalance += 100;
    operationsSinceLastRead++;

    // Track first operation after read
    if (operationsSinceLastRead === 1) {
        firstOperationType = 'deposit';
        legitimateBalance = lastReadBalance + 100;
    }

    addBobOperation(`Deposit 100 DKK (Balance now: ???)`, bobBalance);

    if (!isReplaying) {
        awaitingGuess = true;
        updateButtonStates();
        promptBalanceGuess();
    } else {
        // During replay, just show the correct answer
        const lastOpElement = bobOpsDiv.querySelector(`p[data-operation-index="${bobOperations.length - 1}"]`);
        lastOpElement.textContent = `Deposit 100 DKK (Balance now: ${bobBalance} DKK) ✓`;
        lastOpElement.style.borderLeftColor = '#4CAF50';
    }
}

function updateBalance() {
    if (bobOperations.length === 0) return;

    // Skip prompt during replay
    if (isReplaying) {
        submitFinalBalance();
    } else {
        // Prompt for final balance guess
        promptFinalBalanceGuess();
    }
}

function submitFinalBalance() {
    if (isRecording) currentRecording.push('updateBalance');
    const oldBalance = actualBalance;
    actualBalance = legitimateBalance; // Bank only applies first operation (Read-Modify-Write race condition)
    addBankOperation(`Update balance: ${oldBalance} DKK → ${actualBalance} DKK`);

    checkAchievements(oldBalance);

    // Only reset if not replaying (replay will handle reset with delay)
    if (!isReplaying) {
        resetTransaction();
    }
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
        clearRecording();
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
    if (currentRecording.length > 0) {
        achievementReplays[achievementKey] = [...currentRecording];
        saveReplays();
    }
}

function clearRecording() {
    isRecording = false;
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

    // Set replay mode to disable prompts BEFORE resetting
    isReplaying = true;

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
            // Wait 1.5 seconds before resetting
            setTimeout(() => {
                resetTransaction();
                isReplaying = false; // Exit replay mode AFTER reset
                allButtons.forEach(btn => btn.disabled = false);
                updateButtonStates();
            }, 1500);
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
    }, 1000);
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
        moneyPrinter: 'Let the bank gain money',
        bobTheRobber: 'Create a negative overdraft',
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
    // Only show toast if newly unlocked
    if (!isNewlyUnlocked) {
        return;
    }

    // Determine achievement type and color
    const hackerAchievements = ['tripleDip', 'bobTheRobber', 'raceConditionMaster'];
    const bankAchievements = ['moneyPrinter', 'fatBanker'];
    const innocentAchievements = ['firstSteps', 'byTheBook'];

    const message = `🏆 Achievement Unlocked: ${name}`;

    new SnackBar({
        message: message,
        status: hackerAchievements.includes(id) ? 'danger' : (bankAchievements.includes(id) ? 'warning' : (innocentAchievements.includes(id) ? 'info' : 'success'))
    });

    saveAchievements();
    displayAchievements();
}

function promptBalanceGuess() {
    const guess = prompt(`What is Bob's balance after this operation?`);

    if (guess === null) {
        // User cancelled - revert the last operation
        const lastIndex = bobOperations.length - 1;
        bobOperations.pop();
        bobOperationBalances.pop();

        // Remove the last operation element and its corresponding spacer
        const bobChildren = bobOpsDiv.children;
        const bankChildren = bankOpsDiv.children;
        if (bobChildren.length > 0) {
            bobOpsDiv.removeChild(bobChildren[bobChildren.length - 1]);
        }
        if (bankChildren.length > 0) {
            bankOpsDiv.removeChild(bankChildren[bankChildren.length - 1]);
        }

        // Revert balance change
        const lastOp = currentRecording[currentRecording.length - 1];
        if (lastOp === 'withdraw') {
            bobBalance += 100;
        } else if (lastOp === 'deposit') {
            bobBalance -= 100;
        }

        operationsSinceLastRead--;

        // Recalculate legitimateBalance based on remaining operations
        legitimateBalance = lastReadBalance;
        if (operationsSinceLastRead > 0) {
            const firstOpIndex = bobOperations.length - 1;
            if (firstOpIndex >= 0) {
                const firstOp = bobOperations[firstOpIndex];
                if (firstOp.includes('Withdraw')) {
                    legitimateBalance -= 100;
                } else if (firstOp.includes('Deposit')) {
                    legitimateBalance += 100;
                }
            }
        }

        if (isRecording) currentRecording.pop();

        awaitingGuess = false;
        updateButtonStates();
        return;
    }

    const guessedBalance = parseInt(guess);
    const expectedBalance = bobOperationBalances[bobOperationBalances.length - 1];

    if (isNaN(guessedBalance)) {
        new SnackBar({
            message: 'Please enter a valid number',
            status: 'warning'
        });
        return promptBalanceGuess();
    }

    const lastOpElement = bobOpsDiv.querySelector(`p[data-operation-index="${bobOperations.length - 1}"]`);
    const operationType = bobOperations[bobOperations.length - 1].includes('Withdraw') ? 'Withdraw' : 'Deposit';

    if (guessedBalance === expectedBalance) {
        lastOpElement.textContent = `${operationType} 100 DKK (Balance now: ${expectedBalance} DKK) ✓`;
        lastOpElement.style.borderLeftColor = '#4CAF50';
        awaitingGuess = false;
        updateButtonStates();
    } else {
        lastOpElement.textContent = `${operationType} 100 DKK (Guessed: ${guessedBalance} DKK, Actual: ${expectedBalance} DKK) ✗`;
        lastOpElement.style.borderLeftColor = '#f44336';
        new SnackBar({
            message: `✗ Incorrect. The balance is ${expectedBalance} DKK. Try again!`,
            status: 'danger'
        });
        return promptBalanceGuess();
    }
}

function promptFinalBalanceGuess() {
    const guess = prompt(`Bob's balance is ${bobBalance} DKK.\n\nWhat should the bank's actual balance be if everything was legitimate?\n\nSubmit your answer to complete the transaction.`);

    if (guess === null) {
        return; // User cancelled
    }

    const guessedBalance = parseInt(guess);

    if (isNaN(guessedBalance)) {
        new SnackBar({
            message: 'Please enter a valid number',
            status: 'warning'
        });
        return promptFinalBalanceGuess();
    }

    if (guessedBalance === legitimateBalance) {
        new SnackBar({
            message: '✓ Correct! Transaction complete.',
            status: 'success'
        });
        submitFinalBalance();
    } else {
        new SnackBar({
            message: `✗ Incorrect. You guessed ${guessedBalance} DKK but the legitimate balance should be ${legitimateBalance} DKK. Try again!`,
            status: 'danger'
        });
        return promptFinalBalanceGuess();
    }
}

function resetTransaction() {
    pendingBalance = null;
    bobBalance = null;
    legitimateBalance = null;
    lastReadBalance = null;
    operationsSinceLastRead = 0;
    displayedBalance = '???';
    bobOperations = [];
    bankOperations = [];
    bobOperationBalances = [];
    awaitingGuess = false;
    firstOperationType = null;
    bobOpsDiv.innerHTML = '';
    bankOpsDiv.innerHTML = '';
    updateDisplay();
    updateButtonStates();

    // Restart recording if there are still achievements to unlock
    if (Object.values(achievements).some(val => !val)) {
        startRecording();
    }
}