module.exports = {
  env: {
    browser: true,
    es2021: true
  },
  extends: ['airbnb-base', 'prettier'], // 继承 eslint-config-prettier 的 rules 关闭 ESLint 中的涉及到 prettier 样式的规则
  plugins: ['prettier'], // 注册 eslint-plugin-prettier
  rules: {
    'prettier/prettier': 'error', // 打开该插件提供的规则，并且是作为eslint的一条规则运行
    'arrow-body-style': 'off',
    'prefer-arrow-callback': 'off'
  },
  // extends: ['airbnb-base', 'plugin:prettier/recommended'],
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module'
  }
}
