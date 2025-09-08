export function getUserName(): string | null {
  const idToken = localStorage.getItem('id_token');
  if (!idToken) return null;

  try {
    const payload = JSON.parse(atob(idToken.split('.')[1]));
    return payload.name || payload.email || null;
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
    return payload;
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