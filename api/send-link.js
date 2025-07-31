// api/send-link.js
import formData from "form-data";
import Mailgun from "mailgun.js";

const mailgun = new Mailgun(formData);
const mg = mailgun.client({
  username: "api",
  key: process.env.MAILGUN_API_KEY,
});

const DOMAIN = process.env.MAILGUN_DOMAIN;
const FROM_EMAIL = `SnipeRank <noreply@${DOMAIN}>`;
const ADMIN_EMAIL = "yourname@example.com"; // Change to your email

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, message: "Method not allowed" });
  }

  const { name, email, url } = req.body;
  if (!name || !email || !url) {
    return res.status(400).json({ success: false, message: "Missing fields" });
  }

  const reportLink = `https://snipe-rank-frontend.vercel.app/full-report.html?url=${encodeURIComponent(url)}`;

  try {
    // Send to user
    await mg.messages.create(DOMAIN, {
      from: FROM_EMAIL,
      to: email,
      subject: "Your Full AI SEO Report is Ready",
      html: `
        <p>Hi ${name},</p>
        <p>Thanks for trying SnipeRank. Your full report is ready:</p>
        <p><a href="${reportLink}">View Your Report</a></p>
        <p>Let us know if you'd like help improving your score!</p>
      `,
    });

    // Send to you
    await mg.messages.create(DOMAIN, {
      from: FROM_EMAIL,
      to: ADMIN_EMAIL,
      subject: "📩 New Full Report Request",
      html: `
        <p><strong>New Report Requested</strong></p>
        <p><strong>Name:</strong> ${name}</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>URL:</strong> <a href="${url}">${url}</a></p>
        <p><strong>Report Link:</strong> <a href="${reportLink}">${reportLink}</a></p>
      `,
    });

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error("Mailgun error:", error);
    return res.status(500).json({ success: false, message: "Mail failed" });
  }
}
