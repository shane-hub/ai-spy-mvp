import { OAuth2Client, TokenPayload } from 'google-auth-library';

const googleClient = new OAuth2Client();

export const googleIdentityFromPayload = (payload?: TokenPayload) => {
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

export const verifyGoogleIdToken = async (idToken: string, clientId: string) => {
    const ticket = await googleClient.verifyIdToken({ idToken, audience: clientId });
    return googleIdentityFromPayload(ticket.getPayload());
};
