import postcss from 'postcss';
import postcssPresetEnv from 'postcss-preset-env';
import autoprefixer from 'autoprefixer';

export default async function patchCss(css){
  return await postcss([
    postcssPresetEnv({
      stage: 0,
      browsers: [
        "ie >= 8",
        "firefox >= 3.5",
        "chrome >= 3",
        "opera >= 10",
        "safari >= 4",
        "android >= 2.1"
      ],
      autoprefixer: {
        grid: 'autoplace'
      },
      features: {
        'pseudo-elements-single-colon': true,
        'custom-properties': { preserve: false }
      }
    }),
    autoprefixer({
      overrideBrowserslist: [
        "ie >= 8",
        "firefox >= 3.5",
        "chrome >= 3",
        "opera >= 10",
        "safari >= 4",
        "android >= 2.1"
      ],
      grid: 'autoplace'
    })
  ]).process(css, { from: undefined });
}
