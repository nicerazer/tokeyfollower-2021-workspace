"use strict"

let

{ discoverPages, replaceAndCapitalizeDotsSeparator }  = require('./_helpers'),
{ src, dest }           = require('gulp'),
twig                    = require('gulp-twig'),
rename                  = require('gulp-rename'),
replace                 = require('gulp-replace'),
prettyHtml              = require('gulp-pretty-html'),

log                     = require('fancy-log'),
fs                      = require('fs'),
browserSync             = require('browser-sync').create()

exports.twigify = (cb) => {
    browserSync.notify("Compiling, please wait!", 3000);

    try {
        compileAllPages(() => {
            log(`\x1b[33mCompilation completed`);
            cb();
        })
    } catch (error) {        
        log(`\x1b[33mCompilation incomplete!`);
        cb(error);
    }
}

async function compileAllPages(cb) {

    await discoverPages().then(async pages => {
        for (const page of pages) {

            log(`Compiling Inner Twig: \x1b[33m${page.name}`);
            await _innerTwigify(page.name, page.prefix)
            .then(() => {

                log(`Compiling Outer Twig: \x1b[33m${page.name}`);
                return _outerTwigify(page.name, page.prefix);

            });
            
        }
    });

}

/** Page prefix seperated by comma */
function _innerTwigify(pageName, pagePrefix) {
    const parsedJsonData = JSON.parse(fs.readFileSync(`./@contents/views/${pagePrefix}.${pageName}/.json`));

    return __embedTwig(
        `./@contents/views/${pagePrefix}.${pageName}/.twig`,
        `{{ ${replaceAndCapitalizeDotsSeparator(pageName)}Text }}`,
        `./@contents/views/${pagePrefix}.${pageName}/.html`,

        { basename: pageName, prefix: `${pagePrefix}.`, suffix: '.inner.embedded', extname: '.twig' }
    ).then(() => { return __parseTwig(
        `./@contents/_cache/${pagePrefix}.${pageName}.inner.embedded.twig`,
        './@contents/_cache',

        { data: parsedJsonData },
        { basename: pageName, prefix: `${pagePrefix}.`, suffix: '.inner.twigged', extname: '.html' }
    ); });
}

function _outerTwigify(pageName, pagePrefix) {
    const { twigFunctions } = require('./@contents/twigFunctions');
    const parsedJsonData = JSON.parse(fs.readFileSync(`./@contents/views/commons.json`));
  
    return __embedTwig(
        './@contents/views/layout.app.twig',
        '{{ content }}',
        `./@contents/_cache/${pagePrefix}.${pageName}.inner.twigged.html`,
        { basename: pageName, prefix: `${pagePrefix}.`, suffix: '.outer.embedded', extname: '.twig' }
    ).then(() => { return __parseTwig(
        `./@contents/_cache/${pagePrefix}.${pageName}.outer.embedded.twig`,
        './@contents/@exported_html',
        { data: parsedJsonData, functions: twigFunctions },
        { basename: pageName, extname: '.html' }
    ); });
}


/**
 * @param  {String} sourceTwigPath
 * @param  {String} replaceTargetText
 * @param  {String} replaceSubjectPath
 * @param  {Object} renameDetailsObject
 */
function __embedTwig(sourceTwigPath, replaceTargetText, replaceSubjectPath, renameDetailsObject) {
    const parsedJsonPageHtml = fs.readFileSync(replaceSubjectPath).toString();

    return new Promise((resolve, reject) => {
    src(sourceTwigPath)
        .pipe(replace(replaceTargetText, parsedJsonPageHtml))
        .pipe(rename(renameDetailsObject))
        .pipe(dest('./@contents/_cache'))
        .on('finish', () => { resolve(); })
        .on('error', () => { reject(); });
    });
}

/**
 * @param  {String} sourceTwigPath
 * @param  {String} destinationPath
 * @param  {Object} twigDetailsObject
 * @param  {Object} renameDetailsObject
 */
function __parseTwig(sourceTwigPath, destinationPath, twigDetailsObject, renameDetailsObject) {
    return new Promise((resolve, reject) => {
        src(sourceTwigPath)
        .pipe(twig(twigDetailsObject))
        .pipe(prettyHtml())
        .pipe(rename(renameDetailsObject))
        .pipe(dest(destinationPath))
        .on('finish', () => { resolve(); })
        .on('error', () => { reject(); });
    });
}
  
/** Page prefix seperated by comma */
function _innerTwigify(pageName, pagePrefix) {
    const parsedJsonData = JSON.parse(fs.readFileSync(`./@contents/views/${pagePrefix}.${pageName}/.json`));
    return __embedTwig(
        `./@contents/views/${pagePrefix}.${pageName}/.twig`,
        `{{ ${replaceAndCapitalizeDotsSeparator(pageName)}Text }}`,
        `./@contents/views/${pagePrefix}.${pageName}/.html`,
        { basename: pageName, prefix: `${pagePrefix}.`, suffix: '.inner.embedded', extname: '.twig' }
    ).then(() => { return __parseTwig(
        `./@contents/_cache/${pagePrefix}.${pageName}.inner.embedded.twig`,
        './@contents/_cache',
        { data: parsedJsonData },
        { basename: pageName, prefix: `${pagePrefix}.`, suffix: '.inner.twigged', extname: '.html' }
    ); });
}

function _outerTwigify(pageName, pagePrefix) {
    const { twigFunctions } = require('../@contents/twigFunctions');
    const parsedJsonData = JSON.parse(fs.readFileSync(`@contents/views/commons.json`));
  
    return __embedTwig(
        './@contents/views/layout.app.twig',
        '{{ content }}',
        `./@contents/_cache/${pagePrefix}.${pageName}.inner.twigged.html`,
        { basename: pageName, prefix: `${pagePrefix}.`, suffix: '.outer.embedded', extname: '.twig' }
    ).then(() => { return __parseTwig(
        `./@contents/_cache/${pagePrefix}.${pageName}.outer.embedded.twig`,
        './@contents/@exported_html',
        { data: parsedJsonData, functions: [
            {
                name: "lang",
                func: function (lang) {
                    return {
                      'account.title': 'Bob Joe Sandman',
                      'signin.logout': '#',
                      'neworder.message.success': 'Selesai kemaskini!',
                      'neworder.id': 'ID',
                      'neworder.service': 'Servis',
                      'neworder.link': 'Link',
                      'neworder.quantity': 'Kuantiti',
                      'neworder.charge': 'Bayaran',
                      'neworder.balance': 'Baki',
          
                      'neworder.category': 'Category',
                    }[lang];
                }
            },
            {
                name: "page_url",
                func: function (pageUrl) {
                    return {
                      'index': '#',
                      'account': './page.account.html',
                      'logout': './page.logout.html'
                    }[pageUrl];
                }
            },
        ] },
        { basename: pageName, extname: '.html' }
    ); });
}