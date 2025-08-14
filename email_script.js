const emailsInput = document.getElementById("emails");
const emailCount = document.getElementById("emailCount");
const sendBtn = document.getElementById("sendBtn");
const stopBtn = document.getElementById("stopBtn");
const statusLog = document.getElementById("statusLog");

let sending = false;
let stopRequested = false;

emailsInput.addEventListener("input", () => {
  const emails = emailsInput.value.split(/,|\n/).map(e => e.trim()).filter(e => e !== "");
  emailCount.textContent = emails.length + " emails";
});

function toggleSMTP() {
  const isApi = document.getElementById("apiMode").checked;
  document.getElementById("smtpFields").classList.toggle("hidden", isApi);
  document.getElementById("apiField").classList.toggle("hidden", !isApi);
}

function openHistoryPage() {
  window.open("history.html", "_blank");
}

sendBtn.addEventListener("click", async () => {
  if (sending) {
    alert("Already sending emails. Please wait or click Stop.");
    return;
  }

  stopRequested = false;
  sending = true;
  statusLog.textContent = "";
  logStatus("Preparing to send emails...\n");

  // Parse emails
  const emailsRaw = emailsInput.value;
  const emails = [];
  emailsRaw.split(/\n/).forEach(line => {
    line.split(',').forEach(email => {
      const e = email.trim();
      if (e) emails.push({ email: e }); // Send as objects for templating
    });
  });

  if (emails.length === 0) {
    alert("Please enter at least one valid email.");
    sending = false;
    return;
  }

  // Collect form values
  const subject = document.getElementById("subject").value.trim();
  const body = document.getElementById("body").value.trim();

  if (!subject || !body) {
    alert("Subject and Body cannot be empty.");
    sending = false;
    return;
  }

  // SMTP or API mode
  const apiMode = document.getElementById("apiMode").checked;

  // Prepare form data base (without emails)
  const baseFormData = new FormData();
  baseFormData.append("subject", subject);
  baseFormData.append("body", body);
  if (apiMode) {
    const apiToken = document.getElementById("apiToken").value.trim();
    if (!apiToken) {
      alert("API Token is required in API mode.");
      sending = false;
      return;
    }
    baseFormData.append("apiToken", apiToken);
  } else {
    const smtpHost = document.getElementById("smtpHost").value.trim();
    const smtpPort = document.getElementById("smtpPort").value.trim();
    const smtpUser = document.getElementById("smtpUser").value.trim();
    const smtpPass = document.getElementById("smtpPass").value.trim();

    if (!smtpHost || !smtpPort || !smtpUser || !smtpPass) {
      alert("All SMTP fields are required.");
      sending = false;
      return;
    }

    baseFormData.append("smtpHost", smtpHost);
    baseFormData.append("smtpPort", smtpPort);
    baseFormData.append("smtpUser", smtpUser);
    baseFormData.append("smtpPass", smtpPass);
  }

  // Attachment
  const attachmentInput = document.getElementById("attachment");
  let attachmentFile = null;
  if (attachmentInput.files.length > 0) {
    attachmentFile = attachmentInput.files[0];
  }

  logStatus(`Sending ${emails.length} emails one by one...\n`);

  for (let i = 0; i < emails.length; i++) {
    if (stopRequested) {
      logStatus("\nSending stopped by user.\n");
      break;
    }

    const formData = new FormData();

    // Copy base data
    for (let pair of baseFormData.entries()) {
      formData.append(pair[0], pair[1]);
    }

    formData.append("emails", JSON.stringify([emails[i]])); // one email at a time

    if (attachmentFile) {
      formData.append("attachment", attachmentFile);
    }

    try {
      const response = await fetch("http://localhost:3000/sendEmails", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Unknown error");
      }

      const data = await response.json();
      if (data.success) {
        logStatus(`✅ ${emails[i].email} sent successfully`);
      } else {
        logStatus(`❌ ${emails[i].email} failed to send`);
      }
    } catch (error) {
      logStatus(`❌ ${emails[i].email} failed: ${error.message}`);
    }
  }

  sending = false;
});

stopBtn.addEventListener("click", () => {
  if (!sending) {
    alert("No email sending in progress.");
    return;
  }
  stopRequested = true;
  logStatus("\nStop requested. Finishing current email...");
});

function logStatus(msg) {
  statusLog.textContent += msg + "\n";
  statusLog.scrollTop = statusLog.scrollHeight;
}
