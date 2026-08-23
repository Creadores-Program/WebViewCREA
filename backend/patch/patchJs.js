import babel from '@babel/core';
import moduleResolver from 'babel-plugin-module-resolver';
import presetEnv from '@babel/preset-env';
import * as esbuild from 'esbuild';

export default async function patchJs(jscode, mapImport = {}, config = {}){
  const isInline = config.isInlineExpression ?? false;
  const babelR = await babel.transformAsync(jscode, {
    parserOpts: {
      allowReturnOutsideFunction: isInline,
      allowSuperOutsideMethod: isInline
    },
    presets: [
      [
        presetEnv,
        {
          targets: "ie >= 8, firefox >= 3.5, chrome >= 3, opera >= 10, safari >= 4, android >= 2.1",
          useBuiltIns: 'usage',
          corejs: '3.38',
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
  const virtualInputPlugin = {
    name: 'virtual-entry',
    setup(build) {
      build.onResolve({ filter: /^entry$/ }, args => ({
        path: args.path,
        namespace: 'virtual'
      }));

      build.onLoad({ filter: /^entry$/, namespace: 'virtual' }, () => ({
        contents: babelR.code,
        loader: 'js',
        resolveDir: process.cwd()
      }));
    }
  };
  const bundled = await esbuild.build({
    entryPoints: ['entry'],
    bundle: true,
    write: false,
    format: 'iife',
    target: ['es5'],
    plugins: [virtualInputPlugin]
  });
  return bundled.outputFiles[0].text;
}
