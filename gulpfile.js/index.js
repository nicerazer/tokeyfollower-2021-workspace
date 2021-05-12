"use strict"

let 

// === Gulps ===
{ src, dest, series, parallel, watch } = require('gulp'),
uglifyJs        = require('gulp-uglify'),
rename          = require('gulp-rename'),
sass            = require('gulp-sass'),
cleanCss        = require('gulp-clean-css'),
autoprefixer    = require('gulp-autoprefixer'),

// === Locals ===
{ twigify }                 = require('./_twigify.js'),
{ clean, discoverPages }    = require('./_helpers.js'),

// === Utilities ===
yargs           = require('yargs/yargs'),
{ hideBin }     = require('yargs/helpers'),
Fiber           = require('fibers'),
argv            = yargs(hideBin(process.argv)).argv,
log             = require('fancy-log'),
browserSync     = require('browser-sync').create()

sass.compiler   = require('sass')



// === The Gulpables ===
exports.default         = main
exports.build           = build
exports.vendor          = vendor
exports.discoverPages   = discoverPages
exports.monitor         = monitor



function monitor() {
    // watch('@contents/views/**/*.twig', series(explode))

    watch('@contents/views/**/*.twig', { ignoreInitial: false },
        series(() => { 
            return clean(['@contents/_cache/*','@contents/@exported_html/*'])
        }, twigify, lintMarkup)
    )
}


function explode(cb) {
    console.log('explosion')
    cb()
}


function main() {
    // Main tasks + watch
    watch('@contents/views/**/*.twig', { ignoreInitial: false },
        series(() => { 
            return clean(['@contents/_cache/*','@contents/@exported_html/*'])
        }, twigify, lintMarkup)
    )

    watch('@contents/js', { ignoreInitial: false }, series(() => { return clean('@contents/@exported_js/*.js') }, vendor ,js));
    watch('@contents/sass', { ignoreInitial: false }, series(() => { return clean('@contents/@exported_css/*.css') }, css));

    // Full Reload
    browserSync.watch(['@contents/@exported_html/*.html', '@contents/@exported_js/*.js']).on('change', browserSync.reload);

    browserSync.init({
        server: {
            baseDir : ["@contents/@exported_html", "@contents/@exported_css", "@contents/@exported_js", "@contents/img"],
        },
        directory: true,
        open: true
    });
}

function build(cb) {
    parallel(css, js)
    cb()
}

function js() {
    return src([
        '@contents/_cache/vendor.js',
        '@contents/js/app.js',
    ])
    .pipe(uglifyJs())
    .pipe(rename({ basename: 'app', extname: '.min.js' }))
    .pipe(dest('@contents/@exported_js'))
    // .pipe(browserSync.reload())
}

function css() {
    return src('@contents/sass/app.scss')
    .pipe(sass({fiber: Fiber}).on('error', sass.logError))
    .pipe(autoprefixer())
    .pipe(cleanCss())
    .pipe(rename({ basename: 'app', extname: '.min.css' }))
    .pipe(dest('@contents/@exported_css'))
    .pipe(browserSync.stream())
}

function vendor() {

    const mainVendors = [
        './node_modules/bootstrap/dist/js/bootstrap.min.js',
    ]

    const ghostVendors = [
        './node_modules/bootstrap/dist/js/jquery.min.js',
    ]

    let vendorListing = (argv.mode === 'prod' || argv.mode === 'production') ? mainVendors.concat(ghostVendors) : mainVendors

    return src(vendorListing)
    .pipe(uglifyJs())
    .pipe(rename('vendor.js'))
    .pipe(dest('@contents/_cache'))
}

function lintMarkup() {
    return gulp.src('@contents/@exported_html/*')
        .pipe(bootlint());
}