const assert = require('node:assert/strict');
const test = require('node:test');
const { googleIdentityFromPayload } = require('../dist/utils/googleAuth');

test('maps a verified Google payload and rejects incomplete identities', () => {
    assert.deepEqual(
        googleIdentityFromPayload({
            sub: 'google-user-1',
            iss: 'https://accounts.google.com',
            exp: Math.floor(Date.now() / 1000) + 3600,
            email: 'user@gmail.com',
            email_verified: true,
            name: 'Google User',
            picture: 'https://example.com/avatar.png'
        }),
        {
            providerUid: 'google-user-1',
            email: 'user@gmail.com',
            displayName: 'Google User',
            avatarUrl: 'https://example.com/avatar.png'
        }
    );
    assert.throws(
        () => googleIdentityFromPayload({
            sub: 'google-user-1',
            iss: 'https://accounts.google.com',
            exp: Math.floor(Date.now() / 1000) + 3600,
            email: 'user@gmail.com',
            email_verified: false
        }),
        /Invalid Google identity/
    );
    assert.throws(
        () => googleIdentityFromPayload({
            sub: 'google-user-1',
            iss: 'googleapis.com',
            exp: Math.floor(Date.now() / 1000) + 3600,
            email: 'user@gmail.com',
            email_verified: true
        }),
        /Invalid Google identity/
    );
});
