/* eslint import/no-dynamic-require:0 */
import { oneLine } from 'common-tags'
import delve from 'dlv'
import getLogger from 'loglevel-colored-level-prefix'

const logger = getLogger({ prefix: 'prettier-eslint' })
const RULE_DISABLED = {}
const RULE_NOT_CONFIGURED = 'RULE_NOT_CONFIGURED'
const ruleValueExists = (prettierRuleValue) => prettierRuleValue !== RULE_NOT_CONFIGURED && prettierRuleValue !== RULE_DISABLED && typeof prettierRuleValue !== 'undefined'
const OPTION_GETTERS = {
  printWidth: {
    ruleValue: (rules) => getRuleValue(rules, 'max-len', 'code'),
    ruleValueToPrettierOption: getPrintWidth
  },
  tabWidth: {
    ruleValue: (rules) => {
      let value = getRuleValue(rules, 'indent')
      if (value === 'tab') {
        value = getRuleValue(rules, 'max-len', 'tabWidth')
      }
      return value
    },
    ruleValueToPrettierOption: getTabWidth
  },
  singleQuote: {
    ruleValue: (rules) => getRuleValue(rules, 'quotes'),
    ruleValueToPrettierOption: getSingleQuote
  },
  trailingComma: {
    ruleValue: (rules) => getRuleValue(rules, 'comma-dangle', []),
    ruleValueToPrettierOption: getTrailingComma
  },
  bracketSpacing: {
    ruleValue: (rules) => getRuleValue(rules, 'object-curly-spacing'),
    ruleValueToPrettierOption: getBracketSpacing
  },
  semi: {
    ruleValue: (rules) => getRuleValue(rules, 'semi'),
    ruleValueToPrettierOption: getSemi
  },
  useTabs: {
    ruleValue: (rules) => getRuleValue(rules, 'indent'),
    ruleValueToPrettierOption: getUseTabs
  },
  jsxBracketSameLine: {
    ruleValue: (rules) => getRuleValue(rules, 'react/jsx-closing-bracket-location', 'nonEmpty'),
    ruleValueToPrettierOption: getJsxBracketSameLine
  },
  arrowParens: {
    ruleValue: (rules) => getRuleValue(rules, 'arrow-parens'),
    ruleValueToPrettierOption: getArrowParens
  }
}

export { getESLintCLIEngine, getOptionsForFormatting, requireModule }

function getOptionsForFormatting(eslintConfig, prettierOptions = {}, fallbackPrettierOptions = {}, eslintPath) {
  const eslint = getRelevantESLintConfig(eslintConfig, eslintPath)
  const prettier = getPrettierOptionsFromESLintRules(eslintConfig, prettierOptions, fallbackPrettierOptions)
  return { eslint, prettier }
}

function getRelevantESLintConfig(eslintConfig, eslintPath) {
  const cliEngine = getESLintCLIEngine(eslintPath)
  const loadedRules =
    (cliEngine.getRules && cliEngine.getRules()) ||
    new Map([
      ['global-require', { meta: {} }],
      ['no-with', { meta: {} }]
    ])

  const { rules } = eslintConfig
  const relevantRules = Object.entries(rules).reduce((rulesAccumulator, [name, rule]) => {
    if (loadedRules.has(name)) {
      const {
        meta: { fixable }
      } = loadedRules.get(name)

      if (!fixable) {
        rule = ['off']
      }
    }

    rulesAccumulator[name] = rule
    return rulesAccumulator
  }, {})

  return {
    useEslintrc: false,
    baseConfig: {
      settings: eslintConfig.settings || {}
    },
    ...eslintConfig,
    rules: relevantRules,
    fix: true,
    globals: []
  }
}

function getPrettierOptionsFromESLintRules(eslintConfig, prettierOptions, fallbackPrettierOptions) {
  const { rules } = eslintConfig

  const prettierPluginOptions = getRuleValue(rules, 'prettier/prettier', [])

  if (ruleValueExists(prettierPluginOptions)) {
    prettierOptions = { ...prettierPluginOptions, ...prettierOptions }
  }

  return Object.keys(OPTION_GETTERS).reduce((options, key) => configureOptions(prettierOptions, fallbackPrettierOptions, key, options, rules), prettierOptions)
}

function configureOptions(prettierOptions, fallbackPrettierOptions, key, options, rules) {
  const givenOption = prettierOptions[key]
  const optionIsGiven = givenOption !== undefined

  if (optionIsGiven) {
    options[key] = givenOption
  } else {
    const { ruleValue, ruleValueToPrettierOption } = OPTION_GETTERS[key]
    const eslintRuleValue = ruleValue(rules)

    const option = ruleValueToPrettierOption(eslintRuleValue, fallbackPrettierOptions, rules)

    if (option !== undefined) {
      options[key] = option
    }
  }

  return options
}

