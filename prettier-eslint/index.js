/* eslint no-console:0, global-require:0, import/no-dynamic-require:0 */
/* eslint complexity: [1, 13] */

import fs from 'fs'
import path from 'path'
import requireRelative from 'require-relative'
import prettyFormat from 'pretty-format'
import { oneLine, stripIndent } from 'common-tags'
import indentString from 'indent-string'
import getLogger from 'loglevel-colored-level-prefix'
import merge from 'lodash.merge'
import { getESLintCLIEngine, getOptionsForFormatting, requireModule } from './utils'

const logger = getLogger({ prefix: 'prettier-eslint' })

// CommonJS + ES6 modules... is it worth it? Probably not...
module.exports = format

function format(options) {
  const { logLevel = getDefaultLogLevel() } = options
  const {
    filePath,
    text = getTextFromFilePath(filePath),
    eslintPath = getModulePath(filePath, 'eslint'),
    prettierPath = getModulePath(filePath, 'prettier'),
    prettierLast,
    fallbackPrettierOptions
  } = options

  const eslintConfig = merge({}, options.eslintConfig, getESLintConfig(filePath, eslintPath))

  if (typeof eslintConfig.globals === 'object') {
    eslintConfig.globals = Object.entries(eslintConfig.globals).map(([key, value]) => `${key}:${value}`)
  }

  const prettierOptions = merge({}, filePath && { filepath: filePath }, getPrettierConfig(filePath, prettierPath), options.prettierOptions)

  const formattingOptions = getOptionsForFormatting(eslintConfig, prettierOptions, fallbackPrettierOptions, eslintPath)

  const eslintExtensions = eslintConfig.extensions || ['.js', '.jsx', '.ts', '.tsx', '.mjs', '.vue']
  const fileExtension = path.extname(filePath || '')

  const onlyPrettier = filePath ? !eslintExtensions.includes(fileExtension) : false

  const prettify = createPrettify(formattingOptions.prettier, prettierPath)

  if (onlyPrettier) {
    return prettify(text)
  }

  if (['.ts', '.tsx'].includes(fileExtension)) {
    formattingOptions.eslint.parser = formattingOptions.eslint.parser || require.resolve('@typescript-eslint/parser')
  }

  if (['.vue'].includes(fileExtension)) {
    formattingOptions.eslint.parser = formattingOptions.eslint.parser || require.resolve('vue-eslint-parser')
  }

  const eslintFix = createEslintFix(formattingOptions.eslint, eslintPath)

  if (prettierLast) {
    return prettify(eslintFix(text, filePath))
  }
  return eslintFix(prettify(text), filePath)
}

function createPrettify(formatOptions, prettierPath) {
  return function prettify(text) {
    const prettier = requireModule(prettierPath, 'prettier')
    try {
      const output = prettier.format(text, formatOptions)
      return output
    } catch (error) {
      throw error
    }
  }
}

function createEslintFix(eslintConfig, eslintPath) {
  return function eslintFix(text, filePath) {
    const cliEngine = getESLintCLIEngine(eslintPath, eslintConfig)
    try {
      const report = cliEngine.executeOnText(text, filePath, true)
      const [{ output = text }] = report.results
      return output
    } catch (error) {
      throw error
    }
  }
}

function getTextFromFilePath(filePath) {
  try {
    return fs.readFileSync(filePath, 'utf8')
  } catch (error) {
    throw error
  }
}

function getESLintConfig(filePath, eslintPath) {
  const eslintOptions = {}
  if (filePath) {
    eslintOptions.cwd = path.dirname(filePath)
  }
  const cliEngine = getESLintCLIEngine(eslintPath, eslintOptions)
  try {
    const config = cliEngine.getConfigForFile(filePath)
    return {
      ...eslintOptions,
      ...config
    }
  } catch (error) {
    return { rules: {} }
  }
}

function getPrettierConfig(filePath, prettierPath) {
  const prettier = requireModule(prettierPath, 'prettier')
  return (prettier.resolveConfig && prettier.resolveConfig.sync && prettier.resolveConfig.sync(filePath)) || {}
}

function getModulePath(filePath = __filename, moduleName) {
  try {
    return requireRelative.resolve(moduleName, filePath)
  } catch (error) {
    return require.resolve(moduleName)
  }
}

function getDefaultLogLevel() {
  return process.env.LOG_LEVEL || 'warn'
}
