var gulp = require("gulp");
var mjml = require("gulp-mjml");

gulp.task("compile-templates", function() {
    gulp.src("./templates/mjml/*.mjml")
        .pipe(mjml())
        .pipe(gulp.dest("./templates/html"));
});
