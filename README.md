# Bitespeed Identity Resolution Service

## Setup

1. Install dependencies:
   npm install

2. Create and configure your `.env` file.

3. Run the Contact table migration in your MySQL database (see src/models/contact.model.js).

4. Start the server:
   npm run dev

## API

POST /api/identify

Body:
{
"email": "example@domain.com",
"phoneNumber": "1234567890"
}

Response:
{
"contact": {
"primaryContatctId": 1,
"emails": ["example@domain.com"],
"phoneNumbers": ["1234567890"],
"secondaryContactIds": []
}
}
