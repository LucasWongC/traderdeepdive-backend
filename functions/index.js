const functions = require("firebase-functions");

const express = require("express");
const bodyParser = require("body-parser");
const client = require("mailchimp-marketing");
const crypto = require("crypto")
require("dotenv").config();

const PORT = 5000;
const app = express();

// parse application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({ extended: false }))

// parse application/json
app.use(bodyParser.json())

// Add headers before the routes are defined
app.use(function (req, res, next) {
	// Website you wish to allow to connect
	res.setHeader('Access-Control-Allow-Origin', '*');

	// Request methods you wish to allow
	res.setHeader('Access-Control-Allow-Methods', 'POST');

	// Request headers you wish to allow
	res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type');

	// Set to true if you need the website to include cookies in the requests sent
	// to the API (e.g. in case you use sessions)
	res.setHeader('Access-Control-Allow-Credentials', true);

	// Pass to next layer of middleware
	next();
});

client.setConfig({
  apiKey: process.env.API,
  server: process.env.SERVER_PREFIX,
});

const run = async (email, name, tag) => {
  try {
    const response = await client.lists.addListMember("08220f2e80", {
      email_address: email,
      status: "subscribed",
      merge_fields: {
        FNAME: name
      },
      tags: [tag]
    });
    
    return {
      status: 200,
      response: "success"
    };
  } catch (error) {
    const text = JSON.parse(error.response.text).title;

    if(text == "Member Exists") {
      let hash = crypto.createHash('md5').update(email).digest("hex")

      try {
        await client.lists.updateListMemberTags(
          "08220f2e80",
          hash,
          { tags: [{ name: tag, status: "active" }] }
        );
        return {
          status: 200,
          response: "success"
        };
      } catch(err) {
        return {
          status: err.status,
          response: err.response.text
        };
      }
    }

    return {
      status: error.status,
      response: error.response.text
    };
  }
}

app.post("/subscribe", (req, res, next) => {
  const {name, email, tag} = req.body;
  const response = run(email, name, tag);
  let msg = '';
  response.then(result => {
    if (result.status == 200) {
      msg = 'success';
    } else {
      msg = JSON.parse(result.response).title;
    }
    return res.status(result.status).json(msg)
  }).catch(error => {
    return res.status(402).json(error)
  })
});

app.listen(PORT, () => {
  console.log(`Example app listening at http://localhost:${PORT}`);
});

exports.app = functions.https.onRequest(app);