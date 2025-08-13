document.addEventListener('DOMContentLoaded', function() {
    const exercises = [
        {
            title: 'Basic Person Record',
            description: 'Create a YAML file for a person named Bob. Include his name as a key-value pair.',
            expectedAnswer: 'name: Bob',
            initialValue: '',
            hints: [
                'Use the format "key: value"',
                'Remember to add a space after the colon',
                'The key should be "name" and the value should be "Bob"'
            ]
        },
        {
            title: 'Person with Multiple Properties',
            description: 'Create a YAML file for Alice with name, age (30), and active status (true).',
            expectedAnswer: `name: Alice
age: 30
active: true`,
            initialValue: '',
            hints: [
                'Add multiple key-value pairs on separate lines',
                'Numbers don\'t need quotes in YAML',
                'Use true/false for boolean values without quotes'
            ]
        },
        {
            title: 'Simple List',
            description: 'Create a YAML file with a list of fruits containing: apple, banana, orange.',
            expectedAnswer: `fruits:
- apple
- banana
- orange`,
            initialValue: '',
            hints: [
                'Start with a key name for the list',
                'Use dashes (-) for list items',
                'Each list item should be on its own line'
            ]
        },
        {
            title: 'Product with Pricing',
            description: 'Create a product with name "Laptop", price 999.99, in_stock true, and quantity 5.',
            expectedAnswer: `name: Laptop
price: 999.99
in_stock: true
quantity: 5`,
            initialValue: '',
            hints: [
                'Mix different data types: strings, numbers, and booleans',
                'Decimal numbers don\'t need quotes',
                'Use underscores in key names like in_stock'
            ]
        },
        {
            title: 'User Profile with Address',
            description: 'Create a user profile for Steve with nested address (street: "Guldbergsgade 29N", city: "Copenhagen", zip_code: 2200).',
            expectedAnswer: `name: Steve
address:
  street: Guldbergsgade 29N
  city: Copenhagen
  zip_code: 2200`,
            initialValue: '',
            hints: [
                'Use indentation to create nested structures',
                'Indent nested properties with 2 spaces',
                'Numbers like zip codes can be written without quotes'
            ]
        },
        {
            title: 'E-commerce Order',
            description: 'Create an order with id 1001, customer_name "Sarah", total 45.50, shipped false, and items list containing "Book" and "Pen".',
            expectedAnswer: `id: 1001
customer_name: Sarah
total: 45.50
shipped: false
items:
- Book
- Pen`,
            initialValue: '',
            hints: [
                'Combine multiple data types in one structure',
                'Lists come at the end after other properties',
                'Remember proper indentation for list items'
            ]
        },
        {
            title: 'Configuration with Description',
            description: 'Create a config with app_name "MyApp", version 2.1, enabled true, and description as multiline text: "This is a sample application" (new line) "Built with modern technologies".',
            expectedAnswer: `app_name: MyApp
version: 2.1
enabled: true
description: |
  This is a sample application
  Built with modern technologies`,
            initialValue: '',
            hints: [
                'Use the pipe symbol (|) for multiline strings',
                'Indent the multiline content by 2 spaces',
                'Each line of the multiline string should be on its own line'
            ]
        },
        {
            title: 'Environment Configuration',
            description: 'Create a database configuration using environment variables: host should use ${DB_HOST}, port should use ${DB_PORT}, username should use ${DB_USER}, and password should use ${DB_PASS}.',
            expectedAnswer: `host: \${DB_HOST}
port: \${DB_PORT}
username: \${DB_USER}
password: \${DB_PASS}`,
            initialValue: '',
            hints: [
                'Use ${VARIABLE_NAME} syntax for environment variables',
                'Environment variables are treated as strings',
                'No quotes needed around the ${} syntax'
            ]
        }
    ];

    exercises.forEach((exercise, index) => {
        new TutorialCard({
            ...exercise,
            title: `${index + 1}. ${exercise.title}`,
            containerId: 'exercises-container'
        });
    });
});