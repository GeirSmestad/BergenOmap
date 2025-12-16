export function redirectToLoginOnExpiredSession(response) {
  if (response.status === 401 || response.status === 403) {
    console.warn('Session expired or unauthorized. Redirecting to login.');
    window.location.href = '/login.html';
    // Throw an error to stop execution flow in the caller
    throw new Error('Session expired, redirecting to login...');
  }
}
