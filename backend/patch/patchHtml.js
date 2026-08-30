import * as cheerio from 'cheerio';
import patchCss from './patchCss.js';
import patchJs from './patchJs.js';
import { readFile } from 'node:fs/promises';
import userAgent from '../utils/UserAgent.js';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { minify } from 'html-minifier-terser';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const POLYFILL_PATHS = {
  customEventPoly: path.join(__dirname, '../polyfills/customEventPoly.js'),
  runtime: path.join(__dirname, '../polyfills/runtime.js'),
  'url-polyfill': path.join(__dirname, '../polyfills/url-polyfill.js'),
};
async function readPolyfill(name){
  return await readFile(POLYFILL_PATHS[name], 'utf-8');
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

export default async function patchHtml(html, headers) {
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
    const rawUrl = $link.attr('href') || $link.attr('src');
    if (!rawUrl) return;

    const targetUrl = resolveUrl(rawUrl, baseUrl);
    const clientScript = `(function(){` +
      `var xhr = new XMLHttpRequest();` +
      `xhr.open('GET', 'https://webviewcrea.vercel.app/api/patchCSS', true);` +
      `xhr.setRequestHeader('target-url', ${JSON.stringify(targetUrl)});` +
      `xhr.onreadystatechange = function(){` +
        `if(xhr.readyState === 4 && xhr.status === 200){` +
          `var st = document.createElement('style');` +
          `st.type = 'text/css';` +
          `if(st.styleSheet){ st.styleSheet.cssText = xhr.responseText; }` +
          `else { st.appendChild(document.createTextNode(xhr.responseText)); }` +
          `document.getElementsByTagName('head')[0].appendChild(st);` +
        `}` +
      `};` +
      `xhr.send();` +
    `})();`;

    $link.replaceWith('<script type="text/javascript">' + clientScript + '</script>');
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
        const targetUrl = resolveUrl(src, baseUrl);
        const clientScript = `(function(){` +
          `var xhr = new XMLHttpRequest();` +
          `xhr.open('GET', 'https://webviewcrea.vercel.app/api/patchJS', true);` +
          `xhr.setRequestHeader('target-url', ${JSON.stringify(targetUrl)});` +
          `xhr.onreadystatechange = function(){` +
            `if(xhr.readyState === 4 && xhr.status === 200){` +
              `var sc = document.createElement('script');` +
              `sc.type = 'text/javascript';` +
              `try { sc.appendChild(document.createTextNode(xhr.responseText)); }` +
              `catch(e){ sc.text = xhr.responseText; }` +
              `document.getElementsByTagName('head')[0].appendChild(sc);` +
            `}` +
          `};` +
          `xhr.send();` +
        `})();`;
        $script.removeAttr('src');
        $script.text(clientScript);
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
  $('img[srcset]').each((_, elem) => {
    const $img = $(elem);
    const srcset = $img.attr('srcset');
    if (srcset) {
      const firstUrl = srcset.split(',')[0].trim().split(' ')[0];
      if (!$img.attr('src')) {
        $img.attr('src', firstUrl);
      }
    }
  });
  const jsonparch = '<script src="https://cdnjs.cloudflare.com/ajax/libs/json3/3.3.2/json3.min.js"></script>';
  const html5ShivScript = '<script src="https://cdnjs.cloudflare.com/ajax/libs/html5shiv/3.7.3/html5shiv.min.js"></script>\n';
  const coreJsScript = '<script src="https://cdnjs.cloudflare.com/ajax/libs/core-js/3.38.1/minified.js"></script>\n';
  const es5shims = '<script src="https://cdnjs.cloudflare.com/ajax/libs/es5-shim/4.6.7/es5-shim.min.js"></script><script src="https://cdnjs.cloudflare.com/ajax/libs/es5-shim/4.6.7/es5-sham.min.js"></script>';
  if ($('head').length > 0) {
    $('head').prepend(jsonparch+es5shims+html5ShivScript+coreJsScript+(await loadPolyfills()));
  } else {
    $.root().prepend(jsonparch+es5shims+html5ShivScript+coreJsScript+(await loadPolyfills()));
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
  let rawHtml = $.html();
  try {
    const minifiedHtml = await minify(rawHtml, {
      collapseWhitespace: true,
      conservativeCollapse: true,
      removeComments: true,
      removeRedundantAttributes: false,
      removeEmptyAttributes: false,
      caseSensitive: false,
      minifyCSS: false,
      minifyJS: false
    });
    return minifiedHtml;
  } catch (err) {
    console.error('Error min HTML:', err);
    return rawHtml;
  }
}
