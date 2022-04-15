# eslint-vs-prettier

## eslint 与 prettier 共用会产生冲突

打开 src/index.js 的时候连续自动保存时会发现一个问题。

<img width="343" alt="image" src="https://user-images.githubusercontent.com/40495740/163502116-69707610-8a85-431f-9439-c249173c032b.png">

原因是 eslint 格式好的文件由于 prettier 配置与 eslint 冲突被再次格式化，图中问题是 eslint 要求行尾保留分号，而 prettier 则不允许行尾保留分号。

## VSCode settings 配置

.vscode/settings.json

```js
{
  // 文件：文件自动保存，只要暂停输入
  "files.autoSave": "afterDelay",

  // 编辑器：保存时候的动作
  "editor.codeActionsOnSave": {
    // 保存的时候执行一次eslint校验
    "source.fixAll.eslint": true,
    // 保存的时候调整import顺序，按引入包字母顺序
    "source.organizeImports": true,

    // 执行额外的 Action
    // 使用 Format Code Action 进行格式化
    "source.formatDocument": true,
    // 使用 Format Code Action 对修改部分进行格式化
    "source.formatModified": true
  },

  //   编辑器：保存即格式化
    // "editor.formatOnSave": true,

  // 编辑器：设置默认格式化工具 有了这个就不用每个类型的文件都设置一个格式化工具，大部分用prettier，只有特殊情况需要单独设置
  "editor.defaultFormatter": "esbenp.prettier-vscode"
}
```

其中涉及到保存文件后的两个属性（codeActionsOnSave,formatOnSave）

也分别对应了 Format 和 Source Action

<img width="297" alt="image" src="https://user-images.githubusercontent.com/40495740/163506206-c99feff6-399f-412f-8b28-cbee568f77e7.png">

Format：格式化，简单来说就是变量后面是否需要空格，语句后面是否需要分号等，这一类无论如何改动，都不会影响代码运行结果的部分。对格式进行改变叫格式化。

Source Action：源代码操作，源代码操作还可以使代码被修改之后会切实影响代码运行结果比如 `organizeImports` ，`fixAll.eslint` . 当然格式化在某种意义上也是源动作，可以通过 Format Code Action 格式化代码

codeActionsOnSave 是 VSCode 保存后的执行的源代码，按照上面的例子保存后将会执行一次 eslint 校验，随后调整 import 顺序，再执行 Format Code Action 格式化代码

而 formatOnSave 是 VSCode 默认提供的一个属性，属性可选值为 Boolean 类型，使用 editor.defaultFormatter 设置的格式化工具进行格式化（针对语言配置的优先于当前 settings.json 中全局配置的）

formatOnSave 先寻找工作区下 .vscode/settings.json 下是否有配置然后检查 user 目录全局中是否配置，如果都没有会按照编辑器设置中的 Editor: Format On Save 的结果决定是否保存后更改

**运行时机**

由 Prettier 进行所有的 format , 同时再针对不同类型的文件使用各种的 Soruce action ，由于不同格式化程序执行时长不一样，导致文件格式好后和预期不符。

常见格式程序执行时长（自测得出）：

prettier > default > eslint

意味着通常情况下 Prettier 最后执行完毕。代码样式就由 Prettier 决定了。如果你既用了 ESLint 又用了 Prettier，在 ESLint 格式化好后，再 Prettier 格式化不就闪烁了吗？

## ESLint 与 prettier 相比有何不同

Linter 有两类规则：

格式化规则：例如：max-len , no-mixed-spaces-and-tabs , keyword-spacing , comma-style ...

通过使用 Prettier 减轻了对这一整类规则的需要! Prettier 将代码自动格式化成配置的样式。ESLint 就不需要对其进行检查格式化了。

代码质量规则：例如 no-unused-vars、no-extra-bind、no-implicit-globals、prefer-promise-reject-errors ...

Prettier 对这些规则没有任何帮助。它们也是 linter 提供的最重要的，因为它们可能会在您的代码中捕获真正的错误！

换句话说，使用 Prettier 进行格式化，使用 linter 来捕捉错误！

## 如何解决冲突问题

### 1. 通过配置 eslint-config-prettier 与 eslint-plugin-prettier 解决

在 eslint 的生态中 eslint-config-x 用于配置规则 rule ，而 eslint-plugin-x 用于配置规则的插件。

- eslint-config-prettier：解决 ESLint 中的样式规范和 prettier 中样式规范的冲突，关闭 ESLint 中的涉及到 prettier 样式规范，使 ESLint 中的样式规范自动失效。
- eslint-plugin-prettier：通过调用 prettier 的规则对代码风格进行检查。 并抛出错误，以便 ESLint 可以捕获它们。

eslint-plugin-prettier 通过实现 ESLint 插件，为 ESLint 扩展了 prettier 的能力

还可以简化配置

```js
{
  "extends": [
    "plugin:prettier/recommended",
  ],
}
```

即以下配置的简写

```js
{
  extends: ['prettier'], // 继承 eslint-config-prettier 的 rules 关闭 ESLint 中的涉及到 prettier 样式的规则
  plugins: ['prettier'], // 注册 eslint-plugin-prettier
  rules: {
    'prettier/prettier': 'error', // 打开该插件提供的规则，并且是作为eslint的一条规则运行
    'arrow-body-style': 'off',
    'prefer-arrow-callback': 'off'
  },
};
```

