export default function setHeaders(res){
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Keep-Alive', 'timeout=60, max=100');
  res.setHeader('Cache-Control', 'public, max-age=864000, s-maxage=864000, stale-while-revalidate=86400');
  res.setHeader('Vary', 'target-url, Accept, Content-Type');
}
