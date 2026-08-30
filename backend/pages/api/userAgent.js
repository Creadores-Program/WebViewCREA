import * as userAgents from '../../utils/UserAgent.js';

export default async function handler(req, res) {
  if(req.method != 'POST' && req.method != 'OPTIONS'){
    res.status(405).json({ error: 'Method Not Allowed' });
    return;
  }
  if(req.method == 'OPTIONS'){
    res.status(200).end();
    return;
  }
  try{
    const data = req.body;
    res.status(200).send(userAgents[data] || userAgents.default);
  }catch(e){
    console.error(e);
    res.status(500).send();
  }
}
