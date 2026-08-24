import * as cheerio from 'cheerio';
import patchCss from './patchCss.js';
import patchJs from './patchJs.js';
import { readFile } from 'node:fs/promises';
import userAgent from '../utils/UserAgent.js';

async function readPolyfill(name){
  const polyfillTexto = await readFile(
  new URL('../polyfills/'+name+'.js', import.meta.url),
    'utf-8'
  );
}

async function loadPolyfills(){
  let polyfills = [
    "customEventPoly",
    "runtime",
    "url-polyfill"
  ];
  let scripts = "";
  for(let polyName of polyfills){
    scripts += '<script type="text/javascript">\n'+await readPolyfill(polyName)+'\n</script>\n';
  }
  return scripts;
}

function resolveUrl(url, base){
  if(!url || !base){
    return url;
  }
  const prefixIg = ['http:', 'https:', 'data:', 'javascript:', 'blob:', 'mailto:', '#'];
  const isIg = prefixIg.some(prefix => 
    url.toLowerCase().startsWith(prefix)
  );

  if (isIg) {
    return url;
  }
  try{
    return new URL(url, base).href;
  }catch(e){
    return url;
  }
}

export default async function patchHtml(html) {
  const $ = cheerio.load(html, { decodeEntities: false });
  const baseUrl = $('webviewcrea')?.attr('baseurl');
  const baseHost = new URL(baseUrl).hostname;
  const EVENT_ATTR_REGEX = /^on[a-z]+$/i;
  let globalImportMap = { imports: {} };
  $('script[type="importmap"]').each((_, elem) => {
    const $importMapScript = $(elem);
    try {
      const content = $importMapScript.html();
      if (content && content.trim()) {
        const parsed = JSON.parse(content);
        if (parsed.imports) {
          globalImportMap.imports = { ...globalImportMap.imports, ...parsed.imports };
        }
      }
    } catch (e) {
      console.error('Error al parsear el importmap JSON:', e);
    }
    $importMapScript.remove();
  });
  const stylePromises = [];
  $('style').each((_, elem) => {
    const $style = $(elem);
    const rawType = $style.attr('type');
    const type = (rawType || '').toLowerCase().trim();
    const isStandardCss = !rawType || type === 'text/css';
    if (isStandardCss) {
      $style.attr('type', 'text/css');
      const cssContent = $style.html();
      if (cssContent && cssContent.trim()) {
        const promise = patchCss(cssContent, baseUrl).then((patchedCss) => {
          $style.text(patchedCss);
        });
        stylePromises.push(promise);
      }
    }
  });
  $('link[rel="stylesheet"]').each((_, elem) => {
    const $link = $(elem);
    const url = $link.attr('href') || $link.attr('src');
    const promise = patchCss(null, resolveUrl(url, baseUrl)).then((patchedCss) => {
      $link.replaceWith('<style type="text/css">/n'+patchedCss+"/n</style>");
    });
    stylePromises.push(promise);
  });
  $('[style]').each((_, elem) => {
    const $elem = $(elem);
    const inlineCss = $elem.attr('style');
    if (inlineCss && inlineCss.trim()) {
      const wrappedCss = `* { ${inlineCss} }`;
      const promise = patchCss(wrappedCss).then((patchedCss) => {
        const match = patchedCss.match(/\*[\s]*\{([\s\S]*)\}/);
        if (match && match[1]) {
          $elem.attr('style', match[1].trim());
        }
      });
      stylePromises.push(promise);
    }
  });
  const scriptPromises = [];
  $('script').each((_, elem) => {
    const $script = $(elem);
    const rawType = $script.attr('type');
    const type = (rawType || '').toLowerCase().trim();
    const isModule = type === 'module';
    const isStandardJs = !type || type === 'text/javascript' || type === 'application/javascript' || isModule;
    if (isStandardJs) {
      if (isModule) {
        $script.removeAttr('type');
        $script.removeAttr('nomodule');
        $script.attr('defer', '');
      }
      $script.attr('type', 'text/javascript');

      const src = $script.attr('src');
      const jsContent = $script.html();
      if (src) {
        let srcP = resolveUrl(src, baseUrl);
        const promise = fetch(srcP, {
          headers: {
            'User-Agent': userAgent,
            'host': baseHost,
            'origin': baseHost
          }
        }).then((res) => {
          if (!res.ok) throw new Error(`HTTP ${res.status} al obtener ${srcP}`);
          return res.text();
        })
        .then((remoteJs) => {
          return patchJs(remoteJs, globalImportMap, { scriptUrl: srcP });
        })
        .then((patchedJs) => {
            $script.removeAttr('src');
            $script.text(patchedJs);
        });
        scriptPromises.push(promise);
        return;
      }
      if (jsContent && jsContent.trim()) {
        const promise = patchJs(jsContent, globalImportMap, { scriptUrl: baseUrl }).then((patchedJs) => {
          $script.text(patchedJs);
        });
        scriptPromises.push(promise);
      }
    }
  });
  const coreJsScript = '<script src="https://cdnjs.cloudflare.com/ajax/libs/core-js/3.38.1/minified.js"></script>\n';
  if ($('head').length > 0) {
    $('head').prepend(coreJsScript+(await loadPolyfills()));
  } else {
    $.root().prepend(coreJsScript+(await loadPolyfills()));
  }

  const eventPromises = [];
  $('*').each((_, elem) => {
    const attribs = elem.attribs || {};

    for (const attrName of Object.keys(attribs)) {
      const attrValue = attribs[attrName];
      if (!attrValue || !attrValue.trim()) continue;

      if (EVENT_ATTR_REGEX.test(attrName)) {
        const promise = patchJs(attrValue, globalImportMap, { isInlineExpression: true })
          .then((patchedJs) => {
            $(elem).attr(attrName, patchedJs);
          })
          .catch((err) => console.error(`Error al parchear ${attrName}:`, err));

        eventPromises.push(promise);
      }

      if ((attrName === 'href' || attrName === 'src') && attrValue.trim().toLowerCase().startsWith('javascript:')) {
        const jsCode = attrValue.trim().slice(11);
        if (jsCode.trim()) {
          const promise = patchJs(jsCode, globalImportMap, { isInlineExpression: true })
            .then((patchedJs) => {
              $(elem).attr(attrName, `javascript:${patchedJs}`);
            })
            .catch((err) => console.error(`Error al parchear ${attrName}:`, err));
          eventPromises.push(promise);
        }
      }
    }
  });
  await Promise.all([...stylePromises, ...scriptPromises, ...eventPromises]);
  return $.html();
}
