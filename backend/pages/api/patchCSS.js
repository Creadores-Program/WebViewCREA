import setHeaders from '../../utils/Utils.js';
import patchCss from '../../patch/patchCss.js';
export default async function handler(req, res) {
  if(req.method != 'POST' && req.method != 'OPTIONS'){
    res.status(405).json({ error: 'Method Not Allowed' });
    return;
  }
  setHeaders(res);
  if(req.method == 'OPTIONS'){
    res.status(200).end();
    return;
  }
  const headersList = await headers();
  const userAgent = headersList.get('user-agent');
  res.setHeader('Content-Type', 'text/css; charset=utf-8');
  try{
    const data = req.body;
    const codePatch = await patchCss(data, null, userAgent);
    res.status(200).send(codePatch);
  }catch(err){
    console.error(err);
    res.status(200).send(req.body);
  }
}
