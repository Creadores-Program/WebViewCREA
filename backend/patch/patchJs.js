import babel from '@babel/core';
import presetEnv from '@babel/preset-env';

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
            var targetUrl = '${targetUrl}';
            var proxyUrl = '${PROXY_ENDPOINT}';
            
            var xhrGet = new XMLHttpRequest();
            xhrGet.open('GET', targetUrl, false);
            xhrGet.send(null);
            
            if (xhrGet.status >= 200 && xhrGet.status < 300) {
              var rawJs = xhrGet.responseText;
              
              var xhrPost = new XMLHttpRequest();
              xhrPost.open('POST', proxyUrl, false);
              xhrPost.setRequestHeader('Content-Type', 'text/javascript');
              xhrPost.send(rawJs);
              
              if (xhrPost.status >= 200 && xhrPost.status < 300) {
                var patchedCode = xhrPost.responseText;
                var module = { exports: {} };
                var exports = module.exports;
                
                (new Function('module', 'exports', patchedCode))(module, exports);
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
    minified: isInline,
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
      [es5SyncRemoteProxyPlugin, { mapImport, scriptUrl }]
    ],
    configFile: false,
    babelrc: false
  });

  let code = result.code;

  if (isInline) {
    code = code.replace(/[\r\n]+/g, ' ').trim();
  }

  return code;
}
