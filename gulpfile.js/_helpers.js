"use strict"

const

{ src }         = require('gulp'),
fs              = require('fs'),
cleanUtility    = require('gulp-clean'),
log             = require('fancy-log')

exports.discoverPages = () => {
    let directoryStructure = fs.readdirSync('./@contents/views')

    // Categorize first, process afterwards
    let discoveredPages = directoryStructure
    .filter(item => item.includes('page'))
    .map((item) => {
        let extractedPageName = item.replace(/page\.public\.|page\.auth\.|page\./, '')
        let extractedPagePrefix = 'undefined'

        if(item.includes("public")) {
            extractedPagePrefix = 'page.public'
        } else if (item.includes("auth")) {
            extractedPagePrefix = 'page.auth'
        } else {
            extractedPagePrefix = 'page'
        }

        return { name:extractedPageName, prefix: extractedPagePrefix }
    });

    let discoveredPageNames = discoveredPages.map(item => item.name)
  
    log('Discovered', discoveredPageNames)
  
    return new Promise((resolve) => {
        resolve(discoveredPages)
    });
}

exports.clean = (dirs = []) => {
    if(dirs.length === 0) {
        dirs = [
            './@contents/_cache/*',
            './@contents/@exported_html/*',
            './@contents/@exported_css/*',
            './@contents/@exported_js/*'
        ]
    }
    return src(dirs, {read: false}).pipe(cleanUtility())
}

exports.replaceAndCapitalizeDotsSeparator = (str) => {
    return str
    .toLowerCase()
    .split('.')
    .map((substr, i) => i === 0 ? substr : substr.charAt(0).toUpperCase() + substr.substring(1))
    .join('');
}
