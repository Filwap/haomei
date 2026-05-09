export async function onRequestGet() {
  return new Response('Functions is working!', {
    headers: { 'Content-Type': 'text/plain' }
  });
}
