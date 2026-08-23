import babel from '@babel/core';
import moduleResolver from 'babel-plugin-module-resolver';
import presetEnv from '@babel/preset-env';

export default async function patchJs(jscode, mapImport = {}, config = {}){
  const isInline = config.isInlineExpression ?? false;
  const result = await babel.transformAsync(jscode, {
    compact: isInline ? true : false,
    minified: isInline ? true : false,
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
          modules: "umd",
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
  let code = result.code;

  if (isInline) {
    code = code.replace(/[\r\n]+/g, ' ').trim();
  }
  return result.code;
}
