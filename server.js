const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const nodemailer = require('nodemailer');

const app = express();
const PORT = 3000;

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const upload = multer({ dest: 'uploads/' });

// -------------- Smart Tag Helpers ------------------

function getRandomPrice(min = 320.19, max = 890.99) {
  const price = (Math.random() * (max - min) + min).toFixed(2);
  return `$${price}`;
}

function getRandomDate() {
  const d = new Date();
  return d.toISOString().split('T')[0];
}

function getRandomAlphaNum(length = 12) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for(let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

function getRandomNumber(length = 8) {
  let result = '';
  for(let i = 0; i < length; i++) {
    result += Math.floor(Math.random() * 10).toString();
  }
  return result;
}

const randomAddresses = [
  "123 Main St, Springfield, IL 62704",
  "456 Elm St, Portland, OR 97205",
  "789 Maple Ave, San Diego, CA 92103",
  "101 Oak St, Austin, TX 78701",
  "202 Pine St, Seattle, WA 98101",
  "303 Birch Rd, Miami, FL 33101"
];

function getRandomAddress() {
  return randomAddresses[Math.floor(Math.random() * randomAddresses.length)];
}

function fillTemplate(template, data) {
  return template
    .replace(/#email/g, data.email || '')
    .replace(/#price/g, getRandomPrice())
    .replace(/#date/g, getRandomDate())
    .replace(/#random/g, getRandomAlphaNum())
    .replace(/#number/g, getRandomNumber())
    .replace(/#address/g, getRandomAddress());
}

// ---------------------------------------------------

app.post('/sendEmails', upload.single('attachment'), async (req, res) => {
  try {
    const { emails, subject, body, smtpHost, smtpPort, smtpUser, smtpPass } = req.body;

    let emailList;
    try {
      emailList = JSON.parse(emails);
    } catch {
      return res.status(400).json({ error: "Invalid emails format." });
    }
    if (!Array.isArray(emailList) || emailList.length === 0) {
      return res.status(400).json({ error: "No emails provided." });
    }

    if (!subject || !body) {
      return res.status(400).json({ error: "Subject and body are required." });
    }

    if (!smtpHost || !smtpPort || !smtpUser || !smtpPass) {
      return res.status(400).json({ error: "SMTP details are required." });
    }

    // Setup nodemailer transporter
    let transporter = nodemailer.createTransport({
      host: smtpHost,
      port: Number(smtpPort),
      secure: Number(smtpPort) === 465, // true for 465, false for other ports
      auth: {
        user: smtpUser,
        pass: smtpPass,
      },
    });

    // Single email (because frontend sends one by one)
    const emailData = emailList[0];

    // Replace tags in body
    const finalBody = fillTemplate(body, emailData);

    // Prepare mail options
    let mailOptions = {
      from: smtpUser,
      to: emailData.email,
      subject: subject,
      html: finalBody,
    };

    if (req.file) {
      mailOptions.attachments = [{
        filename: req.file.originalname,
        path: req.file.path,
      }];
    }

    // Send mail
    await transporter.sendMail(mailOptions);

    // Delete uploaded file after sending
    if (req.file) {
      fs.unlink(req.file.path, () => {});
    }

    return res.json({ success: true, message: `Email sent to ${emailData.email}` });

  } catch (err) {
    console.error("Error sending email:", err);
    if (req.file) {
      fs.unlink(req.file.path, () => {});
    }
    return res.status(500).json({ error: "Failed to send email." });
  }
});


app.listen(PORT, () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
});
