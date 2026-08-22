import { setHeaders } from '../../utils/Utils.js';
import { patchHtml } from '../../patch/patchHtml.js';
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
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  try{
    const data = req.body;
    const codePatch = await patchHtml(data);
    res.status(200).send(codePatch);
  }catch(err){
    console.error(err);
    res.status(200).send(req.body);
  }
}
