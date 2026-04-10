import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import prisma from '../utils/prisma';
import { authenticateToken, AuthRequest } from '../middlewares/auth';
import { PackageType } from '@prisma/client';
import WxPay from 'wechatpay-node-v3';
import dotenv from 'dotenv';
import crypto from 'crypto';

dotenv.config();

const router = Router();

// WeChat Pay SDK Initialization
let wxpay: WxPay | null = null;
const isProd = process.env.NODE_ENV === 'production';

try {
    if (process.env.WECHAT_MCH_ID && process.env.WECHAT_API_V3_KEY) {
        wxpay = new WxPay({
            appid: process.env.WECHAT_APPID || '',
            mchid: process.env.WECHAT_MCH_ID,
            publicKey: Buffer.from(process.env.WECHAT_PUBLIC_KEY || '', 'utf-8'), // Public cert of Wechat
            privateKey: Buffer.from(process.env.WECHAT_PRIVATE_KEY || '', 'utf-8'), // Merchant private key
        });
    }
} catch (e) {
    console.warn('⚠️ WeChat Pay SDK init failed. Please check your .env variables.');
}

router.post('/create-order', authenticateToken, async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user?.userId;
        const { package_type } = req.body;

        if (!userId) return res.status(401).json({ code: 401, msg: 'Unauthorized' });

        const pType = package_type as PackageType;
        if (!['BASIC_10', 'PRO_50'].includes(pType)) {
            return res.status(400).json({ code: 400, msg: 'Invalid package_type' });
        }

        const amountCents = pType === 'BASIC_10' ? 199 : 1990;
        const orderNo = `ORD-${uuidv4().replace(/-/g, '').substring(0, 24)}`; // Max 32 chars for Wechat out_trade_no

        // Idempotent insertion
        await prisma.order.create({
            data: {
                orderNo,
                userId,
                packageType: pType,
                amountCents,
                status: 'PENDING'
            }
        });

        // If Wechat SDK handles real pay
        if (wxpay) {
            const params = {
                description: `AI Spy - ${pType === 'BASIC_10' ? 'Basic Pack' : 'Pro Pack'}`,
                out_trade_no: orderNo,
                notify_url: `${process.env.BACKEND_URL || 'https://example.com'}/api/v1/payments/webhook/wechat`,
                amount: {
                    total: amountCents,
                    currency: 'CNY'
                }
            };

            const result: any = await wxpay.transactions_native(params);
            return res.status(200).json({
                code: 200,
                msg: 'Order created',
                data: {
                    order_no: orderNo,
                    code_url: (result.data || result).code_url || '' // Result might be nested
                }
            });
        }

        // Mock mode fallback for local dev
        res.status(200).json({
            code: 200,
            msg: 'Order created (Mock Mode)',
            data: {
                order_no: orderNo,
                mock_sandbox_url: `/api/v1/payments/sandbox-webhook?order_no=${orderNo}`
            }
        });
    } catch (err: any) {
        console.error('Create order error', err);
        res.status(500).json({ code: 500, msg: 'Server error' });
    }
});

router.post('/webhook/wechat', async (req: Request, res: Response) => {
    try {
        let order_no, transaction_id;

        // Real WeChat Pay Webhook Validation
        if (wxpay) {
            const signature = req.headers['wechatpay-signature'] as string;
            const serial = req.headers['wechatpay-serial'] as string;
            const nonce = req.headers['wechatpay-nonce'] as string;
            const timestamp = req.headers['wechatpay-timestamp'] as string;

            // Verify signature
            const isVerified = wxpay.verifySign({
                body: JSON.stringify(req.body),
                signature,
                serial,
                nonce,
                timestamp
            });

            if (!isVerified) {
                return res.status(401).send({ code: 'FAIL', message: 'Signature verfiy failed' });
            }

            // Decrypt resource
            const resource = req.body.resource;
            const decrypted = wxpay.decipher_gcm(resource.ciphertext, resource.associated_data, resource.nonce, process.env.WECHAT_API_V3_KEY || '');

            const realData = JSON.parse(decrypted as string);
            if (realData.trade_state !== 'SUCCESS') {
                return res.status(200).send({ code: 'SUCCESS', message: 'OK' }); // ignore pending/closed
            }

            order_no = realData.out_trade_no;
            transaction_id = realData.transaction_id;
        } else {
            // Mock webhook parsing for local testing
            order_no = req.body.order_no;
            transaction_id = req.body.transaction_id || `wx_${Date.now()}`;
        }

        // Idempotent Transaction
        await prisma.$transaction(async (tx) => {
            const order = await tx.order.findUnique({ where: { orderNo: order_no } });
            if (!order || order.status === 'SUCCESS') return; // Idempotent skip if already processed

            await tx.order.update({
                where: { orderNo: order_no },
                data: {
                    status: 'SUCCESS',
                    thirdPartyTxId: transaction_id,
                    paidAt: new Date(),
                }
            });

            const addCredits = order.packageType === 'BASIC_10' ? 10 : 99999;

            await tx.user.update({
                where: { id: order.userId },
                data: { availableCredits: { increment: addCredits } }
            });

            await tx.creditsLedger.create({
                data: {
                    userId: order.userId,
                    transactionType: 'PURCHASE_RECHARGE',
                    amount: addCredits,
                    referenceId: order.orderNo
                }
            });
        });

        res.status(200).send({ code: 'SUCCESS', message: 'OK' });
    } catch (err: any) {
        console.error('Wechat webhook error:', err);
        res.status(500).send({ code: 'FAIL', message: 'Internal Error' });
    }
});

