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

Format 格式化，简单来说就是变量后面是否需要空格，语句后面是否需要分号等，这一类无论如何改动，都不会影响代码运行结果的部分。对格式进行改变叫格式化。

源码，与格式相对的，是被修改之后会切实影响代码运行结果的部分。对源码进行改变叫源动作，当然格式化在某种意义上也是源动作。

codeActionsOnSave 是 VSCode 保存后的动作，按照上面的例子保存后将会执行一次 eslint 校验，随后调整 import 顺序，再执行 Format Code Action 格式化代码

而 formatOnSave 是 VSCode 默认提供的一个属性，属性可选值为 Boolean 类型，使用 editor.defaultFormatter 设置的格式化工具进行格式化（针对语言配置的优先于当前 settings.json 中全局配置的）

formatOnSave 先寻找工作区下 .vscode/settings.json 下是否有配置然后检查 user 目录全局中是否配置，如果都没有会按照编辑器设置中的 Editor: Format On Save 的结果决定是否保存后更改

[VSCode ESLint 的插件主页](https://marketplace.visualstudio.com/items?itemName=dbaeumer.vscode-eslint)有这样一段话

```
 Please also note that if you use ESLint as your default formatter you should turn off editor.formatOnSave when you have turned on editor.codeActionsOnSave. Otherwise you file gets fixed twice which in unnecessary.
```

请注意，如果你使用 ESLint 作为你的默认格式，当你打开 editor.codeActionsOnSave 时，你应该关闭 editor.formatOnSave。否则，你的文件会被修复两次，这是不必要的。

**运行时机**

由 Prettier 进行所有的 format ,然后再针对不同类型的文件使用各种的 Soruce action ,

## ESLint 与 prettier 相比有何不同

Linter 有两类规则：

格式化规则：例如：max-len , no-mixed-spaces-and-tabs , keyword-spacing , comma-style ...

通过使用 Prettier 减轻了对这一整类规则的需要! Prettier 将代码自动格式化成配置的样式。ESLint 就不需要对其进行检查格式化了。

代码质量规则：例如 no-unused-vars、no-extra-bind、no-implicit-globals、prefer-promise-reject-errors ...

Prettier 对这些规则没有任何帮助。它们也是 linter 提供的最重要的，因为它们可能会在您的代码中捕获真正的错误！

换句话说，使用 Prettier 进行格式化，使用 linter 来捕捉错误！

## 如何解决冲突问题

### 0. 关闭 formatOnSave 格式化以 ESlint 规则为准

```js
{
  "editor.formatOnSave": false,
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true,
  }
}
```

当然我们到时候希望样式格式化以 prettier 规则为准，因此这个方案不太能满足需求

### 1. 通过配置 eslint-config-prettier 与 eslint-plugin-prettier 解决

在 eslint 的生态中 eslint-config-x 用于配置规则 rule ，而 eslint-plugin-x 用于配置规则的插件。

- eslint-config-prettier：解决 ESLint 中的样式规范和 prettier 中样式规范的冲突，关闭 ESLint 中的涉及到 prettier 样式规范，使 ESLint 中的样式规范自动失效。
- eslint-plugin-prettier：通过调用 prettier 对代码风格进行检查。 并抛出错误，以便 ESLint 可以捕获它们。

### 2. 通过 prettier-eslint 解决