function getPrintWidth(eslintValue, fallbacks) {
  return makePrettierOption('printWidth', eslintValue, fallbacks)
}

function getTabWidth(eslintValue, fallbacks) {
  return makePrettierOption('tabWidth', eslintValue, fallbacks)
}

function getSingleQuote(eslintValue, fallbacks) {
  let prettierValue

  if (eslintValue === 'single') {
    prettierValue = true
  } else if (eslintValue === 'double') {
    prettierValue = false
  } else if (eslintValue === 'backtick') {
    prettierValue = false
  } else {
    prettierValue = eslintValue
  }

  return makePrettierOption('singleQuote', prettierValue, fallbacks)
}

function getTrailingComma(eslintValue, fallbacks) {
  let prettierValue

  if (eslintValue === 'never') {
    prettierValue = 'none'
  } else if (typeof eslintValue === 'string' && eslintValue.indexOf('always') === 0) {
    prettierValue = 'es5'
  } else if (typeof eslintValue === 'object') {
    prettierValue = getValFromTrailingCommaConfig(eslintValue)
  } else {
    prettierValue = RULE_NOT_CONFIGURED
  }

  return makePrettierOption('trailingComma', prettierValue, fallbacks)
}

function getValFromTrailingCommaConfig(objectConfig) {
  const { arrays = '', objects = '', functions = '' } = objectConfig
  const fns = isAlways(functions)
  const es5 = [arrays, objects].some(isAlways)

  if (fns) {
    return 'all'
  } else if (es5) {
    return 'es5'
  } else {
    return 'none'
  }
}

function getBracketSpacing(eslintValue, fallbacks) {
  let prettierValue

  if (eslintValue === 'never') {
    prettierValue = false
  } else if (eslintValue === 'always') {
    prettierValue = true
  } else {
    prettierValue = eslintValue
  }

  return makePrettierOption('bracketSpacing', prettierValue, fallbacks)
}

function getSemi(eslintValue, fallbacks) {
  let prettierValue

  if (eslintValue === 'never') {
    prettierValue = false
  } else if (eslintValue === 'always') {
    prettierValue = true
  } else {
    prettierValue = eslintValue
  }

  return makePrettierOption('semi', prettierValue, fallbacks)
}

function getUseTabs(eslintValue, fallbacks) {
  let prettierValue

  if (eslintValue === 'tab') {
    prettierValue = true
  } else {
    prettierValue = RULE_NOT_CONFIGURED
  }

  return makePrettierOption('useTabs', prettierValue, fallbacks)
}

function getJsxBracketSameLine(eslintValue, fallbacks) {
  let prettierValue

  if (eslintValue === 'after-props') {
    prettierValue = true
  } else if (eslintValue === 'tag-aligned' || eslintValue === 'line-aligned' || eslintValue === 'props-aligned') {
    prettierValue = false
  } else {
    prettierValue = eslintValue
  }

  return makePrettierOption('jsxBracketSameLine', prettierValue, fallbacks)
}

function getArrowParens(eslintValue, fallbacks) {
  let prettierValue

  if (eslintValue === 'as-needed') {
    prettierValue = 'avoid'
  } else {
    prettierValue = eslintValue
  }

  return makePrettierOption('arrowParens', prettierValue, fallbacks)
}

function extractRuleValue(objPath, name, value) {
  if (objPath) {
    return delve(value, objPath, RULE_NOT_CONFIGURED)
  }
  return undefined
}

function getRuleValue(rules, name, objPath) {
  const ruleConfig = rules[name]

  if (Array.isArray(ruleConfig)) {
    const [ruleSetting, value] = ruleConfig
    if (ruleSetting === 0 || ruleSetting === 'off') {
      return RULE_DISABLED
    }
    if (typeof value === 'object') {
      return extractRuleValue(objPath, name, value)
    } else {
      return value
    }
  }

  return RULE_NOT_CONFIGURED
}

function isAlways(val) {
  return val.indexOf('always') === 0
}

function makePrettierOption(prettierRuleName, prettierRuleValue, fallbacks) {
  if (ruleValueExists(prettierRuleValue)) {
    return prettierRuleValue
  }

  const fallback = fallbacks[prettierRuleName]
  if (typeof fallback !== 'undefined') {
    return fallback
  }

  return undefined
}

function requireModule(modulePath, name) {
  try {
    return require(modulePath)
  } catch (error) {
    throw error
  }
}

function getESLintCLIEngine(eslintPath, eslintOptions) {
  const { CLIEngine } = requireModule(eslintPath, 'eslint')
  try {
    return new CLIEngine(eslintOptions)
  } catch (error) {
    throw error
  }
}