router.post('/webhook/ads', async (req: Request, res: Response) => {
    try {
        const { user_id, reward_amount, signature, timestamp, nonce } = req.body;

        if (!user_id || !reward_amount || !signature) {
            return res.status(400).json({ code: 400, msg: 'Bad Request' });
        }

        // S2S Ad Signature verification (mocked logic with HMAC)
        const secret = process.env.ADS_SECRET || 'ad_secret_mock';
        const expectedSignature = crypto.createHmac('sha256', secret)
            .update(`${user_id}:${timestamp}:${nonce}`)
            .digest('hex');

        // Simple mock bypass for dev out of the box
        if (signature !== expectedSignature && process.env.NODE_ENV === 'production') {
            return res.status(401).json({ code: 401, msg: 'Invalid Ad Signature' });
        }

        // Start idempotent transaction for ad rewards
        const referenceId = `ad_${nonce}_${timestamp}`;
        await prisma.$transaction(async (tx) => {
            const existing = await tx.creditsLedger.findFirst({ where: { referenceId } });
            if (existing) return; // Prevent double reward

            await tx.user.update({
                where: { id: user_id },
                data: { availableCredits: { increment: parseInt(reward_amount, 10) } }
            });

            await tx.creditsLedger.create({
                data: {
                    userId: user_id,
                    transactionType: 'AD_REWARD',
                    amount: parseInt(reward_amount, 10),
                    referenceId
                }
            });
        });

        res.status(200).json({ code: 200, msg: 'Ad reward processed successfully' });
    } catch (err: any) {
        console.error('Ad webhook error:', err);
        res.status(500).json({ code: 500 });
    }
});

router.get('/orders/:order_no/status', authenticateToken, async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user?.userId;
        const { order_no } = req.params;

        const order = await prisma.order.findUnique({
            where: { orderNo: order_no },
            include: { user: true }
        });

        if (!order || order.userId !== userId) {
            return res.status(404).json({ code: 404, msg: 'Order not found' });
        }

        res.status(200).json({
            code: 200,
            data: {
                status: order.status,
                updated_credits: order.user.availableCredits
            }
        });
    } catch (err: any) {
        res.status(500).json({ code: 500 });
    }
});

// GET-based sandbox route so user can click a link in frontend easily for testing 
if (process.env.NODE_ENV !== 'production') {
    router.get('/sandbox-webhook', async (req: Request, res: Response) => {
        try {
            const { order_no } = req.query;
            if (!order_no) return res.status(400).send('Missing order_no');

            // Mock Wechat passing the payload to our own webhook
            const payload = {
                order_no,
                transaction_id: `sandbox_${Date.now()}`
            };

            // Call internal webhook to trigger delivery
            await fetch(`http://localhost:${process.env.PORT || 3000}/api/v1/payments/webhook/wechat`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            res.send(`<h1>Sandbox Payment Success 模拟支付成功!</h1><p>Order ${order_no} has been paid. You can close this window and return to AI Spy.</p><script>setTimeout(() => window.close(), 3000);</script>`);
        } catch (err: any) {
            res.status(500).json({ code: 500 });
        }
    });
}

export default router;
