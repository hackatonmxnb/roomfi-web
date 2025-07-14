# RoomFi

RoomFi is a Web3 platform to find roommates and share a home in a secure, transparent, and trustworthy way. It leverages blockchain technology to manage identities, reputations, and payments in a decentralized manner.

## Main Features

- **Search for rooms and roommates** with advanced filters.
- **Tenant identity and reputation** via NFT (Tenant Passport).
- **Property management** and rental agreements on blockchain.
- **Payments and pooling** with MXNBT tokens.
- **Google and MetaMask integration** for onboarding and login.
- **Interactive map** to visualize properties.

## Technologies Used

- **React** + **TypeScript** (frontend)
- **Material UI** (UI/UX)
- **ethers.js** (Web3)
- **@portal-hq/web** (MPC wallets)
- **Google Maps API**
- **Solidity** (smart contracts in `Foundry/`)

## Installation

1. Clone the repository:

   ```bash
   git clone https://github.com/youruser/roomfi.git
   cd roomfi
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Create a `.env` file with the following variables:

   ```env
   REACT_APP_GOOGLE_MAPS_API_KEY=your_api_key
   REACT_APP_GOOGLE_CLIENT_ID=your_google_client_id
   REACT_APP_PORTAL_API_KEY=your_portal_api_key
   REACT_APP_API=https://api.your-backend.com
   REACT_APP_JUNO_API_KEY=your_juno_api_key
   REACT_APP_JUNO_API_SECRET=your_juno_api_secret
   ```

4. Run the application:

   ```bash
   npm start
   ```

The app will be available at [http://localhost:3000](http://localhost:3000).

## Project Structure

- `src/` — React frontend
- `Foundry/` — Solidity smart contracts and scripts
- `public/` — Static assets

## Useful Scripts

- `npm start` — Start the frontend in development mode
- `npm run build` — Build the app for production
- `npm test` — Run tests

## Smart Contracts

The contracts are located in `Foundry/src/` and can be deployed using Foundry (`forge`).

## Contributing

Pull requests and suggestions are welcome! Please open an issue to discuss major changes before submitting a PR.

## License

This project is private and currently *not licensed for reuse*.
Do not copy, distribute, or modify the contents without written permission.
