# js-interview-assessment

## Project Overview:
Your task is to create a simple currency conversion tool similar to that which can be found on Google.

- This should be done using the front-end framework of your choice (e.g. React, Angular, Vue.js, etc.).
- We recommend you spend a maximum of 2 hours completing this challenge.
- We won’t be scoring you on the design; please focus on component composition and adhering to best practices in coding.

## Requirements:

### Currency Selection:
1. Provide two select boxes for users to choose a currency to convert from and to.
1. Fetch a list of currencies from the https://api.currencybeacon.com/v1/currencies API.
1. Populate the select boxes with the available options returned from API.

### Currency Conversion:
1. Allow users to input an amount for the “from” currency.
1. Fetch converted value from https://api.currencybeacon.com/v1/convert API.
1. Populate the “to” value based on the value returned from API.

## API Overview:
- For this assessment, you will be required to make use of the following free API resource: [https://currencybeacon.com](https://currencybeacon.com/register)
- You will need to register for a free account to get access to your `API_KEY`.
  - Your `API_KEY` can be found on the main dashboard once you login under `API Token Information`.
- Your application should make use of the following two API calls:
  - https://api.currencybeacon.com/v1/currencies
  - https://api.currencybeacon.com/v1/convert
- Full documentation can be found here: https://currencybeacon.com/api-documentation
- *Please ensure that you have carefully studied the API responses and selected the most appropriate nodes for the mapping of data.*

## Submission Guidelines:
- Provide a link to your public repo for us to clone or email us a ZIP of the project.
- Include clear instructions on how to run your application locally.
- Document any assumptions or decisions you make during the development process.
- Submit your completed project within the specified timeframe.

## GitHub Copilot and AI use
We understand and appreciate that tools like GitHub Copilot have become valuable resources for many developers, enhancing productivity and efficiency in daily work. However, to ensure a fair and accurate assessment of your individual skills during this interview process, we kindly ask that you complete the assessment task without using Copilot or similar AI coding assistants. This will help us better understand your problem-solving approach and coding abilities. Thank you for your cooperation and understanding.

## Evaluation Criteria:
### Functionality:
> Does the application meet the specified requirements? Does it accurately perform currency conversion?

### Code Quality:
> Is the code well-structured, readable, and maintainable? Are best practices followed?

### Component Composition:
> Are components appropriately structured and reused? Is there unnecessary duplication?

### User Experience:
> Is the user interface intuitive and easy to use? Does it provide clear feedback to users?

### Additional Features:
> Are any optional features implemented effectively?

## Notes:
- You are encouraged to use any additional libraries or tools you find necessary to complete the project efficiently.
- Please ensure that your project is self-contained and can be easily set up and run by the evaluation team.
- If you have any questions or need clarification on the requirements, feel free to reach out for assistance. Good luck!
- Please refrain from using tools like GitHub Copilot.
