import postcss from 'postcss';
import postcssPresetEnv from 'postcss-preset-env';
import postcssPseudoelements from 'postcss-pseudoelements';
import autoprefixer from 'autoprefixer';

export default async function patchCss(css){
  const result = await postcss([
    postcssPseudoelements({ 
      single: true
    }),
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
    })
  ]).process(css, { from: undefined });
  return result.css;
}
