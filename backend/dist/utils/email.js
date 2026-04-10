"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendOtpEmail = void 0;
const nodemailer_1 = __importDefault(require("nodemailer"));
const transporter = nodemailer_1.default.createTransport({
    host: process.env.SMTP_HOST || 'smtp.ethereal.email',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
    }
});
const sendOtpEmail = async (to, otp) => {
    const info = await transporter.sendMail({
        from: `"AI Spy Team" <${process.env.SMTP_USER || 'no-reply@aispy.com'}>`,
        to,
        subject: 'Your AI Spy Login Code',
        text: `Your login verification code is: ${otp}. It will expire in 5 minutes.`,
        html: `
            <div style="font-family: sans-serif; text-align: center; padding: 40px; background: #E8F0FF;">
                <div style="background: white; padding: 40px; border-radius: 20px; max-width: 500px; margin: 0 auto; box-shadow: 0 10px 30px rgba(0,0,0,0.1);">
                    <h2 style="color: #4F46E5; margin-bottom: 20px;">AI Spy Dashboard</h2>
                    <p style="color: #475569; font-size: 16px;">Here is your secure login code:</p>
                    <div style="font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #1E293B; margin: 30px 0; padding: 20px; background: #F8FAFC; border-radius: 10px;">
                        ${otp}
                    </div>
                    <p style="color: #94A3B8; font-size: 14px;">This code expires in 5 minutes. If you didn't request this, please ignore this email.</p>
                </div>
            </div>
        `
    });
    console.log('Message sent: %s', info.messageId);
};
exports.sendOtpEmail = sendOtpEmail;
