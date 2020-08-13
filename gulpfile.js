var gulp = require('gulp');
var eslint = require('gulp-eslint');

var jsFiles = [
  'js/**/*.js',
  'plugins/**/*.js',
  'test/**/*.js',
  '*.js'
];

gulp.task('eslint', function() {
  var stream = gulp.src(jsFiles)
    .pipe(eslint())
    .pipe(eslint.format())
    .pipe(eslint.failAfterError());

  return stream;
});

gulp.task('eslint-watch', ['eslint'], function(cb){
  console.log('Watching files for changes...');
  gulp.watch(jsFiles, ['eslint']);
});

gulp.task('default', ['eslint']);
