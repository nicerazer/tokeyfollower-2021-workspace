"use strict";

var log = require('fancy-log');
const gulp = require('gulp');

const less         = require('gulp-less'),
      cleanCss     = require('gulp-clean-css'),
      minifyJs     = require('gulp-babel-minify'),
      autoprefixer = require('gulp-autoprefixer'),
      twig         = require('gulp-twig'),
      frep         = require('gulp-frep'),
      rename       = require('gulp-rename'),
      bootlint     = require('gulp-bootlint'),
      cleanFiles   = require('gulp-clean'),
      htmlToJson   = require('gulp-html-to-json'),
      browserSync  = require('browser-sync').create(),
      fs           = require('fs');

function _discoverPages() {
  var directoryStructure = fs.readdirSync('./@contents/views');
  var filteredDirectoryStructures =
    directoryStructure.filter((item) => item.includes('page'))
                      .map((item) => item.replace('page.', ''));
  log('Discovered', '\x1b[32m', filteredDirectoryStructures);
  return filteredDirectoryStructures;
}

function _cacheHtmlToJson() {
  var pageName = 'sample';
  // Cache tpl file
  fs.writeFileSync(`./@contents/_cache/page.${pageName}.tpl`, `//=${pageName}Text : ../views/page.${pageName}/.html`);

  return new Promise((resolve, reject) => {
    gulp.src(`./@contents/_cache/page.${pageName}.tpl`)
    .pipe(htmlToJson())
    .pipe(rename({ basename: pageName, prefix: 'page.' , extname: '.json' }))
    .pipe(gulp.dest('./@contents/_cache'))
    .on('finish', () => { resolve(); })
    .on('error', () => { reject(); });
  });
}

function _cacheTwigWrapping(pageName) {
  // Wrap .twig from the specific page folder into the @pageContent in the 'wrapper'
  return new Promise((resolve, reject) => {
    gulp.src('./@contents/views/wrapper.twig')
    .pipe(frep([{
      pattern: /@pageContent/, replacement: fs.readFileSync(`./@contents/views/page.${pageName}/.twig`)
    }]))
    .pipe(rename({ basename: pageName, prefix: 'page.' , extname: '.wrapped.twig' }))
    .pipe(gulp.dest('./@contents/_cache'))
    .on('finish', () => { resolve(); })
    .on('error', () => { reject(); });
  });
}

function _compileTwig(pageName) {
  const parsedJsonAppLayout = JSON.parse(fs.readFileSync(`./@contents/views/commons.json`));
  const parsedJsonPageHtml = JSON.parse(fs.readFileSync(`./@contents/_cache/page.${pageName}.json`));
  const parsedJsonPageData = JSON.parse(fs.readFileSync(`./@contents/views/page.${pageName}/.json`));

  const mergedJson = Object.assign(parsedJsonAppLayout, parsedJsonPageHtml, parsedJsonPageData);
  return new Promise((resolve, reject) => {
    gulp.src(`./@contents/_cache/page.${pageName}.wrapped.twig`)
    .pipe(twig({ data: mergedJson }))
    .pipe(rename({ basename: pageName, extname: '.html' }))
    .pipe(gulp.dest('./@contents/@exported_html'))
    .on('finish', () => { resolve(); })
    .on('error', () => { reject(); });
  });
}

async function compileAllPages(cb) {
  browserSync.notify("Compiling, please wait!", 3000);
  let pageNames = _discoverPages();
  for (const pageName of pageNames) {
    log(`Cache - Wrapping: \x1b[33m${pageName}`);
    await _cacheTwigWrapping(pageName)
    .then(() => {
      log(`Cache - Html to Json: \x1b[33m${pageName}`);
      return _cacheHtmlToJson(pageName);
    })
    .then(() => {
      log(`Compiling: \x1b[33m${pageName}`);
      _compileTwig(pageName);
    })
  }
  log(`\x1b[33mCompilation completed`);
  cb();
}

function compileCss() {
  return gulp.src('./@contents/less/app.less')
    .pipe(less())
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

function fetchVendorJs() {
  return gulp.src([
    './node_modules/bootstrap/dist/js/bootstrap.min.js',
    './node_modules/jquery/dist/jquery.min.js'
  ]).pipe(gulp.dest('./@contents/@exported_js'));
}

function verifyMarkup() {
  return gulp.src('./@contents/@exported_html/*')
    .pipe(bootlint());
}

function cleanCache(dirs) {
  log('\x1b[44mCleaning cache...\x1b[0m');
  return gulp.src(dirs, {read: false})
  .pipe(cleanFiles());
}

exports.default = () => {
  cleanCache([
    './@contents/_cache/*',
    './@contents/@exported_html/*',
    './@contents/@exported_css/*',
    './@contents/@exported_js/*'
  ]);

  // Main tasks + watch
  gulp.watch('./@contents/views', { ignoreInitial: false },
    gulp.series(() => { return cleanCache(['./@contents/_cache/*','./@contents/@exported_html/*']) }, compileAllPages, verifyMarkup)
  );
  gulp.watch('./@contents/js', { ignoreInitial: false }, gulp.series(() => { return cleanCache('./@contents/@exported_js/*.js') }, compileJs, fetchVendorJs));
  gulp.watch('./@contents/less', { ignoreInitial: false }, gulp.series(() => { return cleanCache('./@contents/@exported_css/*.css') }, compileCss));

  // Full Reload
  browserSync.watch(['./@contents/@exported_html/*.html', './@contents/@exported_js/*.js']).on('change', browserSync.reload);

  browserSync.init({
    server: {
      baseDir : ["./@contents/@exported_html", "./@contents/@exported_css", "./@contents/@exported_js"],
    },
    directory: true,
    open: false
  });
}
