require('dotenv').config(); // Load environment variables from .env file

const express = require('express');
const path = require('path');
const { Coinbase, Wallet } = require('@coinbase/coinbase-sdk');
const { Resend } = require('resend');
const axios = require('axios');
const fs = require('fs').promises;
const handlebars = require('handlebars');

const app = express();
const port = process.env.PORT || 3000;
const SITE_URL = process.env.RENDER_EXTERNAL_URL || 'http://localhost:3000';
const BASE_URL = process.env.NODE_ENV === 'production' ? SITE_URL : `http://localhost:${port}`;

// Use environment variables for sensitive data
const CDP_CLIENT_KEY = process.env.CDP_CLIENT_KEY;
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const USDC_GROUP_ID = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913'; // Keep this hardcoded if it's not sensitive

// Add this with other environment variables at the top
const ONRAMP_APP_ID = process.env.ONRAMP_APP_ID;

// Serve static files from the 'public' directory
app.use(express.static('public', {
    // Set caching headers for better performance
    maxAge: '1d',
    // Set proper content security headers
    setHeaders: (res, path) => {
        res.set('Access-Control-Allow-Origin', '*');
        // If serving images
        if (path.endsWith('.png') || path.endsWith('.jpg') || path.endsWith('.svg')) {
            res.set('Cache-Control', 'public, max-age=86400');
            res.set('Content-Type', path.endsWith('.svg') ? 'image/svg+xml' : 'image/png');
        }
    }
}));
app.use(express.json()); // for parsing application/json

// Configure Coinbase SDK using environment variables
const coinbase = Coinbase.configure({
    apiKeyName: process.env.COINBASE_API_KEY_NAME,
    privateKey: process.env.COINBASE_PRIVATE_KEY
});

const resend = new Resend(RESEND_API_KEY);

// Add this at the top of server.js
const walletStore = new Map(); // In-memory store for temporary wallet data

// Load and compile template once at startup
let redeemTemplate;
fs.readFile(path.join(__dirname, 'public', 'redeem.html'), 'utf8')
    .then(template => {
        redeemTemplate = handlebars.compile(template);
    })
    .catch(err => {
        console.error('Error loading redeem template:', err);
    });

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Test routes - commented out for production
/*
app.get('/create-wallet', async (req, res) => {
    try {
        const wallet = await Wallet.create({ networkId: Coinbase.networks.BaseMainnet });
        console.log(`Wallet successfully created: ${wallet.toString()}`);
        const defaultAddress = await wallet.getDefaultAddress();
        console.log('Default address:', defaultAddress.toString());
        const walletData = await wallet.export();
        console.log('Exported wallet data:', walletData);

        res.json({
            walletId: walletData.walletId,
            seed: walletData.seed
        });
    } catch (error) {
        console.error('Error creating wallet:', error);
        res.status(500).json({ error: error.message });
    }
});

app.get('/generate-onramp-url', async (req, res) => {
    const appId = '2903e42d-ee60-4cd7-97c5-6cd61e2c0ee4';
    const amount = parseFloat(req.query.amount);

    try {
        const wallet = await Wallet.create({ networkId: Coinbase.networks.BaseMainnet });
        console.log(`Wallet successfully created: ${wallet.toString()}`);

        const defaultAddress = await wallet.getDefaultAddress();
        console.log('Default address:', defaultAddress.toString());

        const addressId = defaultAddress.getId();
        console.log('Address ID:', addressId);

        const onRampURL = generateOnRampURL({
            appId: appId,
            addresses: {
                [addressId]: ['base'],
            },
            defaultNetwork: 'base',
            defaultExperience: 'buy',
            assets: ['USDC'],
            presetFiatAmount: amount,
        });

        res.json({ url: onRampURL });
    } catch (error) {
        console.error('Error generating Onramp URL:', error);
        res.status(500).json({ error: 'Failed to generate Onramp URL' });
    }
});

// Original send-gift-email route (before refactoring)
app.post('/send-gift-email', async (req, res) => {
    const { recipientEmail, amount, cardDesign, senderName } = req.body;
    // ... rest of the code ...
});
*/

