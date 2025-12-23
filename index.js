// index.js - Interactive QuickHold Escrow Demo (Final CLI Version)

const xrpl = require("xrpl");
const cc = require("five-bells-condition");
const crypto = require("crypto");
const readline = require("readline");

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

async function main() {
  console.log("\n🚀 Welcome to QuickHold – Dead-Simple Escrow on XRPL\n");

  const client = new xrpl.Client("wss://s.altnet.rippletest.net:51233");
  await client.connect();
  console.log("✅ Connected to XRPL Testnet\n");

  console.log("🔑 Generating fresh wallets...");
  const senderWallet = (await client.fundWallet()).wallet;
  const receiverWallet = (await client.fundWallet()).wallet;

  const sender = senderWallet.classicAddress;
  const receiver = receiverWallet.classicAddress;

  console.log(`👤 Sender:    ${sender}`);
  console.log(`👤 Receiver:  ${receiver}\n`);

  const senderBal = await client.getXrpBalance(sender);
  const receiverBal = await client.getXrpBalance(receiver);
  console.log(`💰 Sender balance:    ${senderBal} XRP`);
  console.log(`💰 Receiver balance:  ${receiverBal} XRP\n`);

  console.log("📝 Command format:");
  console.log('   escrow <amount> "your secret phrase here"\n');
  console.log('Example: escrow 10 "package delivered safely"\n');

  rl.question("> ", async (input) => {
    // Parse command: escrow <amount> "phrase with spaces"
    const regex = /^escrow\s+(\d+(\.\d+)?)\s+"(.+)"$/;
    const match = input.trim().match(regex);

    if (!match) {
      console.log('❌ Invalid format. Use: escrow <amount> "secret phrase"');
      console.log("   Make sure the phrase is in quotes!\n");
      rl.close();
      await client.disconnect();
      return;
    }

    const amount = match[1];
    const secretPhrase = match[3];

    console.log(`\n🔒 Locking ${amount} XRP with secret: "${secretPhrase}"\n`);

    // Hash the exact phrase into preimage
    const preimageData = crypto
      .createHash("sha256")
      .update(secretPhrase)
      .digest();
    const fulfillmentObj = new cc.PreimageSha256();
    fulfillmentObj.setPreimage(preimageData);

    const fulfillment = fulfillmentObj
      .serializeBinary()
      .toString("hex")
      .toUpperCase();
    const condition = fulfillmentObj
      .getConditionBinary()
      .toString("hex")
      .toUpperCase();

    // Expiration in ~5 minutes
    const now = Math.floor(Date.now() / 1000);
    const rippleEpochOffset = 946684800;
    const cancelAfter = now + 300 - rippleEpochOffset;

    const escrowTx = {
      TransactionType: "EscrowCreate",
      Account: sender,
      Amount: xrpl.xrpToDrops(amount),
      Destination: receiver,
      Condition: condition,
      CancelAfter: cancelAfter,
    };

    try {
      const prepared = await client.autofill(escrowTx);
      const signed = senderWallet.sign(prepared);
      const result = await client.submitAndWait(signed.tx_blob);

      if (result.result.meta.TransactionResult === "tesSUCCESS") {
        console.log("✅ Escrow created successfully!");
        console.log(`📄 Transaction hash: ${result.result.hash}`);
        console.log(`🔐 ${amount} XRP locked`);
        console.log(`⏳ Waiting for secret phrase to release funds...\n`);

        rl.question(
          "Enter secret phrase to release: ",
          async (releaseInput) => {
            if (releaseInput === secretPhrase) {
              console.log("\n🔓 Correct phrase! Releasing funds...\n");

              const finishTx = {
                TransactionType: "EscrowFinish",
                Account: receiver,
                Owner: sender,
                OfferSequence: prepared.Sequence,
                Condition: condition,
                Fulfillment: fulfillment,
              };

              const preparedFinish = await client.autofill(finishTx);
              const signedFinish = receiverWallet.sign(preparedFinish);
              const finishResult = await client.submitAndWait(
                signedFinish.tx_blob,
              );

              if (finishResult.result.meta.TransactionResult === "tesSUCCESS") {
                const newSenderBal = await client.getXrpBalance(sender);
                const newReceiverBal = await client.getXrpBalance(receiver);
                console.log("🎉 Funds released!");
                console.log(`💰 Sender final:    ${newSenderBal} XRP`);
                console.log(
                  `💰 Receiver final:  ${newReceiverBal} XRP (+${amount} XRP)`,
                );
              } else {
                console.log("❌ Release failed.");
              }
            } else {
              console.log(
                "❌ Wrong phrase – funds remain locked (will return to sender in 5 min).",
              );
            }

            console.log("\n👋 QuickHold demo complete. Lets Go!");
            rl.close();
            await client.disconnect();
          },
        );
      } else {
        console.log("❌ Creation failed.");
        rl.close();
        await client.disconnect();
      }
    } catch (err) {
      console.error("Error:", err.message);
      rl.close();
      await client.disconnect();
    }
  });
}

main().catch(console.error);
