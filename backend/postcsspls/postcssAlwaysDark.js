export const postcssAlwaysDark = () => {
  return {
    postcssPlugin: 'postcss-always-dark',
    AtRule: {
      media(atRule) {
        if (atRule.params.includes('prefers-color-scheme: dark')) {
          atRule.replaceWith(atRule.nodes);
        }
      }
    }
  };
};

postcssAlwaysDark.postcss = true;
