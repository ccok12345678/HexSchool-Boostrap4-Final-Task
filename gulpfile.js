const gulp = require('gulp');
const $ = require('gulp-load-plugins')();
const sass = require('gulp-sass')(require('node-sass'));
const autoprefixer = require('autoprefixer');
const path = require('path');
const del = require('del');
const browserSync = require('browser-sync');
const minimist = require('minimist');

// 設定環境
const envOpts = {
  string: 'env',
  default: { env: 'develop' }   // 預設環境為develop
};
const opts = minimist(process.argv.slice(2), envOpts);
console.log(opts);

// delete the 'public' directory
function clean() {
  return del([
    './public'
  ])
}

exports.clean = clean;

// Pug
function buildTemplate() {
  return gulp.src('./src/**/*.pug')
    .pipe($.pug({
      pretty: true,
    }))
    .pipe(gulp.dest('./public/'))
    .pipe(browserSync.stream());    // 更新後重新整理頁面
}

exports.pug = buildTemplate;

// in gulp 4's way
// Sass
function buildStyles() {
  const plugins = [
    autoprefixer(),
  ];

  return gulp.src('./src/stylesheets/**/*.scss')
    .pipe($.sourcemaps.init())
    .pipe(sass({
      outputStyle: 'nested',
      includePaths: ['./node_modules/bootstrap/scss']
    }).on('error', sass.logError))
    .pipe($.postcss(plugins))
    .pipe($.if(opts.env === 'production', $.cleanCss()))  // 在production環境下壓縮css
    .pipe($.sourcemaps.write('.'))
    .pipe(gulp.dest('./public/stylesheets'))
    .pipe(browserSync.stream());
};

exports.sass = buildStyles;

// babel
function buildScript() {
  return gulp.src('./src/js/**/*.js')
    .pipe($.sourcemaps.init()) // 標記程式碼來源
    .pipe($.babel({
      presets: ['@babel/env']  // 編譯版本
    }))
    .pipe($.concat('all.js'))  // 合併js檔案
    .pipe($.if(opts.env === 'production', $.uglify({
      compress: {
        drop_console: true,    // remove console. default: false
      }
    })))          // 在production環境下壓縮js程式碼    
    .pipe($.sourcemaps.write('.'))
    .pipe(gulp.dest('./public/js'))
    .pipe(browserSync.stream());
}
exports.babel = buildScript;

// vendor js  導入外部套件
function vendorJS() {
  return gulp.src([
    './node_modules/jquery/dist/jquery.min.js',   //jOuery
    './node_modules/bootstrap/dist/js/bootstrap.bundle.min.js'  // Bootstrap
  ])
    .pipe($.order([
      'jquery.min.js',   // jQuery before Bootstrap
      'bootstrap.bundle.min.js'
    ]))
    .pipe($.concat('vendor.js'))
    .pipe($.if(opts.env === 'production', $.uglify()))
    .pipe(gulp.dest('./public/js'));
}

exports.vendorjs = vendorJS;

// compress imgs
function imageMin() {
  return gulp.src('./src/images/*')
    .pipe($.if((opts.env === 'production'), $.imagemin()))
    .pipe(gulp.dest('./public/images'));
}

exports.imagemin = imageMin;

// browerSync
function browser_sync() {
  browserSync.init({
    server: {
      baseDir: "./public"  // 開啟的檔案位置
    },
    reloadDebounce: 2000   // 調整重新整理的時間間隔
  });
}

exports.browser = browser_sync;

// watch
exports.watch = function () {
  gulp.watch('./src/stylesheets/**/*.scss', buildStyles)
    // 同步刪除
    .on('unlink', (evt) => del(`./public/stylesheets/**/${path.basename(evt, '.scss')}.css`));
  gulp.watch('./src/**/*.pug', buildTemplate)
    .on('unlink', (evt) => del(`./public/**/${path.basename(evt, '.pug')}.html`));
  gulp.watch('./src/js/**/*.js', buildScript)
    .on('unlink', (evt) => del(`./public/js/**/${path.basename(evt)}`));

  // browserSync
  browser_sync();
};

// deploy on github page
function deploy() {
  return gulp.src('./public/**/*')
    .pipe($.ghPages());
}

exports.deploy = deploy;

// build
// excute in sequential order
exports.build = gulp.series(
  clean,
  buildTemplate,
  buildStyles,
  buildScript,
  vendorJS,
  imageMin
);

// default
exports.default = gulp.series(
  buildTemplate,
  buildStyles,
  buildScript,
  vendorJS,
  imageMin,
  this.watch
);