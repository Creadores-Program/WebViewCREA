import * as cheerio from 'cheerio';
import patchCss from './patchCss.js';
import patchJs from './patchJs.js';
import { readFile } from 'node:fs/promises';

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
    scripts += '<script>\n'+await readPolyfill(polyName)+'\n</script>\n';
  }
  return scripts;
}

export default async function patchHtml(html) {
  const $ = cheerio.load(html, { decodeEntities: false });
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
  const coreJsScript = '<script src="https://cdnjs.cloudflare.com/ajax/libs/core-js/3.38.1/minified.js"></script>\n';
  if ($('head').length > 0) {
    $('head').prepend(coreJsScript+(await loadPolyfills()));
  } else {
    $.root().prepend(coreJsScript);
  }
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
        const promise = patchCss(cssContent).then((patchedCss) => {
          $style.text(patchedCss);
        }).catch((err) => {
          console.error('Error al parchear CSS inline:', err);
        });
        stylePromises.push(promise);
      }
    }
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

      const jsContent = $script.html();
      if (jsContent && jsContent.trim()) {
        const promise = patchJs(jsContent, globalImportMap).then((patchedJs) => {
          $script.text(patchedJs);
        });
        scriptPromises.push(promise);
      }
    }
  });
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
