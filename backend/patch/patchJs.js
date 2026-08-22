import babel from '@babel/core';

export default async function patchJs(jscode){
  const result = await babel.transformAsync(jscode, {
    presets: [
      [
        '@babel/preset-env',
        {
          targets: "ie >= 8, firefox >= 3.5, chrome >= 3, opera >= 10, safari >= 4, android >= 2.1",
          useBuiltIns: 'usage',
          corejs: '3.38',
          modules: 'auto',
          forceAllTransforms: true
        }
      ]
    ],
    configFile: false,
    babelrc: false
  });
  return result.code;
}
