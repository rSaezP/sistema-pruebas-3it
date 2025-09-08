import { cognitoConfig } from "./cognitoConfig";

export function logoutFromCognito() {
  localStorage.clear();
  const params = new URLSearchParams({
    client_id: cognitoConfig.clientId,
    logout_uri: cognitoConfig.logoutUri,
  });
  window.location.href = `${cognitoConfig.domain}/logout?${params.toString()}`;
}