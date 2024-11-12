# USDC Gift Card Purchase Website

A web application that allows users to send USDC gift cards instantly via email. Recipients can easily redeem their USDC gifts through a secure, gasless experience powered by Coinbase Developer Platform.

![USDC Gift Cards Homepage](public/images/homepage_screenshot.png)

## Features

- 💳 Create instant USDC gift cards
- 📧 Automatic email delivery to recipients
- 🎨 Multiple gift card designs
- ⛽ Gasless transactions on Base network
- 🔒 Secure wallet creation and management
- 💱 Fiat to USDC conversion

## Architecture

The application uses a Node.js/Express backend with a vanilla JavaScript frontend. Key components:

- **Backend**: Express.js server handling API routes and wallet management using CDP SDK
- **Frontend**: Vanilla JS with Webpack bundling
- **Email Service**: Resend for transactional emails
- **Blockchain**: Base network for USDC transactions
- **Smart Wallet Creation**: Coinbase Wallet SDK
- **Payment Processing**: Coinbase Onramp

### Purchase Flow
![Purchase Flow Architecture](public/images/architecture-purchase.jpg)

### Redemption Flow
![Redemption Flow Architecture](public/images/architecture-redemption.jpg)

## Prerequisites

- Node.js v16+
- npm or yarn
- A Coinbase account (No KYC required to [sign up](https://cdp.coinbase.com/create-account) via Coinbase Developer Platform)
- A Resend account for email delivery (free tier is more than enough)

## Environment Variables

Create a `.env` file in the root directory:

```
# Coinbase Developer Platform
CDP_CLIENT_KEY="your-cdp-client-key"
COINBASE_API_KEY_NAME="your-api-key-name"
COINBASE_PRIVATE_KEY="your-private-key"
ONRAMP_APP_ID="your-onramp-app-id"

# Email Service
RESEND_API_KEY="your-resend-api-key"

# Deployment (optional)
PORT=3000
RENDER_EXTERNAL_URL="your-render-url"
```

## Local Development

1. Clone the repository:
```bash
git clone https://github.com/yourusername/usdc-gift-cards.git
cd usdc-gift-cards
```

2. Install dependencies:
```bash
npm install
```

3. Build the frontend assets:
```bash
npm run build
```

4. Start the development server:
```bash
npm start
```

5. Visit `http://localhost:3000` in your browser

## Deployment on Render (free tier is more than enough)

1. Create a new Web Service on Render
2. Connect your GitHub repository
3. Configure the following:
   - **Environment**: Node
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
   - Add all environment variables from `.env`
4. Click "Create Web Service"

### Key Endpoints

- `POST /send-gift-email-with-wallet`: Creates wallet and sends gift email
- `GET /get-onramp-options`: Generates onramp configuration
- `GET /get-balance`: Retrieves USDC balance for a wallet
- `POST /transfer`: Executes gasless USDC transfer

## License

MIT License

### Note on Code Quality
Every single line of code in this project was generated through Cursor AI. While fully functional, you may notice:
> - Extensive inline comments reflecting the iterative development process
>- Some code organization patterns that could be more elegant
> - Redundant documentation in places
> - Verbose error handling from careful iteration
> 
> Feel free to refactor and streamline the code while maintaining the core functionality!
