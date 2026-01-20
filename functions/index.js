const { onRequest } = require("firebase-functions/v2/https");
const logger = require("firebase-functions/logger");

exports.bidtechMain = onRequest({ 
  region: "us-east5",
  invoker: "public" // <--- Add this!
}, (req, res) => {
  res.send("BidTech Cloud Run Service is Active.");
});