app.get('/get-onramp-options', async (req, res) => {
  try {
    // Create a Wallet
    const wallet = await Wallet.create({ networkId: Coinbase.networks.BaseMainnet });
    const defaultAddress = await wallet.getDefaultAddress();
    const addressId = defaultAddress.getId();

    // Export the wallet data
    const walletData = await wallet.export();
    
    // Store wallet data with a unique key (using walletId as the key)
    walletStore.set(walletData.walletId, {
      seed: walletData.seed,
      timestamp: Date.now() // Add timestamp for potential cleanup
    });

    // Prepare the options for the onramp widget
    const options = {
      appId: ONRAMP_APP_ID,
      widgetParameters: {
        addresses: { [addressId]: ['base'] },
        assets: ['USDC'],
        defaultAsset: 'USDC',
        defaultPaymentMethod: 'CRYPTO_ACCOUNT',
        fiatCurrency: 'USD',
        quoteId: crypto.randomUUID(),
      },
      experienceLoggedIn: 'new_tab',    // Changed to new_tab
      experienceLoggedOut: 'new_tab',   // Changed to new_tab
      closeOnExit: true,
      closeOnSuccess: true,
      walletId: walletData.walletId // Only send walletId to frontend
    };

    res.json(options);
  } catch (error) {
    console.error('Error getting onramp options:', error);
    res.status(500).json({ error: 'Failed to get onramp options' });
  }
});

app.get('/success.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'success.html'));
});

// app.post('/send-gift-email', async (req, res) => {
//   const { recipientEmail, amount, cardDesign, senderName } = req.body;

//   try {
//     // Create a new wallet
//     const wallet = await Wallet.create({ networkId: Coinbase.networks.BaseMainnet });
//     console.log(`Wallet successfully created: ${wallet.toString()}`);

//     // Export the wallet data
//     const walletData = await wallet.export();
//     const encodedSeed = encodeURIComponent(walletData.seed);
//     const redemptionUrl = `${BASE_URL}/redeem?walletId=${walletData.walletId}&seed=${encodedSeed}`;

//     const data = await resend.emails.send({
//       from: 'Crypto Gift Cards <noreply@resend.dev>',
//       to: [recipientEmail],
//       subject: "You've Received a Crypto Gift Card!",
//       html: `
//         <!DOCTYPE html>
//         <html lang="en">
//         <head>
//           <meta charset="UTF-8">
//           <meta name="viewport" content="width=device-width, initial-scale=1.0">
//           <title>Your Crypto Gift Card</title>
//           <style>
//             body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
//             .container { max-width: 600px; margin: 0 auto; padding: 20px; }
//             .header { background-color: #1652f0; color: white; padding: 20px; text-align: center; }
//             .content { padding: 20px; }
//             .footer { background-color: #f4f4f4; padding: 10px; text-align: center; font-size: 12px; }
//             .card-image { width: 100%; max-width: 300px; height: auto; margin: 20px 0; }
//             .button { background-color: #1652f0; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block; margin-top: 20px; }
//           </style>
//         </head>
//         <body>
//           <div class="container">
//             <div class="header">
//               <h1>You've Received a Crypto Gift Card!</h1>
//             </div>
//             <div class="content">
//               <p>Dear Recipient,</p>
//               <p>Great news! You've been sent a Crypto Gift Card worth <strong>$${amount} USD</strong> in USDC (USD Coin).</p>
              
//               <img src="${BASE_URL}/images/${cardDesign}.png" alt="Your Gift Card Design" class="card-image"> <!-- Updated path -->
              
//               <p>Gift Details:</p>
//               <ul>
//                 <li>Amount: $${amount} USD in USDC</li>
//                 <li>Card Design: ${cardDesign.charAt(0).toUpperCase() + cardDesign.slice(1)}</li>
//                 <li>Sender: ${senderName || 'A thoughtful friend'}</li>
//               </ul>
//               <p>To redeem your gift card, click the button below:</p>
//               <a href="${redemptionUrl}" class="button">Redeem Your Gift</a>
//               <p><strong>Warning:</strong> This link contains sensitive information. Do not share it with anyone.</p>
//               <p>Thank you for using Crypto Gift Cards. We hope you enjoy your gift!</p>
//               <p>Best regards,<br>The Crypto Gift Cards Team</p>
//             </div>
//             <div class="footer">
//               <p>This is an automated message. Please do not reply to this email. For support, visit <a href="https://cryptogiftcards.com/support">our support page</a>.</p>
//               <p>© 2023 Crypto Gift Cards. All rights reserved.</p>
//             </div>
//           </div>
//         </body>
//         </html>
//       `
//     });

