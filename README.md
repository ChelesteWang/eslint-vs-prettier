# eslint-vs-prettier

## eslint 与 prettier 共用会产生冲突

打开 src/index.js 的时候会发现这个问题

<img width="343" alt="image" src="https://user-images.githubusercontent.com/40495740/163502116-69707610-8a85-431f-9439-c249173c032b.png">


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
  //   "editor.formatOnSave": true,

  // 编辑器：设置默认格式化工具 有了这个就不用每个类型的文件都设置一个格式化工具，大部分用prettier，只有特殊情况需要单独设置
  "editor.defaultFormatter": "esbenp.prettier-vscode"
}
```

其中涉及到保存文件后的两个属性（codeActionsOnSave,formatOnSave）

codeActionsOnSave 是 VSCode 保存后的动作，按照上面的例子保存后将会执行一次 eslint 校验，随后调整 import 顺序，再执行 Format Code Action 格式化代码

而 formatOnSave 是 VSCode 默认提供的一个属性，属性可选值为 Boolean 类型，使用 editor.defaultFormatter 设置的格式化工具进行格式化

[VSCode ESLint 的插件主页](https://marketplace.visualstudio.com/items?itemName=dbaeumer.vscode-eslint)有这样一段话

```
 Please also note that if you use ESLint as your default formatter you should turn off editor.formatOnSave when you have turned on editor.codeActionsOnSave. Otherwise you file gets fixed twice which in unnecessary.
```

请注意，如果你使用 ESLint 作为你的默认格式，当你打开 editor.codeActionsOnSave 时，你应该关闭 editor.formatOnSave。否则，你的文件会被修复两次，这是不必要的。

**运行时机**

由 Prettier 进行所有的 format ,然后再针对不同类型的文件使用各种的 Soruce action ,

## eslint 与 prettier 不同分析

- eslint-config-prettier：解决 ESLint 中的样式规范和 prettier 中样式规范的冲突，以 prettier 的样式规范为准，使 ESLint 中的样式规范自动失效。对应 eslintrc 配置 extends-"prettier"
- eslint-plugin-prettier：将 prettier 样式规范作为 ESLint 规范来使用，同样将格式问题以 error 的形式抛出，即 rule-"prettier/prettier"，可在 rules-"prettier/prettier"中进行自定义配置。对应 eslintrc 配置 plugin-"prettier"



## ESLint 与 prettier 相比有何不同

Linter 有两类规则：

格式化规则：例如：max-len , no-mixed-spaces-and-tabs , keyword-spacing , comma-style ...

Prettier 减轻了对这一整类规则的需求！Prettier 将以一致的方式从头开始重新打印整个程序，因此程序员不可能再在那里犯错误了 :)

代码质量规则：例如 no-unused-vars、no-extra-bind、no-implicit-globals、prefer-promise-reject-errors ...

Prettier 对这些规则没有任何帮助。它们也是 linter 提供的最重要的，因为它们可能会在您的代码中捕获真正的错误！

换句话说，使用 Prettier 进行格式化，使用 linter 来捕捉错误！
