import postcss from 'postcss';
import postcssPresetEnv from 'postcss-preset-env';
import postcssImport from 'postcss-import';
import postcssUrl from 'postcss-url';
import autoprefixer from 'autoprefixer';

const singleColonPlugin = () => {
  return {
    postcssPlugin: 'convert-single-colon',
    Rule(rule) {
      if (rule.selector.includes('::')) {
        rule.selector = rule.selector.replace(/::([a-zA-Z0-9-]+)/g, ':$1');
      }
    }
  };
};

export default async function patchCss(css, sourceUrl){
  if(sourceUrl && !css){
    let request = await fetch(sourceUrl);
    if(!request.ok){
      css = css || "";
    }
    css = await request.text();
  }
  const plugins = [
    postcssImport(),
    singleColonPlugin(),
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
  ];
  if(sourceUrl){
    plugins.push(postcssUrl({
      url: 'absolute',
      baseUrl: sourceUrl
    }));
  }
  const result = await postcss(plugins).process(css, { from: undefined });
  return result.css;
}
