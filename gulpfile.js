const gulp = require('gulp');
const pathbuild = require('path');
const sequence = require('run-sequence');
const browserSync = require('browser-sync').create();
const sass = require('gulp-sass');
const sourcemaps = require('gulp-sourcemaps');
const autoprefixer = require('gulp-autoprefixer');
const imagemin = require('gulp-imagemin');
const concat = require('gulp-concat');
const jshint = require('gulp-jshint');
const uglify = require('gulp-uglify-es').default;
const rev = require('gulp-rev');
const delOrg = require('gulp-rev-delete-original');
const del = require('del');
const revReplace = require('gulp-rev-replace');
const htmlmin = require('gulp-htmlmin');
const pump = require('pump');

// Configurations 
// ----------------------------------------------------------------------

const config = {
	path: {
		source: 'src',
		target: 'dist',
		srcStyles: 'sass',
		distStyles: 'css',
		images: 'imgs',
		scripts: 'js',
		maps: 'maps',
		revisions: 'rev'
	},
	autoprefixer: {
		browsers: ['last 4 versions']
	},
	sassOutput: {
		outputStyle: 'expanded'
		// Options: nested, expanded, compact, compressed
		// Use compressed as default
	},
	images: {
		gifsicle: { interlaced: true },
		jpegtran: { progressive: true },
		optipng: { optimizationLevel: 5 },
		svgo: {
			plugins: [{ removeViewBox: true }, { cleanupIDs: false }]
    	}
	},
	htmlmin: {
		collapseWhitespace: true
	}
};


// Paths
// ---------------------------------------------------------------------- 

const srcSassFiles = pathbuild.join(config.path.source, config.path.srcStyles, '**', '*.scss'),
	    srcJsFiles = pathbuild.join(config.path.source, config.path.scripts, '*.js'),
      srcJsPlugins = pathbuild.join(config.path.source, config.path.scripts, 'plugins.js'),
      srcJsMain = pathbuild.join(config.path.source, config.path.scripts, 'main.js'),
      srcImages = pathbuild.join(config.path.source, config.path.images, '*'),
      srcHtml = pathbuild.join(config.path.source, '**', '*.html'),
      distCssFolder = pathbuild.join(config.path.target, config.path.distStyles),
      distCssFiles = pathbuild.join(config.path.target, config.path.distStyles, '*.css'),
      distJsFolder = pathbuild.join(config.path.target, config.path.scripts),
      distJsFiles = pathbuild.join(config.path.target, config.path.scripts, '*.js'),
      distImagesFolder = pathbuild.join(config.path.target, config.path.images),
      distImages = pathbuild.join(config.path.target, config.path.images, '*'),
      distHtml = pathbuild.join(config.path.target, '**', '*.html'),
      jsMapFiles = pathbuild.join(distJsFolder, config.path.maps, '*'),
      cssMapFiles = pathbuild.join(distCssFolder, config.path.maps, '*'),
      manifestBase = pathbuild.join(config.path.source, config.path.revisions),
      manifestPath = pathbuild.join(config.path.source, config.path.revisions, 'rev-manifest.json');


// Styles 
// ---------------------------------------------------------------------- 

gulp.task('css', function() {
	return gulp
		.src(srcSassFiles)
		.pipe(sourcemaps.init())
		.pipe(sass(config.sassOutput).on('error', sass.logError))
		.pipe(autoprefixer(config.autoprefixer))
        .pipe(sourcemaps.write('./maps'))
		.pipe(gulp.dest(distCssFolder))
		.pipe(browserSync.stream())
});

gulp.task('css-rev', function() {
	return gulp
		.src(srcSassFiles)
		.pipe(sourcemaps.init())
		.pipe(sass(config.sassOutput).on('error', sass.logError))
		.pipe(autoprefixer(config.autoprefixer))
		.pipe(rev())
        .pipe(sourcemaps.write('./maps'))
        .pipe(delOrg())
		.pipe(gulp.dest(distCssFolder))
		.pipe(rev.manifest({ path: manifestPath, base: manifestBase, merge: true }))
		.pipe(gulp.dest(manifestBase))
});


// Scripts
// ----------------------------------------------------------------------

