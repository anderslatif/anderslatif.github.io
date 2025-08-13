class YamlValidator {
    static isValidYaml(yamlString) {
        try {
            jsyaml.load(yamlString);
            return { valid: true, error: null };
        } catch (error) {
            return { valid: false, error: error.message };
        }
    }

    static compareYaml(userYaml, expectedYaml) {
        try {
            const userParsed = jsyaml.load(userYaml);
            const expectedParsed = jsyaml.load(expectedYaml);
            
            return {
                matches: this.deepEqual(userParsed, expectedParsed),
                userParsed,
                expectedParsed
            };
        } catch (error) {
            return { matches: false, error: error.message };
        }
    }

    static deepEqual(obj1, obj2) {
        if (obj1 === obj2) {
            return true;
        }

        if (obj1 == null || obj2 == null) {
            return obj1 === obj2;
        }

        if (typeof obj1 !== typeof obj2) {
            return false;
        }

        if (typeof obj1 !== 'object') {
            return obj1 === obj2;
        }

        if (Array.isArray(obj1) !== Array.isArray(obj2)) {
            return false;
        }

        const keys1 = Object.keys(obj1);
        const keys2 = Object.keys(obj2);

        if (keys1.length !== keys2.length) {
            return false;
        }

        for (let key of keys1) {
            if (!keys2.includes(key)) {
                return false;
            }
            if (!this.deepEqual(obj1[key], obj2[key])) {
                return false;
            }
        }

        return true;
    }

    static generateHints(userParsed, expectedParsed) {
        const hints = [];

        if (typeof expectedParsed === 'object' && expectedParsed !== null) {
            if (Array.isArray(expectedParsed)) {
                if (!Array.isArray(userParsed)) {
                    hints.push('Expected a list/array structure');
                } else if (userParsed.length !== expectedParsed.length) {
                    hints.push(`Expected ${expectedParsed.length} items, but got ${userParsed.length}`);
                }
            } else {
                if (Array.isArray(userParsed)) {
                    hints.push('Expected an object, but got a list');
                } else if (typeof userParsed !== 'object' || userParsed === null) {
                    hints.push('Expected an object structure');
                } else {
                    for (const [key, value] of Object.entries(expectedParsed)) {
                        if (!(key in userParsed)) {
                            hints.push(`Missing key: "${key}"`);
                        } else if (typeof userParsed[key] !== typeof value) {
                            hints.push(`Key "${key}" should be ${typeof value}, but got ${typeof userParsed[key]}`);
                        } else if (userParsed[key] !== value) {
                            if (typeof value === 'string') {
                                hints.push(`Key "${key}" should be "${value}", but got "${userParsed[key]}"`);
                            } else {
                                hints.push(`Key "${key}" has incorrect value`);
                            }
                        }
                    }
                    
                    for (const key of Object.keys(userParsed)) {
                        if (!(key in expectedParsed)) {
                            hints.push(`Unexpected key: "${key}"`);
                        }
                    }
                }
            }
        }

        return hints;
    }

    static generateSyntaxHints(errorMessage) {
        const hints = [];
        const lowerError = errorMessage.toLowerCase();

        if (lowerError.includes('indent')) {
            hints.push('Check your indentation - YAML uses consistent spaces (usually 2 or 4)');
            hints.push('Make sure not to mix tabs and spaces');
        }
        
        if (lowerError.includes('mapping') || lowerError.includes('key')) {
            hints.push('Use "key: value" format for key-value pairs');
            hints.push('Make sure there\'s a space after the colon');
        }
        
        if (lowerError.includes('sequence') || lowerError.includes('list')) {
            hints.push('Use dashes (-) to create list items');
            hints.push('Make sure list items are properly indented');
        }
        
        if (lowerError.includes('quote') || lowerError.includes('string')) {
            hints.push('Check string quoting - use quotes for strings with special characters');
        }
        
        if (lowerError.includes('duplicate')) {
            hints.push('Remove duplicate keys - each key must be unique');
        }

        if (hints.length === 0) {
            hints.push('Check the YAML syntax - make sure colons have spaces after them');
            hints.push('Verify proper indentation (use spaces, not tabs)');
        }

        return hints;
    }
}