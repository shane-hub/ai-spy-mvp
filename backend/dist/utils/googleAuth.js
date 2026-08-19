"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyGoogleIdToken = exports.googleIdentityFromPayload = void 0;
const google_auth_library_1 = require("google-auth-library");
const googleClient = new google_auth_library_1.OAuth2Client();
const googleIdentityFromPayload = (payload) => {
    const validIssuer = payload?.iss === 'accounts.google.com' || payload?.iss === 'https://accounts.google.com';
    const unexpired = typeof payload?.exp === 'number' && payload.exp > Date.now() / 1000;
    if (!validIssuer || !unexpired || !payload?.sub || !payload.email || payload.email_verified !== true) {
        throw new Error('Invalid Google identity');
    }
    return {
        providerUid: payload.sub,
        email: payload.email,
        displayName: payload.name || payload.email,
        avatarUrl: payload.picture || null
    };
};
exports.googleIdentityFromPayload = googleIdentityFromPayload;
const verifyGoogleIdToken = async (idToken, clientId) => {
    const ticket = await googleClient.verifyIdToken({ idToken, audience: clientId });
    return (0, exports.googleIdentityFromPayload)(ticket.getPayload());
};
exports.verifyGoogleIdToken = verifyGoogleIdToken;
