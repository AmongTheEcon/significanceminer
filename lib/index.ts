import * as pluralize from 'pluralize'

# The helpful guide for initially assembling this project:
# https://codeburst.io/https-chidume-nnamdi-com-npm-module-in-typescript-12b3b22f0724

/**
* @Method: Returns the plural form of any noun.
* @Param {string}
* @Return {string}
*/
export function getPlural (str: any) : string {
  return pluralize.plural(str)
}

