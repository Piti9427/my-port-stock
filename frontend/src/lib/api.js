export async function fetchWithAuth(url, getToken) {
  const token = await getToken();
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!res.ok) throw new Error('API Error');
  return res.json();
}
