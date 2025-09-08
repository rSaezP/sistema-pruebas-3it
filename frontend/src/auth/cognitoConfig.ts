export const cognitoConfig = {
    region: import.meta.env.VITE_COGNITO_REGION,
    clientId: import.meta.env.VITE_COGNITO_CLIENT_ID,
    redirectUri: import.meta.env.VITE_COGNITO_REDIRECT_URI,
    logoutUri: import.meta.env.VITE_COGNITO_LOGOUT_URI,
    domain: import.meta.env.VITE_COGNITO_DOMAIN
};