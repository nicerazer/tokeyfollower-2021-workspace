"use strict";

var log = require('fancy-log');
const gulp = require('gulp');

const Fiber        = require('fibers'),
      sass         = require('gulp-sass'),
      cleanCss     = require('gulp-clean-css'),
      minifyJs     = require('gulp-babel-minify'),
      autoprefixer = require('gulp-autoprefixer'),
      twig         = require('gulp-twig'),
      rename       = require('gulp-rename'),
      bootlint     = require('gulp-bootlint'),
      concat       = require('gulp-concat'),
      cleanFiles   = require('gulp-clean'),
      replace      = require('gulp-replace'),
      prettyHtml   = require('gulp-pretty-html'),
      browserSync  = require('browser-sync').create(),
      fs           = require('fs');

      sass.compiler = require('sass');

function _replaceAndCapitalizeDotsSeparator(str) {
  return str
    .toLowerCase()
    .split('.')
    .map((substr, i) => i === 0 ? substr : substr.charAt(0).toUpperCase() + substr.substring(1) )
    .join('');
}

function _discoverPages() {
  let directoryStructure = fs.readdirSync('./@contents/views');

  // Categorize first, process afterwards
  let discoveredPages = directoryStructure
    .filter(item => item.includes('page'))
    .map((item) => {
      let extractedPageName = item.replace(/page\.public\.|page\.auth\.|page\./, '');
      let extractedPagePrefix = 'undefined';
      if(item.includes("public")) {
        extractedPagePrefix = 'page.public';
      } else if (item.includes("auth")) {
        extractedPagePrefix = 'page.auth';
      } else {
        extractedPagePrefix = 'page';
      }
      return {name:extractedPageName, prefix: extractedPagePrefix};
    });

  let discoveredPageNames = discoveredPages.map(item => item.name);

  log('Discovered', '\x1b[32m', discoveredPageNames);

  return new Promise((resolve) => {
    resolve(discoveredPages);
  });
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
  gulp.src(sourceTwigPath)
    .pipe(replace(replaceTargetText, parsedJsonPageHtml))
    .pipe(rename(renameDetailsObject))
    .pipe(gulp.dest('./@contents/_cache'))
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
    gulp.src(sourceTwigPath)
    .pipe(twig(twigDetailsObject))
    .pipe(prettyHtml())
    .pipe(rename(renameDetailsObject))
    .pipe(gulp.dest(destinationPath))
    .on('finish', () => { resolve(); })
    .on('error', () => { reject(); });
  });
}

/** Page prefix seperated by comma */
async function _innerTwigify(pageName, pagePrefix) {
  // const placeholderName = await (async () => { return new Promise(resolve => {
  //   try {
  //     resolve(`{{ fs.readFileSync(./@contents/views/${pagePrefix}.${pageName}/.placeholder).toString() }}`)
  //   } catch(error) {
  //     resolve(`{{ ${_replaceAndCapitalizeDotsSeparator(pageName)}Text }}`)
  //   }
  // })})()
  const parsedJsonData = JSON.parse(fs.readFileSync(`./@contents/views/${pagePrefix}.${pageName}/.json`));
  return __embedTwig(
    `./@contents/views/${pagePrefix}.${pageName}/.twig`,
    // placeholderName,
    `{{ ${_replaceAndCapitalizeDotsSeparator(pageName)}Text }}`,
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

async function compileAllPages(cb) {
  browserSync.notify("Compiling, please wait!", 3000);
  try {
    await _discoverPages().then(async pages => {
      for (const page of pages) {
        log(`Compiling Inner Twig: \x1b[33m${page.name}`);
        await _innerTwigify(page.name, page.prefix)
        .then(() => {
          log(`Compiling Outer Twig: \x1b[33m${page.name}`);
          return _outerTwigify(page.name, page.prefix);
        });
      }
    });
    log(`\x1b[33mCompilation completed`);
    cb();
  } catch (error) {
    cb(error);
  }
}

function compileCss() {
  return gulp.src('./@contents/sass/app.scss')
    .pipe(sass({fiber:Fiber}).on('error', sass.logError))
    .pipe(autoprefixer())
    .pipe(cleanCss())
    .pipe(rename({ basename: 'app', extname: '.min.css' }))
    .pipe(gulp.dest('./@contents/@exported_css'))
    .pipe(browserSync.stream());
}

function compileJs() {
  return gulp.src('./@contents/js/app.js')
    .pipe(minifyJs())
    .pipe(rename({ basename: 'app', extname: '.min.js' }))
    .pipe(gulp.dest('./@contents/@exported_js'));
}

function fetchVendorAndCompileJs() {
  // return gulp.src([
  //   './node_modules/bootstrap/dist/js/bootstrap.bundle.min.js',
  //   './node_modules/jquery/dist/jquery.min.js',
  //   './@contents/js/app.js',
  // ])
  return gulp.src('./node_modules/bootstrap/dist/js/bootstrap.bundle.min.js')
  .pipe(concat('app.min.js'))
  // .pipe(minifyJs())
  // .pipe(rename({ basename: 'app', extname: '.min.js' }))
  .pipe(gulp.dest('./@contents/@exported_js'));
}

// function verifyMarkup() {
//   return gulp.src('./@contents/@exported_html/*')
//     .pipe(bootlint());
// }

function cleanCache(dirs) {
  log('\x1b[44mCleaning cache...\x1b[0m');
  return gulp.src(dirs, {read: false})
  .pipe(cleanFiles());
}

exports.discoverPages = _discoverPages;

exports.default = () => {
  cleanCache([
    './@contents/_cache/*',
    './@contents/@exported_html/*',
    './@contents/@exported_css/*',
    './@contents/@exported_js/*'
  ]);

  // Main tasks + watch
  gulp.watch('./@contents/views', { ignoreInitial: false },
    // gulp.series(() => { return cleanCache(['./@contents/_cache/*','./@contents/@exported_html/*']) }, compileAllPages, verifyMarkup)
    gulp.series(() => { return cleanCache(['./@contents/_cache/*','./@contents/@exported_html/*']) }, compileAllPages)
  );
  gulp.watch('./@contents/js', { ignoreInitial: false }, gulp.series(() => { return cleanCache('./@contents/@exported_js/*.js') }, fetchVendorAndCompileJs));
  gulp.watch('./@contents/sass', { ignoreInitial: false }, gulp.series(() => { return cleanCache('./@contents/@exported_css/*.css') }, compileCss));

  // Full Reload
  browserSync.watch(['./@contents/@exported_html/*.html', './@contents/@exported_js/*.js']).on('change', browserSync.reload);

  browserSync.init({
    server: {
      baseDir : ["./@contents/@exported_html", "./@contents/@exported_css", "./@contents/@exported_js", "./@contents/img"],
    },
    directory: true,
    open: true
  });
}
