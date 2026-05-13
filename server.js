const express = require("express");
const nodemailer = require("nodemailer");
const { body, validationResult } = require("express-validator");
const cors = require("cors");
require("dotenv").config();

const app = express();

// ─── Middleware ───────────────────────────────────────────────────────────────
app.use(express.json());
app.use(
  cors({
    origin: [
      "https://crop2x.com",
      "http://localhost:3000",
    ],
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true,
  })
);

// ─── Nodemailer Transporter (Hostinger SMTP) ──────────────────────────────────
const transporter = nodemailer.createTransport({
  host: "smtp.hostinger.com",       // Hostinger SMTP host
  port: 465,                         // SSL port (use 587 for STARTTLS)
  secure: true,                      // true for port 465, false for 587
  auth: {
    user: process.env.EMAIL_USER,    // your Hostinger email e.g. info@crop2x.com
    pass: process.env.EMAIL_PASS,    // your Hostinger email password
  },
});

// ─── Verify SMTP connection on startup ───────────────────────────────────────
transporter.verify((error) => {
  if (error) {
    console.error("❌ SMTP connection failed:", error.message);
  } else {
    console.log("✅ SMTP server is ready to send emails");
  }
});

// ─── Validation Rules ─────────────────────────────────────────────────────────
const contactValidation = [
  body("name")
    .trim()
    .notEmpty().withMessage("Name is required")
    .isLength({ max: 100 }).withMessage("Name must be under 100 characters"),

  body("email")
    .trim()
    .notEmpty().withMessage("Email is required")
    .isEmail().withMessage("Enter a valid email address")
    .normalizeEmail(),

  body("phone")
    .optional({ checkFalsy: true })
    .trim()
    .matches(/^[+\d\s\-().]{7,20}$/).withMessage("Enter a valid phone number"),

  body("subject")
    .trim()
    .notEmpty().withMessage("Subject is required")
    .isLength({ max: 200 }).withMessage("Subject must be under 200 characters"),

  body("message")
    .trim()
    .notEmpty().withMessage("Message is required")
    .isLength({ min: 10, max: 2000 }).withMessage("Message must be 10–2000 characters"),
];

// ─── POST /send-email ─────────────────────────────────────────────────────────
app.post("/send-email", contactValidation, async (req, res) => {
  // 1. Check validation errors
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({ errors: errors.array() });
  }

  const { name, email, phone, subject, message } = req.body;

  // 2. Email to YOU (notification)
  const toYouOptions = {
    from: `"Crop2X Contact Form" <${process.env.EMAIL_USER}>`,
    to: process.env.EMAIL_USER,                // your inbox
    replyTo: email,                             // reply goes to the sender
    subject: `[Crop2X Contact] ${subject}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden;">
        <div style="background: linear-gradient(135deg, #16a34a, #059669); padding: 24px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 22px;">📩 New Contact Form Submission</h1>
        </div>
        <div style="padding: 28px; background: #f9fafb;">
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 10px 0; font-weight: bold; color: #374151; width: 120px;">Name:</td>
              <td style="padding: 10px 0; color: #111827;">${name}</td>
            </tr>
            <tr style="background: #f3f4f6;">
              <td style="padding: 10px 8px; font-weight: bold; color: #374151;">Email:</td>
              <td style="padding: 10px 8px; color: #111827;"><a href="mailto:${email}" style="color: #16a34a;">${email}</a></td>
            </tr>
            <tr>
              <td style="padding: 10px 0; font-weight: bold; color: #374151;">Phone:</td>
              <td style="padding: 10px 0; color: #111827;">${phone || "Not provided"}</td>
            </tr>
            <tr style="background: #f3f4f6;">
              <td style="padding: 10px 8px; font-weight: bold; color: #374151;">Subject:</td>
              <td style="padding: 10px 8px; color: #111827;">${subject}</td>
            </tr>
          </table>
          <div style="margin-top: 20px; background: white; border-left: 4px solid #16a34a; padding: 16px; border-radius: 6px;">
            <p style="font-weight: bold; color: #374151; margin: 0 0 8px;">Message:</p>
            <p style="color: #4b5563; margin: 0; white-space: pre-line;">${message}</p>
          </div>
        </div>
        <div style="padding: 16px; background: #f3f4f6; text-align: center; font-size: 12px; color: #9ca3af;">
          Sent via Crop2X Contact Form • ${new Date().toLocaleString("en-PK", { timeZone: "Asia/Karachi" })}
        </div>
      </div>
    `,
  };

  // 3. Auto-reply to the SENDER
  const autoReplyOptions = {
    from: `"Crop2X Team" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: `We received your message – Crop2X`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden;">
        <div style="background: linear-gradient(135deg, #16a34a, #059669); padding: 24px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 22px;">Thank you, ${name}! 🌾</h1>
        </div>
        <div style="padding: 28px; background: white;">
          <p style="color: #374151; font-size: 16px; line-height: 1.6;">
            We've received your message about <strong>"${subject}"</strong> and our team will get back to you within <strong>24 hours</strong>.
          </p>
          <p style="color: #6b7280; font-size: 14px; line-height: 1.6;">
            In the meantime, feel free to explore how Crop2X is transforming agriculture with AI-powered precision farming.
          </p>
          <div style="margin: 24px 0; padding: 16px; background: #f0fdf4; border-radius: 8px; border: 1px solid #bbf7d0;">
            <p style="margin: 0; color: #15803d; font-size: 14px;">
              📞 Need urgent help? Call us at <strong>+92 346 7666791</strong>
            </p>
          </div>
        </div>
        <div style="padding: 16px; background: #f3f4f6; text-align: center; font-size: 12px; color: #9ca3af;">
          © ${new Date().getFullYear()} Crop2X • info@crop2x.com • ICCBS, University of Karachi
        </div>
      </div>
    `,
  };

  // 4. Send both emails
  try {
    await transporter.sendMail(toYouOptions);
    await transporter.sendMail(autoReplyOptions);

    return res.status(200).json({ success: true, message: "Email sent successfully." });
  } catch (err) {
    console.error("❌ Email send error:", err.message);
    return res.status(500).json({ error: "Failed to send email. Please try again later." });
  }
});

// ─── Start Server ─────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