//     console.log('Email sent successfully:', data);
//     res.json({ success: true, message: 'Gift card email sent successfully' });
//   } catch (error) {
//     console.error('Error sending email:', error);
//     res.status(500).json({ success: false, error: 'Failed to send gift card email' });
//   }
// });

// Add this new route for the redemption page
app.get('/redeem', async (req, res) => {
    const { walletId, seed } = req.query;
    
    if (!walletId || !seed) {
        return res.status(400).send('Invalid redemption link');
    }

    try {
        const wallet = await Wallet.import({ 
            networkId: Coinbase.networks.BaseMainnet, 
            walletId, 
            seed 
        });
        
        const address = await wallet.getDefaultAddress();
        const balance = await getUSDCBalance(address);

        const html = redeemTemplate({
            address: address.toString(),
            balance: balance,
            walletId: walletId,
            seed: seed
        });

        res.send(html);
    } catch (error) {
        console.error('Error redeeming gift card:', error);
        res.status(500).send('An error occurred while redeeming your gift card.');
    }
});

// Helper function to get USDC balance
async function getUSDCBalance(address) {
    const rpcRequestPayload = {
        jsonrpc: "2.0",
        id: 1,
        method: "cdp_listBalances",
        params: [{
            address: address.getId(),
            pageToken: "",
            pageSize: 1000
        }]
    };

    const rpcResponse = await axios.post(
        `https://api.developer.coinbase.com/rpc/v1/base/${CDP_CLIENT_KEY}`,
        rpcRequestPayload,
        {
            headers: { 'Content-Type': 'application/json' }
        }
    );

    const balances = rpcResponse.data.result.balances || [];
    const usdcBalance = balances.find(
        b => b.asset.groupId.toLowerCase() === USDC_GROUP_ID.toLowerCase()
    );

    if (usdcBalance) {
        return (parseInt(usdcBalance.valueStr) / Math.pow(10, usdcBalance.decimals)).toFixed(2);
    }

    return '0.00';
}