[VSCode ESLint 的插件主页](https://marketplace.visualstudio.com/items?itemName=dbaeumer.vscode-eslint)有这样一段话

```
 Please also note that if you use ESLint as your default formatter you should turn off editor.formatOnSave when you have turned on editor.codeActionsOnSave. Otherwise you file gets fixed twice which in unnecessary.
```

请注意，如果你使用 ESLint 作为你的默认格式，当你打开 editor.codeActionsOnSave 时，你应该关闭 editor.formatOnSave。否则，你的文件会被修复两次，这是不必要的。

修改 .vscode/settings.json 中的配置

```js
{
  "editor.formatOnSave": false,
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true,
  }
}
```

开发的时候使用 Prettier 插件提供的规则进行检查 , 可以配套搭配 Prettier 插件直接格式化 , 如此在我们保存文件时，ESLint 会使用 Prettier 插件提供的规则自动进行格式化（执行 Fix）。

### 2. 通过 Prettier-ESLint 解决

Prettier-ESLint 插件是仅用于格式化代码的 Formatter ，默认通过 Prettier 先对代码进行格式化，再将结果传递给 eslint --fix.

```js
function format(options) {
  const { logLevel = getDefaultLogLevel() } = options

  // 读取配置 , 如果没有配置，则使用默认配置
  const {
    filePath,
    text = getTextFromFilePath(filePath),
    eslintPath = getModulePath(filePath, 'eslint'),
    prettierPath = getModulePath(filePath, 'prettier'),
    prettierLast,
    fallbackPrettierOptions
  } = options

  // 合并默认配置和用户配置
  const eslintConfig = merge({}, options.eslintConfig, getESLintConfig(filePath, eslintPath))
  if (typeof eslintConfig.globals === 'object') {
    eslintConfig.globals = Object.entries(eslintConfig.globals).map(([key, value]) => `${key}:${value}`)
  }
  const prettierOptions = merge({}, filePath && { filepath: filePath }, getPrettierConfig(filePath, prettierPath), options.prettierOptions)
  const formattingOptions = getOptionsForFormatting(eslintConfig, prettierOptions, fallbackPrettierOptions, eslintPath)
  const eslintExtensions = eslintConfig.extensions || ['.js', '.jsx', '.ts', '.tsx', '.mjs', '.vue']
  const fileExtension = path.extname(filePath || '')
  const onlyPrettier = filePath ? !eslintExtensions.includes(fileExtension) : false

  // 创建一个 Prettier 格式化执行器
  const prettify = createPrettify(formattingOptions.prettier, prettierPath)

  if (onlyPrettier) {
    return prettify(text)
  }

  // 对不同类型进行 AST 转换
  if (['.ts', '.tsx'].includes(fileExtension)) {
    formattingOptions.eslint.parser = formattingOptions.eslint.parser || require.resolve('@typescript-eslint/parser')
  }

  if (['.vue'].includes(fileExtension)) {
    formattingOptions.eslint.parser = formattingOptions.eslint.parser || require.resolve('vue-eslint-parser')
  }

  // 创建一个 eslint --fix 执行器
  const eslintFix = createEslintFix(formattingOptions.eslint, eslintPath)

  if (prettierLast) {
    return prettify(eslintFix(text, filePath))
  }

  // 使用 eslint --fix 格式化 Prettier 格式化后的代码
  return eslintFix(prettify(text), filePath)
}
```



## 最佳实践

prettier.config.js 配置你的风格化规则

```js
module.exports = {
  printWidth: 200, // 设置prettier单行输出（不折行）的（最大）长度
  tabWidth: 2, // 设置工具每一个水平缩进的空格数
  useTabs: false, // 使用tab（制表位）缩进而非空格
  semi: false, // 在语句末尾添加分号
  singleQuote: true, // 使用单引号而非双引号
  jsxSingleQuote: false, // jsx 不使用单引号，而使用双引号
  trailingComma: 'none', // 在任何可能的多行中输入尾逗号
  bracketSpacing: true, // 在对象字面量声明所使用的的花括号后（{）和前（}）输出空格
  jsxBracketSameLine: true, // 在多行JSX元素最后一行的末尾添加 > 而使 > 单独一行（不适用于自闭和元素）
  arrowParens: 'always', // 为单行箭头函数的参数添加圆括号，参数个数为1时可以省略圆括号
  rangeStart: 0, // 只格式化某个文件的一部分
  rangeEnd: Infinity, // 只格式化某个文件的一部分
  filepath: 'none', // 指定文件的输入路径，这将被用于解析器参照
  requirePragma: false, // (v1.7.0+) Prettier可以严格按照按照文件顶部的一些特殊的注释格式化代码，这些注释称为“require pragma”(必须杂注)
  insertPragma: false, //  (v1.8.0+) Prettier可以在文件的顶部插入一个 @format的特殊注释，以表明改文件已经被Prettier格式化过了。
  proseWrap: 'preserve' // (v1.8.2+)
}
```

.eslintrc.js 配置 lint 检查规则, 搭配 eslint-config-prettier 与 eslint-plugin-prettier ，移除 eslint 原有配置中风格化规则，使用 Prettier 插件提供的规则

```js
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
```

.vscode/settings.json 配置自动保存后的行为

```js
{
  // 文件：文件自动保存，只要暂停输入
  "files.autoSave": "afterDelay",

  // 编辑器：保存时候的动作
  "editor.codeActionsOnSave": {
    // 保存的时候执行一次eslint校验
    "source.fixAll.eslint": true,
  },

  //   编辑器：保存即格式化
  "editor.formatOnSave": false,

  // 编辑器：设置默认格式化工具 有了这个就不用每个类型的文件都设置一个格式化工具，大部分用prettier，只有特殊情况需要单独设置
  "editor.defaultFormatter": "esbenp.prettier-vscode",

  // 针对特定语言规定格式化工具
  "[javascript]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode"
  }
}

```
