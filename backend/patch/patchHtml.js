import * as cheerio from 'cheerio';
import patchCss from './patchCss.js';
import patchJs from './patchJs.js';
import userAgent from '../utils/UserAgent.js';
import { minify } from 'html-minifier-terser';
import urlPolyfill from '../polyfills/url-polyfill.js';
import runtime from '../polyfills/runtime.js';
import fetchPoly from '../polyfills/fetch.js';
import uriPoly from '../polyfills/uriPoly.js';

const POLYFILLS = [
  uriPoly,
  runtime,
  urlPolyfill,
  fetchPoly
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
  delete headers["connection"];
  delete headers["keep-alive"];
  let headersNoCookie = { ...headers };
  delete headersNoCookie["cookie"];
  delete headersNoCookie["Cookie"];
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
  let contextCss = {};
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
        const promise = patchCss(cssContent, baseUrl, null, contextCss).then((patchedCss) => {
          $style.text(patchedCss);
        }).catch((err) =>{
          console.error(err);
        });
        stylePromises.push(promise);
      }
    }
  });
  $('link[rel="stylesheet"]').each((_, elem) => {
    const $link = $(elem);
    const url = $link.attr('href') || $link.attr('src');
    const urlP = resolveUrl(url, baseUrl);
    let headersLoc = headers;
    if(new URL(urlP).hostname != baseHost){
      headersLoc = headersNoCookie;
    }
    const promise = patchCss(null, urlP, headersLoc, contextCss).then((patchedCss) => {
      $link.replaceWith('<style type="text/css">/n'+patchedCss+"/n</style>");
    }).catch((err) =>{
      console.error(err);
    });
    stylePromises.push(promise);
  });
  $('[style]').each((_, elem) => {
    const $elem = $(elem);
    const inlineCss = $elem.attr('style');
    if (inlineCss && inlineCss.trim()) {
      const wrappedCss = `* { ${inlineCss} }`;
      const promise = patchCss(wrappedCss, baseUrl, null, contextCss).then((patchedCss) => {
        const match = patchedCss.match(/\*[\s]*\{([\s\S]*)\}/);
        if (match && match[1]) {
          $elem.attr('style', match[1].trim());
        }
      }).catch((err) =>{
        console.error(err);
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
        let headersLoc = headers;
        if(new URL(srcP).hostname != baseHost){
          headersLoc = headersNoCookie;
        }
        const promise = fetch(srcP, {
          headers: {
            'headers': headersLoc,
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
        }).catch((err) =>{
            console.error(err);
        });
        scriptPromises.push(promise);
        return;
      }
      if (jsContent && jsContent.trim()) {
        const promise = patchJs(jsContent, globalImportMap, { scriptUrl: baseUrl }).then((patchedJs) => {
          $script.text(patchedJs);
        }).catch((err) =>{
          console.error(err);
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
  const jsonparch = '<script type="text/javascript" src="https://cdn.jsdelivr.net/npm/json3/lib/json3.min.js" crossorigin="anonymous" referrerpolicy="no-referrer"></script>\n';
  const underscore = '<script type="text/javascript" src="https://cdnjs.cloudflare.com/ajax/libs/underscore.js/1.13.8/underscore-min.js" crossorigin="anonymous" referrerpolicy="no-referrer"></script>\n'
  const html5ShivScript = '<script type="text/javascript" src="https://cdnjs.cloudflare.com/ajax/libs/html5shiv/3.7.3/html5shiv.min.js" crossorigin="anonymous" referrerpolicy="no-referrer"></script>\n';
  const coreJsScript = '<script type="text/javascript" src="https://cdnjs.cloudflare.com/ajax/libs/core-js/3.50.0/minified.js" crossorigin="anonymous" referrerpolicy="no-referrer"></script>\n';
  const es5shims = '<script type="text/javascript" src="https://cdnjs.cloudflare.com/ajax/libs/es5-shim/4.6.7/es5-shim.min.js" crossorigin="anonymous" referrerpolicy="no-referrer"></script><script src="https://cdnjs.cloudflare.com/ajax/libs/es5-shim/4.6.7/es5-sham.min.js"  crossorigin="anonymous" referrerpolicy="no-referrer"></script>\n';
  const es6shims = '<script type="text/javascript" src="https://cdnjs.cloudflare.com/ajax/libs/es6-shim/0.35.8/es6-sham.min.js" crossorigin="anonymous" referrerpolicy="no-referrer"></script><script src="https://cdnjs.cloudflare.com/ajax/libs/es6-shim/0.35.8/es6-shim.min.js" crossorigin="anonymous" referrerpolicy="no-referrer"></script>\n';
  const normalizePoly = '<script type="text/javascript" src="https://cdn.jsdelivr.net/npm/unorm/lib/unorm.min.js"></script>\n';
  const interObserver = '<script type="text/javascript" src="https://cdn.jsdelivr.net/npm/intersection-observer/intersection-observer.min.js" crossorigin="anonymous" referrerpolicy="no-referrer"></script>\n';
  const resizeObserver = '<script type="text/javascript" src="https://cdn.jsdelivr.net/npm/resize-observer-polyfill/dist/ResizeObserver.min.js" crossorigin="anonymous" referrerpolicy="no-referrer"></script>\n';
  const dialogPoly = '<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/dialog-polyfill/0.5.6/dialog-polyfill.min.css">\n<script type="text/javascript" src="https://cdnjs.cloudflare.com/ajax/libs/dialog-polyfill/0.5.6/dialog-polyfill.min.js" crossorigin="anonymous" referrerpolicy="no-referrer"></script>\n';
  const customWeb = '<script type="text/javascript" src="https://cdn.jsdelivr.net/npm/@webcomponents/webcomponentsjs/webcomponents-bundle.min.js" crossorigin="anonymous" referrerpolicy="no-referrer"></script>\n';
  const dom4 = '<script type="text/javascript" src="https://cdnjs.cloudflare.com/ajax/libs/dom4/2.1.6/dom4.js" crossorigin="anonymous" referrerpolicy="no-referrer"></script>\n';
  const webStream = '<script type="text/javascript" src="https://cdn.jsdelivr.net/npm/web-streams-polyfill/dist/polyfill.es5.js" crossorigin="anonymous" referrerpolicy="no-referrer"></script>\n';
  const strScripts = loadPolyfills()+jsonparch+es5shims+es6shims+html5ShivScript+coreJsScript+normalizePoly+underscore+interObserver+resizeObserver+dialogPoly+customWeb+dom4+webStream;
  if ($('head').length > 0) {
    $('head').prepend(strScripts);
  } else {
    $.root().prepend(strScripts);
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
          .catch((err) => console.error(err));

        eventPromises.push(promise);
      }

      if ((attrName === 'href' || attrName === 'src') && attrValue.trim().toLowerCase().startsWith('javascript:')) {
        const jsCode = attrValue.trim().slice(11);
        if (jsCode.trim()) {
          const promise = patchJs(jsCode, globalImportMap, { isInlineExpression: true })
            .then((patchedJs) => {
              $(elem).attr(attrName, `javascript:${patchedJs}`);
            })
            .catch((err) => console.error(err));
          eventPromises.push(promise);
        }
      }
    }
  });
  await Promise.allSettled([...stylePromises, ...scriptPromises, ...eventPromises]);
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