gulp.task('scripts', function () {
  return gulp
    .src( [srcJsFiles, srcJsPlugins, srcJsMain] )
		.pipe(sourcemaps.init())
		.pipe(jshint())
		.pipe(jshint.reporter('default'))
		.pipe(concat('scripts.js'))
		.pipe(uglify())
		.pipe(sourcemaps.write('./maps'))
		.pipe(gulp.dest(distJsFolder))

/*
	pump([
		gulp.src( [srcJsPlugins, srcJsMain, srcJsFiles] ),
		sourcemaps.init(),
		jshint(),
		jshint.reporter('default'),
		concat('scripts.js'),
		uglify(),
		sourcemaps.write('./maps'),
		gulp.dest(distJsFolder)
    ]);
*/
});

gulp.task('scripts-rev', function () {
  return gulp
    .src( [srcJsPlugins, srcJsMain, srcJsFiles] )
		.pipe(sourcemaps.init())
		.pipe(concat('scripts.js'))
		.pipe(uglify())
		.pipe(rev())
		.pipe(sourcemaps.write('./maps'))
		.pipe(delOrg())
		.pipe(gulp.dest(distJsFolder))
		.pipe(rev.manifest({ path: manifestPath, base: manifestBase, merge: true }))
		.pipe(gulp.dest(manifestBase))
/*
	pump([
		gulp.src( [srcJsPlugins, srcJsMain, srcJsFiles] ),
		sourcemaps.init(),
		concat('scripts.js'),
		uglify(),
		rev(),
		sourcemaps.write('./maps'),
		delOrg(),
		gulp.dest(distJsFolder),
		rev.manifest({ path: manifestPath, base: manifestBase, merge: true }),
		gulp.dest(manifestBase)
    ]);
*/
});


// HTML Minify
// ----------------------------------------------------------------------

gulp.task('html', function(cb) {
	pump([
		gulp.src(distHtml),
		htmlmin(config.htmlmin),
		gulp.dest(config.path.target)
		],
		cb
    )
});

// Images 
// ----------------------------------------------------------------------

const imageminConfig = [
	imagemin.gifsicle(config.images.gifsicle),
	imagemin.jpegtran(config.images.jpegtran),
	imagemin.optipng(config.images.optipng),
	imagemin.svgo(config.images.svgo)
];

gulp.task('images', function() {
	return gulp
		.src(srcImages)
		.pipe(imagemin(imageminConfig))
		.pipe(gulp.dest(distImagesFolder))
});

gulp.task('images-rev', function() {
	return gulp
		.src(srcImages)
		.pipe(imagemin(imageminConfig))
		.pipe(rev())
		.pipe(gulp.dest(distImagesFolder))
		.pipe(rev.manifest({ path: manifestPath, base: manifestBase, merge: true }))
		.pipe(gulp.dest(manifestBase))
});


// Revision Replace 
// ----------------------------------------------------------------------

gulp.task('revreplace', function() {
	const manifest = gulp.src(manifestPath);
	return gulp
		.src('dist/**/*.+(html|xml|css|map)')
		.pipe(revReplace({ 
			manifest: manifest,
			replaceInExtensions: ['.html', '.xml', '.css', '.map']
			})
		)
		.pipe(gulp.dest(config.path.target))
});



// Clean Files
// ----------------------------------------------------------------------
gulp.task('clean', function() {
	del([ distJsFiles, distCssFiles, distImages, jsMapFiles, cssMapFiles, manifestPath ])
});

// Copy Files
// ----------------------------------------------------------------------

gulp.task('copy', function() {
	return gulp
		.src(srcHtml)
		.pipe(gulp.dest(config.path.target))
		.pipe(browserSync.stream())
});

gulp.task('copyinit', function() {
	return gulp
		.src(['src/**/*.+(html|js|png|ico|jpg|gif|txt|xml|webmanifest)', '!src/js/*.js', '!src/imgs/*'  ])
		.pipe(gulp.dest(config.path.target))
});


// Browser Sync
// ----------------------------------------------------------------------

gulp.task('browserSync', function() {
	browserSync.init({
		server: { baseDir: config.path.target },
	})
});


// Watch 
// ----------------------------------------------------------------------

gulp.task('watch', ['browserSync', 'css', 'scripts'], function(){
	gulp.watch(srcSassFiles, ['css']);
	gulp.watch(srcJsFiles, ['scripts']);
	gulp.watch([ srcHtml, srcImages], ['copy']);
});


// Build 
// ----------------------------------------------------------------------

gulp.task('build', function(cb) {
	sequence('clean', 'images-rev', 'copyinit', 'css-rev', 'scripts-rev', 'revreplace', 'html', cb)
})


// Default ----------------------------------------------------------------------

gulp.task('default', ['clean', 'images', 'copyinit', 'watch']);






