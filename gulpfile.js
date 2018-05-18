var gulp = require('gulp');

// gulp plugins and utils
var gutil = require('gulp-util');
var livereload = require('gulp-livereload');
var postcss = require('gulp-postcss');
var sourcemaps = require('gulp-sourcemaps');
var zip = require('gulp-zip');
var sass = require('gulp-sass');
var gscan = require("gscan");
var chalk = require('chalk');

// postcss plugins
var autoprefixer = require('autoprefixer');
var colorFunction = require('postcss-color-function');
var cssnano = require('cssnano');
var customProperties = require('postcss-custom-properties');
var easyimport = require('postcss-easy-import');

var pkg = require('./package.json');

var targetDir = 'dist/';
var themeName = pkg.name;
var filename = themeName + '.zip';
var zipPath = targetDir + filename;

var levels = {
    error: chalk.red,
    warning: chalk.yellow,
    recommendation: chalk.yellow,
    feature: chalk.green
};

var paths = {
    scss: './assets/stylesheets/**/*.scss',
    css: './assets/css/',
    js: './assets/javascripts/**/*.js',
};

var swallowError = function swallowError(error) {
    gutil.log(error.toString());
    gutil.beep();
    this.emit('end');
};

var nodemonServerInit = function () {
    livereload.listen(1234);
};

gulp.task('build', ['css'], function (/* cb */) {
    return nodemonServerInit();
});

gulp.task('sass', function () {
  return gulp.src(paths.scss)
    .pipe(sass({ sourcemaps: true })
    .on('error', sass.logError))
    .pipe(gulp.dest(paths.css))
});

gulp.task('css', ['sass'], function () {
    var processors = [
        easyimport,
        customProperties,
        colorFunction(),
        autoprefixer({browsers: ['last 2 versions']}),
        cssnano()
    ];

    return gulp.src(paths.css + '*.css')
        .on('error', swallowError)
        .pipe(sourcemaps.init())
        .pipe(postcss(processors))
        .pipe(sourcemaps.write('.'))
        .pipe(gulp.dest('assets/built/'))
        .pipe(livereload());
});

gulp.task('watch', function () {
    gulp.watch(paths.css + '**', ['css']);
});

gulp.task('zip', ['css'], function () {
    return gulp.src([
        '**',
        '!node_modules', '!node_modules/**',
        '!dist', '!dist/**'
    ])
        .pipe(zip(filename))
        .pipe(gulp.dest(targetDir));
});

gulp.task('default', ['build'], function () {
    gulp.start('watch');
});

gulp.task('deploy', ['zip'], function () {
    // based on: https://github.com/thoughtbot/ghost-theme-template/blob/e651bc70b65dae345e79e49122e59be7b93e7ad6/gulpfile.babel.js#L59

    function outputResult(result) {
        console.log('-', levels[result.level](result.level), result.rule);
    }

    function outputResults(theme) {
        theme = gscan.format(theme);

        console.log(chalk.bold.underline('\nRule Report:'));

        if (theme.results.error && theme.results.error.length) {
            console.log(chalk.red.bold.underline('\n! Must fix:'));
            theme.results.error.forEach(outputResult);
        }

        if (theme.results.warning && theme.results.warning.length) {
            console.log(chalk.yellow.bold.underline('\n! Should fix:'));
            theme.results.warning.forEach(outputResult);
        }

        if (theme.results.recommendation && theme.results.recommendation.length) {
            console.log(chalk.red.yellow.underline('\n? Consider fixing:'));
            theme.results.recommendation.forEach(outputResult);
        }

        if (theme.results.pass && theme.results.pass.length) {
            console.log(chalk.green.bold.underline('\n\u2713', theme.results.pass.length, 'Passed Rules'));
        }

        console.log('\n...checks complete.');
    }

    gscan.checkZip({
        path: zipPath,
        name: pkg.name
    }).then(outputResults);
});
