export function getUserName(): string | null {
  const idToken = localStorage.getItem('id_token');
  if (!idToken) return null;

  try {
    const payload = JSON.parse(atob(idToken.split('.')[1]));
    // Try multiple fields to get the best display name
    return payload.name || 
           payload.given_name || 
           payload.email || 
           payload['cognito:username'] || 
           'Usuario';
  } catch (error) {
    console.error('Error parsing token:', error);
    return null;
  }
}

export function getUserInfo(): any | null {
  const idToken = localStorage.getItem('id_token');
  if (!idToken) return null;

  try {
    const payload = JSON.parse(atob(idToken.split('.')[1]));
    console.log('User token payload:', payload); // Debug
    
    // Cognito tokens typically contain: email, name, given_name, family_name, etc.
    return {
      email: payload.email || payload['cognito:username'],
      name: payload.name || payload.given_name || payload['cognito:username'] || payload.email,
      given_name: payload.given_name,
      family_name: payload.family_name,
      picture: payload.picture,
      username: payload['cognito:username'],
      ...payload // Include all original payload data
    };
  } catch (error) {
    console.error('Error parsing token:', error);
    return null;
  }
}

export function isAuthenticated(): boolean {
  const accessToken = localStorage.getItem('access_token');
  if (!accessToken) return false;

  try {
    const payload = JSON.parse(atob(accessToken.split('.')[1]));
    const expiration = payload.exp * 1000; // Convert to milliseconds
    return Date.now() < expiration;
  } catch (error) {
    console.error('Error checking authentication:', error);
    return false;
  }
}