app.post('/send-gift-email-with-wallet', async (req, res) => {
    const { recipientEmail, amount, cardDesign, walletId } = req.body;
    
    const walletData = walletStore.get(walletId);
    if (!walletData) {
        return res.status(400).json({ success: false, error: 'Invalid wallet data' });
    }

    try {
        const redemptionUrl = `${BASE_URL}/redeem?walletId=${encodeURIComponent(walletId)}&seed=${encodeURIComponent(walletData.seed)}`;
        
        // Set delay for 5 seconds from now
        const delayedTime = new Date(Date.now() + 5 * 1000);

        const data = await resend.emails.send({
            from: 'USDC Gift Cards <noreply@resend.dev>',
            to: [recipientEmail],
            subject: `You've Received a $${amount} USDC Gift Card!`,
            scheduledAt: delayedTime, // Corrected from sendAt to scheduledAt
            html: `
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="utf-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                </head>
                <body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;line-height:1.5;color:#1c1c1e;margin:0;padding:0;background:#f9fafb;">
                    <div style="max-width:600px;margin:40px auto;padding:40px 32px;background:white;border-radius:16px;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
                        <!-- Logo Header -->
                        <div style="text-align:center;margin-bottom:32px;background:white;">
                            <img src="${SITE_URL}/images/email/logo-email.png" 
                                 alt="CryptoGiftBay" 
                                 style="height:80px;width:auto;margin:0 auto;">
                        </div>

                        <!-- Gift Amount Card -->
                        <div style="text-align:center;padding:32px;background:#f0f6ff;border-radius:12px;margin:24px 0;">
                            <div style="font-size:48px;font-weight:600;color:#1652f0;margin:0;letter-spacing:-0.02em;">
                                $${amount} <span style="font-size:20px;color:#6b7280;">USDC</span>
                            </div>
                        </div>

                        <!-- Gift Card Design -->
                        <div style="text-align:center;margin:32px 0;">
                            <img src="${SITE_URL}/images/email/card-${cardDesign}-email.jpg" 
                                 alt="Your Gift Card Design" 
                                 style="max-width:300px;width:100%;border-radius:12px;box-shadow:0 4px 12px rgba(0,0,0,0.1);">
                        </div>

                        <!-- CTA Button -->
                        <div style="text-align:center;margin:32px 0;">
                            <a href="${redemptionUrl}" 
                               style="display:inline-block;background:#1652f0;color:white;text-decoration:none;padding:16px 40px;border-radius:12px;font-weight:600;font-size:16px;letter-spacing:0.01em;box-shadow:0 2px 4px rgba(22,82,240,0.2);">
                                Redeem Your Gift
                            </a>
                        </div>

                        <!-- Instructions -->
                        <p style="margin:24px 0;color:#374151;text-align:center;font-size:15px;">
                            Your USDC gift card has been created and is ready to be redeemed.<br>
                            Click the button above to transfer the USDC to your wallet.
                        </p>
                        
                        <!-- Security Warning -->
                        <div style="background:#fef2f2;border-radius:12px;padding:20px;margin:32px 0;color:#991b1b;">
                            <strong style="display:block;margin-bottom:8px;font-size:15px;">⚠️ Important Security Warning</strong>
                            <p style="margin:0;font-size:14px;line-height:1.6;">
                                This email contains private access to a wallet with your USDC gift. 
                                Never forward or share this email with anyone, as they would have full 
                                access to transfer the USDC from the wallet.
                            </p>
                        </div>

                        <!-- Footer -->
                        <div style="text-align:center;margin-top:40px;padding-top:24px;border-top:1px solid #e5e7eb;">
                            <p style="color:#6b7280;font-size:13px;margin:0;">
                                Questions? Contact us at <a href="mailto:support@cryptogiftbay.com" style="color:#1652f0;text-decoration:none;">support@cryptogiftbay.com</a>
                            </p>
                        </div>
                    </div>
                </body>
                </html>
            `
        });

        console.log('Email scheduled successfully:', data);
        res.json({ success: true, message: 'Gift card email scheduled successfully' });
    } catch (error) {
        console.error('Error scheduling email:', error);
        res.status(500).json({ success: false, error: 'Failed to schedule gift card email' });
    }
});

app.post('/transfer', async (req, res) => {
  const { walletId, seed, destination, amount } = req.body;

  if (!walletId || !seed || !destination || !amount) {
    return res.status(400).json({ message: 'Invalid transfer request' });
  }

  try {
    // Import the wallet
    const wallet = await Wallet.import({ networkId: Coinbase.networks.BaseMainnet, walletId, seed });

    // Convert the amount to a number
    const transferAmount = parseFloat(amount);

    // Create the transfer options
    const transferOptions = {
      amount: transferAmount, // Assuming 'USDC' is the currency code
      assetId: USDC_GROUP_ID,
      destination: destination, // Assuming destination is a valid address string
      gasless: true
    };

    // Create the transfer
    const transfer = await wallet.createTransfer(transferOptions);

    console.log('Transfer successful:', transfer);
    res.json({ message: 'Transfer successful!' });
  } catch (error) {
    console.error('Error creating transfer:', error);
    res.status(500).json({ message: 'Failed to create transfer' });
  }
});

app.get('/get-balance', async (req, res) => {
    const { walletId, seed } = req.query;

    if (!walletId || !seed) {
        return res.status(400).json({ message: 'Invalid request' });
    }

    try {
        const wallet = await Wallet.import({ 
            networkId: Coinbase.networks.BaseMainnet, 
            walletId, 
            seed 
        });
        
        const address = await wallet.getDefaultAddress();
        const balance = await getUSDCBalance(address);

        res.json({ balance });
    } catch (error) {
        console.error('Error fetching balance:', error);
        res.status(500).json({ message: 'Failed to fetch balance' });
    }
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});

