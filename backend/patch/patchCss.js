import postcss from 'postcss';
import postcssPresetEnv from 'postcss-preset-env';
import postcssImport from 'postcss-import';
import postcssUrl from 'postcss-url';
import autoprefixer from 'autoprefixer';
import postcssContextReference from '../postcsspls/postcssContextReference.js';
import cssnano from 'cssnano';
import userAgent from '../utils/UserAgent.js';

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

export default async function patchCss(css, sourceUrl, headers, context = {}){
  headers = { ...headers };
  delete headers["Connection"];
  delete headers["Keep-Alive"];
  delete headers["connection"];
  delete headers["keep-alive"]
  if(sourceUrl && !css){
    const baseHost = new URL(sourceUrl).hostname;
    let request = await fetch(sourceUrl, {
      headers: {
        ...headers,
        'host': baseHost,
        'origin': baseHost
      }
    });
    if(!request.ok){
      css = css || "";
    }else{
      css = await request.text();
    }
  }
  const plugins = [
    postcssImport(),
    postcssContextReference(context),
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
        grid: 'autoplace',
        cascade: false
      },
      features: {
        'custom-properties': { preserve: false },
        'nesting-rules': true,
        'hexadecimal-alpha-notation': true,
        'color-functional-notation': true,
        'gap-properties': true
      }
    }),
    singleColonPlugin()
  ];
  if(sourceUrl){
    plugins.push(postcssUrl({
      url: 'absolute',
      baseUrl: sourceUrl
    }));
  }
  plugins.push(cssnano({
    preset: ['default', {
      autoprefixer: false, 
      normalizePseudos: false,
      convertValues: false,
      discardUnused: false
    }]
  }));
  const result = await postcss(plugins).process(css, { from: undefined });
  return result.css;
}
