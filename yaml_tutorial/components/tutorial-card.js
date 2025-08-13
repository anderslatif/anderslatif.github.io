class TutorialCard {
    constructor(config) {
        this.title = config.title;
        this.description = config.description;
        this.expectedAnswer = config.expectedAnswer;
        this.hints = config.hints || [];
        this.initialValue = config.initialValue || '';
        this.containerId = config.containerId;
        this.editor = null;
        this.cardElement = null;
        this.currentHintIndex = 0;
        this.isCorrect = false;
        this.storageKey = `yaml-tutorial-${this.title.replace(/\W+/g, '-').toLowerCase()}`;
        
        this.render();
    }

    render() {
        const container = document.getElementById(this.containerId);
        if (!container) {
            console.error(`Container with id ${this.containerId} not found`);
            return;
        }

        this.cardElement = document.createElement('div');
        this.cardElement.className = 'exercise-card';
        this.cardElement.innerHTML = `
            <div class="exercise-header">
                <h2>${this.title}</h2>
                <p>${this.description}</p>
            </div>
            <div class="exercise-content">
                <div class="code-editor-container">
                    <textarea class="code-editor"></textarea>
                </div>
                <div class="button-container">
                    <button class="check-button">Check Answer</button>
                    <button class="hint-button">Get Hint</button>
                </div>
                <div class="feedback-container"></div>
            </div>
        `;

        container.appendChild(this.cardElement);
        this.initializeEditor();
        this.attachEventListeners();
    }

    initializeEditor() {
        const textarea = this.cardElement.querySelector('.code-editor');
        this.editor = CodeMirror.fromTextArea(textarea, {
            mode: 'yaml',
            theme: 'material',
            lineNumbers: true,
            indentUnit: 2,
            tabSize: 2,
            indentWithTabs: false,
            lineWrapping: true,
            value: this.initialValue
        });

        // Load saved content or use initial value
        const savedContent = this.loadFromStorage();
        this.editor.setValue(savedContent || this.initialValue);

        // Save to localStorage on change
        this.editor.on('change', () => {
            this.saveToStorage(this.editor.getValue());
        });
    }

    attachEventListeners() {
        const checkButton = this.cardElement.querySelector('.check-button');
        const hintButton = this.cardElement.querySelector('.hint-button');

        checkButton.addEventListener('click', () => this.checkAnswer());
        hintButton.addEventListener('click', () => this.showHint());
    }

    checkAnswer() {
        const userYaml = this.editor.getValue().trim();
        const feedbackContainer = this.cardElement.querySelector('.feedback-container');
        
        if (!userYaml) {
            this.showFeedback('error', 'Empty Input', 'Please enter some YAML code to check.');
            return;
        }

        try {
            const parsed = jsyaml.load(userYaml);
            const expected = jsyaml.load(this.expectedAnswer);
            
            if (this.compareObjects(parsed, expected)) {
                this.isCorrect = true;
                this.updateHintButton();
                this.showFeedback('success', 'Correct!', 'Your YAML is valid and matches the expected result.');
            } else {
                this.isCorrect = false;
                this.updateHintButton();
                this.showFeedback('error', 'Incorrect', 'Your YAML is valid but doesn\'t match the expected result.', this.generateHints(parsed, expected));
            }
        } catch (error) {
            this.isCorrect = false;
            this.updateHintButton();
            this.showFeedback('error', 'Invalid YAML', `Syntax error: ${error.message}`, this.generateSyntaxHints(error.message));
        }
    }

    compareObjects(obj1, obj2) {
        return JSON.stringify(obj1) === JSON.stringify(obj2);
    }

    generateHints(parsed, expected) {
        const hints = [];
        
        if (typeof expected === 'object' && expected !== null) {
            for (const [key, value] of Object.entries(expected)) {
                if (!(key in parsed)) {
                    hints.push(`Missing key: "${key}"`);
                } else if (parsed[key] !== value) {
                    hints.push(`Key "${key}" should be "${value}", but got "${parsed[key]}"`);
                }
            }
        }
        
        return hints.length > 0 ? hints : this.hints;
    }

    generateSyntaxHints(errorMessage) {
        const hints = [];
        
        if (errorMessage.includes('indent')) {
            hints.push('Check your indentation - YAML uses spaces, not tabs');
        }
        if (errorMessage.includes('mapping')) {
            hints.push('Make sure key-value pairs are properly formatted with "key: value"');
        }
        if (errorMessage.includes('sequence')) {
            hints.push('Check your list formatting - use dashes (-) for list items');
        }
        
        return hints.length > 0 ? hints : ['Check the YAML syntax and try again'];
    }

    showFeedback(type, title, message = '', hints = []) {
        const feedbackContainer = this.cardElement.querySelector('.feedback-container');
        
        let messageHtml = message ? `<p>${message}</p>` : '';
        let hintsHtml = '';
        if (hints.length > 0) {
            hintsHtml = '<ul>' + hints.map(hint => `<li>${hint}</li>`).join('') + '</ul>';
        }
        
        feedbackContainer.innerHTML = `
            <div class="feedback ${type}">
                <h4>${title}</h4>
                ${messageHtml}
                ${hintsHtml}
            </div>
        `;
    }

    showHint() {
        // Check if current answer is correct
        const userYaml = this.editor.getValue().trim();
        if (userYaml) {
            try {
                const parsed = jsyaml.load(userYaml);
                const expected = jsyaml.load(this.expectedAnswer);
                
                if (this.compareObjects(parsed, expected)) {
                    this.showFeedback('success', 'Well Done!', 'You\'ve already solved this exercise correctly!');
                    return;
                }
            } catch (error) {
                // If there's a syntax error, show syntax hints
                const syntaxHints = this.generateSyntaxHints(error.message);
                this.showFeedback('hint', 'Syntax Error Hint', syntaxHints[0] || 'Check your YAML syntax');
                return;
            }
        }
        
        if (this.hints.length === 0) {
            this.showFeedback('hint', 'Hint', 'No hints available for this exercise.');
            return;
        }
        
        // Get the most relevant hint based on current state
        const relevantHint = this.getMostRelevantHint(userYaml);
        this.showFeedback('hint', 'Hint', relevantHint);
    }

    getMostRelevantHint(userYaml) {
        if (!userYaml.trim()) {
            // If empty, return the first hint
            return this.hints[0];
        }

        try {
            const parsed = jsyaml.load(userYaml);
            const expected = jsyaml.load(this.expectedAnswer);
            
            // Generate contextual hints based on what's missing or wrong
            const contextualHints = this.generateHints(parsed, expected);
            if (contextualHints.length > 0) {
                return contextualHints[0]; // Return the first (most important) contextual hint
            }
        } catch (error) {
            // For syntax errors, return syntax-related hints
            const syntaxHints = this.generateSyntaxHints(error.message);
            if (syntaxHints.length > 0) {
                return syntaxHints[0];
            }
        }

        // Fallback to predefined hints based on progress
        return this.hints[Math.min(this.currentHintIndex, this.hints.length - 1)];
    }

    updateHintButton() {
        const hintButton = this.cardElement.querySelector('.hint-button');
        if (this.isCorrect) {
            hintButton.textContent = 'Completed!';
            hintButton.style.background = '#95a5a6';
        } else {
            hintButton.textContent = 'Get Hint';
            hintButton.style.background = '#f39c12';
        }
    }

    saveToStorage(content) {
        try {
            localStorage.setItem(this.storageKey, content);
        } catch (error) {
            console.warn('Could not save to localStorage:', error);
        }
    }

    loadFromStorage() {
        try {
            return localStorage.getItem(this.storageKey);
        } catch (error) {
            console.warn('Could not load from localStorage:', error);
            return null;
        }
    }

    clearStorage() {
        try {
            localStorage.removeItem(this.storageKey);
        } catch (error) {
            console.warn('Could not clear localStorage:', error);
        }
    }
}