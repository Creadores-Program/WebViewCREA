import * as cheerio from 'cheerio';
import patchCss from './patchCss.js';
import patchJs from './patchJs.js';
import userAgent from '../utils/UserAgent.js';
import { minify } from 'html-minifier-terser';
import urlPolyfill from '../polyfills/url-polyfill.js';
import customEventPoly from '../polyfills/customEventPoly.js';
import runtime from '../polyfills/runtime.js';

const POLYFILLS = [
  customEventPoly,
  runtime,
  urlPolyfill,
].join("\n\n");

function loadPolyfills(){
  return '<script type="text/javascript">\n'+POLYFILLS+'\n</script>\n';
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
  headers = { ...headers };
  delete headers["Connection"];
  delete headers["Keep-Alive"];
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
  let cssCounter = 0;
  $('link[rel="stylesheet"]').each((_, elem) => {
    const $link = $(elem);
    const rawUrl = $link.attr('href') || $link.attr('src');
    if (!rawUrl) return;

    cssCounter++;
    const styleId = 'patch-css-' + cssCounter;
    const targetUrl = resolveUrl(rawUrl, baseUrl);
    const clientScript = `(function(){` +
      `var xhrFetch = new XMLHttpRequest();` +
      `xhrFetch.open('GET', ${JSON.stringify(targetUrl)}, true);` +
      `xhrFetch.onreadystatechange = function(){` +
        `if(xhrFetch.readyState === 4 && xhrFetch.status === 200){` +
          `var originalCss = xhrFetch.responseText;` +
          `var xhrPost = new XMLHttpRequest();` +
          `xhrPost.open('POST', 'https://webviewcrea.vercel.app/api/patchCSS', true);` +
          `xhrPost.setRequestHeader('Content-Type', 'text/css');` +
          `xhrPost.onreadystatechange = function(){` +
            `if(xhrPost.readyState === 4 && xhrPost.status === 200){` +
              `var el = document.getElementById(${JSON.stringify(styleId)});` +
              `if(el){` +
                `try { el.innerHTML = xhrPost.responseText; }` +
                `catch(e){` +
                  `if(el.styleSheet){ el.styleSheet.cssText = xhrPost.responseText; }` +
                `}` +
              `}` +
            `}` +
          `};` +
          `xhrPost.send(originalCss);` +
        `}` +
      `};` +
      `xhrFetch.send();` +
    `})();`;

    $link.replaceWith(
      `<style id="${styleId}" type="text/css"></style>` +
      `<script type="text/javascript">${clientScript}</script>`
    );
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
            `var xhrFetch = new XMLHttpRequest();` +
            `xhrFetch.open('GET', ${JSON.stringify(targetUrl)}, true);` +
            `xhrFetch.onreadystatechange = function(){` +
                `if(xhrFetch.readyState === 4 && xhrFetch.status === 200){` +
                    `var originalJs = xhrFetch.responseText;` +
                    `var xhrPost = new XMLHttpRequest();` +
                    `xhrPost.open('POST', 'https://webviewcrea.vercel.app/api/patchJS', true);` +
                    `xhrPost.setRequestHeader('Content-Type', 'application/javascript');` +
                    `xhrPost.onreadystatechange = function(){` +
                        `if(xhrPost.readyState === 4 && xhrPost.status === 200){` +
                            `var sc = document.createElement('script');` +
                            `sc.type = 'text/javascript';` +
                            `try { sc.appendChild(document.createTextNode(xhrPost.responseText)); }` +
                            `catch(e){ sc.text = xhrPost.responseText; }` +
                            `(document.getElementsByTagName('head')[0] || document.documentElement).appendChild(sc);` +
                        `}` +
                    `};` +
                    `xhrPost.send(originalJs);` +
                `}` +
            `};` +
            `xhrFetch.send();` +
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
    $('head').prepend(jsonparch+es5shims+html5ShivScript+coreJsScript+loadPolyfills());
  } else {
    $.root().prepend(jsonparch+es5shims+html5ShivScript+coreJsScript+loadPolyfills());
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
