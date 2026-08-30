import patchCss from '../../patch/patchCss.js';
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '4mb',
    },
  },
};
export default async function handler(req, res) {
  if(req.method != 'POST' && req.method != 'OPTIONS'){
    res.status(405).json({ error: 'Method Not Allowed' });
    return;
  }
  if(req.method == 'OPTIONS'){
    res.status(200).end();
    return;
  }
  res.setHeader('Content-Type', 'text/css; charset=utf-8');
  try{
    const data = req.body;
    const codePatch = await patchCss(data, req.headers['target-url'], req.headers);
    res.status(200).send(codePatch);
  }catch(err){
    console.error(err);
    res.status(200).send(req.body);
  }
}
