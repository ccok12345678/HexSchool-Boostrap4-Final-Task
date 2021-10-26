const gulp = require('gulp');

gulp.task('copyHTML', function() {
  return gulp.src('source/**/*.html')
    .pipe(gulp.dest('public/'));
})