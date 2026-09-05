import postcss from 'postcss';

export const postcssContextReference = (context = {}) => {
  context.vars = context.vars || {};
  context.mixins = context.mixins || {};

  return {
    postcssPlugin: 'postcss-context-reference',

    Once(root) {
      root.walkDecls((decl) => {
        if (decl.prop.startsWith('--')) {
          context.vars[decl.prop] = decl.value;
        }
      });

      root.walkRules((rule) => {
        if (rule.selector.startsWith('.')) {
          const props = {};
          rule.walkDecls((d) => { props[d.prop] = d.value; });
          context.mixins[rule.selector] = props;
        }
      });
    },

    OnceExit(root) {
      root.walkDecls((decl) => {
        if (decl.value.includes('var(')) {
          Object.entries(context.vars).forEach(([varName, varVal]) => {
            if (decl.value.includes(varName)) {
              const regex = new RegExp(`var\\(${varName}\\)`, 'g');
              decl.value = decl.value.replace(regex, varVal);
            }
          });
        }

        if (decl.prop === '@apply' || decl.prop === 'composes') {
          const targetClass = decl.value.trim();
          const mixinProps = context.mixins[targetClass] || context.mixins['.' + targetClass];

          if (mixinProps) {
            Object.entries(mixinProps).forEach(([prop, val]) => {
              decl.parent.insertBefore(decl, { prop, value: val });
            });
            decl.remove();
          }
        }
      });
    }
  };
};

postcssContextReference.postcss = true;
