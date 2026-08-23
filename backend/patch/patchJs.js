import babel from '@babel/core';
import moduleResolver from 'babel-plugin-module-resolver';
import presetEnv from '@babel/preset-env';
import corejsCode from 'core-js-bundle/index.js';

export default async function patchJs(jscode, mapImport = {}, config = {}){
  const isInline = config.isInlineExpression ?? false;
  const result = await babel.transformAsync(jscode, {
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
          modules: 'auto',
          forceAllTransforms: true
        }
      ]
    ],
    plugins: [
      [
        moduleResolver,
        {
          alias: mapImport.imports || {}
        }
      ]
    ],
    configFile: false,
    babelrc: false
  });
  return `${corejsCode}\n${result.code}`;
}
