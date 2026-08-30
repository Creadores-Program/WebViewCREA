import babel from '@babel/core';
import presetEnv from '@babel/preset-env';
import { minify } from 'terser';

function legacyDomApiPlugin({ types: t }) {
  return {
    visitor: {
      CallExpression(path) {
        const { callee, arguments: args } = path.node;

        if (
          t.isMemberExpression(callee) &&
          t.isIdentifier(callee.property, { name: 'setProperty' }) &&
          t.isMemberExpression(callee.object) &&
          t.isIdentifier(callee.object.property, { name: 'style' })
        ) {
          const targetElementStyle = callee.object;
          const propName = args[0];
          const propValue = args[1];

          path.replaceWith(
            t.assignmentExpression(
              '=',
              t.memberExpression(targetElementStyle, propName, true),
              propValue
            )
          );
          return;
        }

        if (
          t.isMemberExpression(callee) &&
          t.isIdentifier(callee.property, { name: 'removeProperty' }) &&
          t.isMemberExpression(callee.object) &&
          t.isIdentifier(callee.object.property, { name: 'style' })
        ) {
          const targetElementStyle = callee.object;
          const propName = args[0];

          path.replaceWith(
            t.assignmentExpression(
              '=',
              t.memberExpression(targetElementStyle, propName, true),
              t.stringLiteral('')
            )
          );
          return;
        }

        if (
          t.isMemberExpression(callee) &&
          t.isIdentifier(callee.property, { name: 'add' }) &&
          t.isMemberExpression(callee.object) &&
          t.isIdentifier(callee.object.property, { name: 'classList' })
        ) {
          const element = callee.object.object;
          const className = args[0];

          path.replaceWith(
            t.assignmentExpression(
              '+=',
              t.memberExpression(element, t.identifier('className')),
              t.binaryExpression('+', t.stringLiteral(' '), className)
            )
          );
          return;
        }
      }
    }
  };
}

function es5SyncRemoteProxyPlugin({ types: t }, options) {
  const { mapImport = {}, scriptUrl = '' } = options;
  const PROXY_ENDPOINT = 'https://webviewcrea.vercel.app/api/patchJS';

  function getTargetUrl(source) {
    let resolved = mapImport.imports?.[source] || source;
    if ((resolved.startsWith('./') || resolved.startsWith('../')) && scriptUrl) {
      try {
        resolved = new URL(resolved, scriptUrl).href;
      } catch (e) {}
    }
    return resolved;
  }

  return {
    visitor: {
      ImportDeclaration(path) {
        const targetUrl = getTargetUrl(path.node.source.value);
        const specifiers = path.node.specifiers;

        let polyfillCode = `
          (function() {
            if (typeof window === 'undefined') { window = this; }
            var targetUrl = '${targetUrl}';
            var proxyUrl = '${PROXY_ENDPOINT}';
            
            var xhrGet = new (window.XMLHttpRequest || ActiveXObject)('MSXML2.XMLHTTP.3.0');
            xhrGet.open('GET', targetUrl, false);
            try { xhrGet.send(null); } catch(e) {}
            
            if (xhrGet.status >= 200 && xhrGet.status < 300) {
              var rawJs = xhrGet.responseText;
              
              var xhrPost = new (window.XMLHttpRequest || ActiveXObject)('MSXML2.XMLHTTP.3.0');
              xhrPost.open('POST', proxyUrl, false);
              try {
                xhrPost.setRequestHeader('Content-Type', 'text/javascript');
                xhrPost.send(rawJs);
              } catch(e) {}
              
              if (xhrPost.status >= 200 && xhrPost.status < 300) {
                var patchedCode = xhrPost.responseText;
                var module = { exports: {} };
                var exports = module.exports;
                
                var execFn = new Function('module', 'exports', patchedCode);
                execFn(module, exports);
        `;

        specifiers.forEach(spec => {
          if (t.isImportDefaultSpecifier(spec)) {
            polyfillCode += `var ${spec.local.name} = module.exports.default || module.exports;`;
          } else if (t.isImportSpecifier(spec)) {
            const importedName = spec.imported.name;
            polyfillCode += `var ${spec.local.name} = module.exports.${importedName};`;
          } else if (t.isImportNamespaceSpecifier(spec)) {
            polyfillCode += `var ${spec.local.name} = module.exports;`;
          }
        });

        polyfillCode += `
              }
            }
          })();
        `;

        const parsedAst = babel.parseSync(polyfillCode, {
          configFile: false,
          babelrc: false,
          parserOpts: {
            allowReturnOutsideFunction: true
          }
        });

        path.replaceWithMultiple(parsedAst.program.body);
      }
    }
  };
}

export default async function patchJs(jscode, mapImport = {}, config = {}) {
  const isInline = config.isInlineExpression ?? false;
  const scriptUrl = config.scriptUrl || '';

  const result = await babel.transformAsync(jscode, {
    compact: isInline,
    comments: false,
    parserOpts: {
      allowReturnOutsideFunction: isInline,
      allowSuperOutsideMethod: isInline
    },
    presets: [
      [
        presetEnv,
        {
          targets: "ie >= 8, firefox >= 3.5, chrome >= 3, opera >= 10, safari >= 4, android >= 2.1",
          useBuiltIns: false,
          modules: false,
          forceAllTransforms: true
        }
      ]
    ],
    plugins: [
      legacyDomApiPlugin,
      [es5SyncRemoteProxyPlugin, { mapImport, scriptUrl }]
    ],
    configFile: false,
    babelrc: false
  });

  let code = result.code;

  try {
    const minified = await minify(code, {
      ecma: 5,
      ie8: true,
      safari10: true,
      compress: {
        ecma: 5,
        warnings: false,
        comparisons: false,
        inline: 2,
        keep_infinity: true
      },
      mangle: {
        ie8: true
      },
      output: {
        ecma: 5,
        quote_keys: true,
        ascii_only: true,
        comments: false,
        ie8: true
      }
    });

    if (minified.code) {
      code = minified.code;
    }
  } catch (err) {
    console.error("Error minificando con Terser:", err);
  }

  if (isInline) {
    code = code.replace(/[\r\n]+/g, ' ').trim();
  }

  return code;
}
