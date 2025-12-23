# QuickHold 🚀

Dead-simple escrow on the XRP Ledger.

### How it works
- Sender types: `escrow 10 "package delivered safely"`
- Funds lock with a hashed secret phrase
- Receiver (or anyone) types the exact phrase → funds release instantly
- No middleman. No fees. ~3-second settlement.

Perfect for migrants, freelancers, P2P trades.

![QuickHold Demo](Demo.gif)

### Try it now
```bash
git clone https://github.com/QuickHold/QuickHold.git
cd QuickHold
npm install
node index.js

Watch it create and release a real escrow live on XRPL Testnet.
Built in a weekend with xrpl.js + five-bells-condition.
@XRPLF @Ripple @RippleXDev – lets get this in front of real users. Grants welcome 👀
#XRPL #Ripple #Crypto
